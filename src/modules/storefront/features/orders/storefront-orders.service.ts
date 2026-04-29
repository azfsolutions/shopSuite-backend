import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateStorefrontOrderDto } from './dto/create-storefront-order.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { CustomerTiersService } from '../../../customer-tiers/customer-tiers.service';

@Injectable()
export class StorefrontOrdersService {
    private readonly logger = new Logger(StorefrontOrdersService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly customerTiers: CustomerTiersService,
    ) {}

    async createOrder(
        storeId: string,
        dto: CreateStorefrontOrderDto,
        userId?: string,
    ) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                // ── Step 1: Validate store is ACTIVE ─────────────────────────
                const store = await tx.store.findUnique({
                    where: { id: storeId },
                    select: { id: true, status: true, name: true },
                });
                if (!store || store.status !== 'ACTIVE') {
                    throw new NotFoundException('Tienda no encontrada o inactiva');
                }

                // ── Step 2: Validate shipping method ────────────────────────
                const shippingMethod = await tx.shippingMethod.findFirst({
                    where: {
                        id: dto.shippingMethodId,
                        storeId,
                        isActive: true,
                    },
                });
                if (!shippingMethod) {
                    throw new BadRequestException('Método de envío no válido');
                }

                // ── Step 3 & 4: Validate products and stock ─────────────────
                const productIds = dto.items.map((i) => i.productId);
                const products = await tx.product.findMany({
                    where: {
                        id: { in: productIds },
                        storeId,
                        status: 'ACTIVE',
                        deletedAt: null,
                    },
                    include: {
                        variants: true,
                        images: { take: 1, select: { url: true } },
                    },
                });

                if (products.length !== productIds.length) {
                    throw new BadRequestException(
                        'Uno o más productos no están disponibles en esta tienda',
                    );
                }

                const productMap = new Map(products.map((p) => [p.id, p]));

                const vipReservations = await tx.stockReservation.groupBy({
                    by: ['productId'],
                    where: {
                        productId: { in: productIds },
                        storeId,
                        releasedAt: null,
                        expiresAt: { gt: new Date() },
                    },
                    _sum: { quantity: true },
                });
                const reservedMap = new Map(
                    vipReservations.map((r) => [r.productId, r._sum.quantity ?? 0]),
                );

                for (const item of dto.items) {
                    const product = productMap.get(item.productId)!;

                    if (item.variantId) {
                        const variant = product.variants.find(
                            (v) => v.id === item.variantId && v.isActive,
                        );
                        if (!variant) {
                            throw new BadRequestException(
                                `Variante no encontrada para el producto "${product.name}"`,
                            );
                        }
                        if (variant.trackInventory && variant.stock < item.quantity) {
                            throw new BadRequestException(
                                `Stock insuficiente para "${product.name}" (variante: ${variant.name})`,
                            );
                        }
                    } else {
                        if (product.trackInventory) {
                            const reserved = reservedMap.get(item.productId) ?? 0;
                            const available = product.stock - reserved;
                            if (available < item.quantity) {
                                throw new BadRequestException(
                                    `Stock insuficiente para "${product.name}"`,
                                );
                            }
                        }
                    }
                }

                // ── Step 5: Validate coupon ─────────────────────────────────
                let coupon: Awaited<ReturnType<typeof tx.coupon.findFirst>> | null = null;
                if (dto.couponCode) {
                    coupon = await tx.coupon.findFirst({
                        where: {
                            code: dto.couponCode.toUpperCase(),
                            storeId,
                            isActive: true,
                            deletedAt: null,
                        },
                    });

                    if (!coupon) {
                        throw new BadRequestException('Cupón no válido o no pertenece a esta tienda');
                    }

                    const now = new Date();
                    if (coupon.startsAt && coupon.startsAt > now) {
                        throw new BadRequestException('El cupón aún no está vigente');
                    }
                    if (coupon.expiresAt && coupon.expiresAt < now) {
                        throw new BadRequestException('El cupón ha expirado');
                    }
                    if (
                        coupon.usageLimit !== null &&
                        coupon.usageCount >= coupon.usageLimit
                    ) {
                        throw new BadRequestException('El cupón ha alcanzado su límite de uso');
                    }
                }

                // ── Step 6: Calculate totals ─────────────────────────────────
                let subtotal = new Decimal(0);
                const orderItemsData: Array<{
                    productId: string;
                    variantId?: string;
                    name: string;
                    sku?: string | null;
                    variantName?: string | null;
                    imageUrl?: string | null;
                    quantity: number;
                    unitPrice: Decimal;
                    totalPrice: Decimal;
                }> = [];

                for (const item of dto.items) {
                    const product = productMap.get(item.productId)!;
                    let unitPrice = product.price;
                    let variantName: string | null = null;
                    let sku: string | null = product.sku ?? null;

                    if (item.variantId) {
                        const variant = product.variants.find((v) => v.id === item.variantId)!;
                        unitPrice = variant.price;
                        variantName = variant.name;
                        sku = variant.sku ?? sku;
                    }

                    const totalPrice = unitPrice.mul(item.quantity);
                    subtotal = subtotal.add(totalPrice);

                    orderItemsData.push({
                        productId: item.productId,
                        variantId: item.variantId,
                        name: product.name,
                        sku,
                        variantName,
                        imageUrl: product.images[0]?.url ?? null,
                        quantity: item.quantity,
                        unitPrice,
                        totalPrice,
                    });
                }

                // Discount calculation
                let discountTotal = new Decimal(0);
                let shippingTotal = new Decimal(shippingMethod.price);

                // Check free shipping from method
                if (
                    shippingMethod.freeAbove !== null &&
                    subtotal.gte(shippingMethod.freeAbove)
                ) {
                    shippingTotal = new Decimal(0);
                }

                if (coupon) {
                    if (coupon.type === 'PERCENTAGE') {
                        discountTotal = subtotal
                            .mul(coupon.value)
                            .div(100);
                        if (
                            coupon.maxDiscountAmount !== null &&
                            discountTotal.gt(coupon.maxDiscountAmount)
                        ) {
                            discountTotal = new Decimal(coupon.maxDiscountAmount);
                        }
                    } else if (coupon.type === 'FIXED_AMOUNT') {
                        discountTotal = Decimal.min(
                            new Decimal(coupon.value),
                            subtotal,
                        );
                    } else if (coupon.type === 'FREE_SHIPPING') {
                        shippingTotal = new Decimal(0);
                    }

                    // Ensure minPurchaseAmount
                    if (
                        coupon.minPurchaseAmount !== null &&
                        subtotal.lt(coupon.minPurchaseAmount)
                    ) {
                        throw new BadRequestException(
                            `El cupón requiere un monto mínimo de compra de ${coupon.minPurchaseAmount}`,
                        );
                    }
                }

                const total = subtotal
                    .sub(discountTotal)
                    .add(shippingTotal);

                // ── Step 7: Upsert Customer ──────────────────────────────────
                const customer = await tx.customer.upsert({
                    where: {
                        storeId_email: { storeId, email: dto.email.toLowerCase() },
                    },
                    update: userId ? { buyerUserId: userId } : {},
                    create: {
                        storeId,
                        email: dto.email.toLowerCase(),
                        firstName: dto.firstName,
                        lastName: dto.lastName,
                        phone: dto.phone,
                        buyerUserId: userId ?? null,
                    },
                });

                // ── Step 8: Upsert StoreCustomerProfile (auth'd buyers only) ─
                if (userId) {
                    await tx.storeCustomerProfile.upsert({
                        where: { buyerUserId_storeId: { buyerUserId: userId, storeId } },
                        update: {},
                        create: { buyerUserId: userId, storeId },
                    });
                }

                // ── Step 9: Generate orderNumber ─────────────────────────────
                const orderCount = await tx.order.count({ where: { storeId } });
                const year = new Date().getFullYear().toString().slice(-2);
                const seq = String(orderCount + 1).padStart(5, '0');
                const orderNumber = `ORD-${year}${seq}`;

                // ── Step 10: Create Order ────────────────────────────────────
                const order = await tx.order.create({
                    data: {
                        storeId,
                        customerId: customer.id,
                        orderNumber,
                        subtotal,
                        discountTotal,
                        shippingTotal,
                        taxTotal: new Decimal(0),
                        total,
                        customerEmail: dto.email.toLowerCase(),
                        customerFirstName: dto.firstName,
                        customerLastName: dto.lastName,
                        customerPhone: dto.phone,
                        shippingAddress: { ...dto.shippingAddress },
                        shippingMethodId: shippingMethod.id,
                        shippingMethodName: shippingMethod.name,
                        couponId: coupon?.id ?? null,
                        couponCode: coupon?.code ?? null,
                        customerNote: dto.customerNote,
                        paymentStatus: 'PENDING',
                        status: 'PENDING',
                        fulfillmentStatus: 'UNFULFILLED',
                        items: {
                            create: orderItemsData,
                        },
                    },
                });

                // ── Step 11: Decrement stock ─────────────────────────────────
                for (const item of dto.items) {
                    const product = productMap.get(item.productId)!;

                    if (item.variantId) {
                        const variant = product.variants.find((v) => v.id === item.variantId)!;
                        if (variant.trackInventory) {
                            await tx.productVariant.update({
                                where: { id: item.variantId },
                                data: { stock: { decrement: item.quantity } },
                            });
                        }
                    } else {
                        if (product.trackInventory) {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: {
                                    stock: { decrement: item.quantity },
                                    salesCount: { increment: item.quantity },
                                },
                            });
                        }
                    }
                }

                // ── Step 12: Update Customer stats ───────────────────────────
                await tx.customer.update({
                    where: { id: customer.id },
                    data: {
                        ordersCount: { increment: 1 },
                        totalSpent: { increment: total },
                        lastOrderAt: new Date(),
                    },
                });

                // ── Step 13: Update StoreCustomerProfile stats (auth'd only) ─
                if (userId) {
                    await tx.storeCustomerProfile.update({
                        where: { buyerUserId_storeId: { buyerUserId: userId, storeId } },
                        data: {
                            ordersCount: { increment: 1 },
                            totalSpent: { increment: total },
                            lastOrderAt: new Date(),
                        },
                    });
                }

                // ── Step 14: Atomically increment coupon usageCount ──────────
                // Use updateMany with a conditional WHERE so concurrent requests
                // cannot both pass the limit check and end up incrementing
                // beyond usageLimit (race condition C-T-4).
                if (coupon) {
                    const result = await tx.coupon.updateMany({
                        where: {
                            id: coupon.id,
                            OR: [
                                { usageLimit: null },
                                { usageCount: { lt: coupon.usageLimit ?? 0 } },
                            ],
                        },
                        data: { usageCount: { increment: 1 } },
                    });
                    if (result.count === 0) {
                        throw new BadRequestException('El cupón ha alcanzado su límite de uso');
                    }
                }

                return {
                    id: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    total: Number(order.total),
                    createdAt: order.createdAt,
                    customerId: customer.id,
                };
            });

            this.logger.log({
                event: 'ORDER_CREATED',
                orderNumber: result.orderNumber,
                storeId,
                userId: userId ?? 'guest',
                total: result.total,
            });

            this.customerTiers
                .evaluateAndPromote(storeId, result.customerId)
                .catch((err) =>
                    this.logger.error({
                        event: 'TIER_EVAL_FAILED',
                        storeId,
                        customerId: result.customerId,
                        error: err instanceof Error ? err.message : 'Unknown',
                    }),
                );

            const { customerId: _omit, ...response } = result;
            return response;
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof BadRequestException
            ) {
                throw error;
            }

            this.logger.error({
                event: 'ORDER_FAILED',
                storeId,
                email: dto.email,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            throw error;
        }
    }
}
