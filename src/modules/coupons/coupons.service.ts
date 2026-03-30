import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto, CouponType } from './dto/coupon.dto';

export interface CouponValidationResult {
    valid: boolean;
    coupon: {
        id: string;
        code: string;
        type: CouponType;
        value: number;
    };
    discount: number;
    message?: string;
}

@Injectable()
export class CouponsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(storeId: string, dto: CreateCouponDto) {
        // Verificar código único para la tienda
        const existing = await this.prisma.coupon.findFirst({
            where: { storeId, code: dto.code.toUpperCase(), deletedAt: null },
        });

        if (existing) {
            throw new ConflictException('Ya existe un cupón con este código');
        }

        return this.prisma.coupon.create({
            data: {
                storeId,
                code: dto.code.toUpperCase(),
                type: dto.type,
                value: dto.value,
                minPurchaseAmount: dto.minPurchaseAmount,
                maxDiscountAmount: dto.maxDiscountAmount,
                usageLimit: dto.usageLimit,
                usageLimitPerCustomer: dto.usageLimitPerCustomer,
                startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                isActive: dto.isActive ?? true,
            },
        });
    }

    async findAll(storeId: string, filters?: { isActive?: boolean; search?: string }) {
        const where: any = { storeId, deletedAt: null };

        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        if (filters?.search) {
            where.code = { contains: filters.search.toUpperCase(), mode: 'insensitive' };
        }

        const coupons = await this.prisma.coupon.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return coupons;
    }

    async findOne(storeId: string, id: string) {
        const coupon = await this.prisma.coupon.findFirst({
            where: { id, storeId, deletedAt: null },
        });

        if (!coupon) {
            throw new NotFoundException('Cupón no encontrado');
        }

        return coupon;
    }

    async findByCode(storeId: string, code: string) {
        return this.prisma.coupon.findFirst({
            where: { storeId, code: code.toUpperCase(), deletedAt: null },
        });
    }

    async update(storeId: string, id: string, dto: UpdateCouponDto) {
        await this.findOne(storeId, id);

        return this.prisma.coupon.update({
            where: { id },
            data: {
                type: dto.type,
                value: dto.value,
                minPurchaseAmount: dto.minPurchaseAmount,
                maxDiscountAmount: dto.maxDiscountAmount,
                usageLimit: dto.usageLimit,
                usageLimitPerCustomer: dto.usageLimitPerCustomer,
                startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
                isActive: dto.isActive,
            },
        });
    }

    async delete(storeId: string, id: string) {
        await this.findOne(storeId, id);

        return this.prisma.coupon.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async validate(storeId: string, dto: ValidateCouponDto): Promise<CouponValidationResult> {
        const coupon = await this.findByCode(storeId, dto.code);

        // 1. Verificar que existe
        if (!coupon) {
            throw new BadRequestException('Cupón no válido');
        }

        // 2. Verificar que está activo
        if (!coupon.isActive) {
            throw new BadRequestException('Cupón no está activo');
        }

        // 3. Verificar fecha de inicio
        if (coupon.startsAt && coupon.startsAt > new Date()) {
            throw new BadRequestException('Cupón aún no es válido');
        }

        // 4. Verificar fecha de expiración
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
            throw new BadRequestException('Cupón expirado');
        }

        // 5. Verificar límite de uso total
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            throw new BadRequestException('Cupón agotado');
        }

        // 6. Verificar monto mínimo de compra
        const minAmount = coupon.minPurchaseAmount ? Number(coupon.minPurchaseAmount) : 0;
        if (minAmount > 0 && dto.cartTotal < minAmount) {
            throw new BadRequestException(`Compra mínima requerida: $${minAmount.toFixed(2)}`);
        }

        // 7. Calcular descuento
        const discount = this.calculateDiscount(coupon, dto.cartTotal);

        return {
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                type: coupon.type as CouponType,
                value: Number(coupon.value),
            },
            discount,
            message: this.getDiscountMessage(coupon, discount),
        };
    }

    private calculateDiscount(coupon: any, cartTotal: number): number {
        const value = Number(coupon.value);

        switch (coupon.type) {
            case CouponType.PERCENTAGE:
                let percentDiscount = (cartTotal * value) / 100;
                // Aplicar límite máximo si existe
                if (coupon.maxDiscountAmount) {
                    percentDiscount = Math.min(percentDiscount, Number(coupon.maxDiscountAmount));
                }
                return Math.round(percentDiscount * 100) / 100;

            case CouponType.FIXED_AMOUNT:
                // No puede ser mayor que el total del carrito
                return Math.min(value, cartTotal);

            case CouponType.FREE_SHIPPING:
                // Retorna 0, el descuento se aplica al envío
                return 0;

            default:
                return 0;
        }
    }

    private getDiscountMessage(coupon: any, discount: number): string {
        switch (coupon.type) {
            case CouponType.PERCENTAGE:
                return `${coupon.value}% de descuento aplicado (-$${discount.toFixed(2)})`;
            case CouponType.FIXED_AMOUNT:
                return `Descuento de $${discount.toFixed(2)} aplicado`;
            case CouponType.FREE_SHIPPING:
                return 'Envío gratis aplicado';
            default:
                return 'Descuento aplicado';
        }
    }

    async incrementUsage(couponId: string) {
        return this.prisma.coupon.update({
            where: { id: couponId },
            data: { usageCount: { increment: 1 } },
        });
    }
}
