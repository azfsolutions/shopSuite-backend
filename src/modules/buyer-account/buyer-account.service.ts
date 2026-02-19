import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { UpdateBuyerProfileDto } from './dto/update-profile.dto';

@Injectable()
export class BuyerAccountService {
    constructor(private readonly prisma: PrismaService) { }

    // ============= PROFILE =============
    async getOrCreateProfile(userId: string, storeId: string) {
        let profile = await this.prisma.storeCustomerProfile.findUnique({
            where: {
                userId_storeId: { userId, storeId },
            },
        });

        if (!profile) {
            profile = await this.prisma.storeCustomerProfile.create({
                data: { userId, storeId },
            });

            // Link User → Customer on first login to this store
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, firstName: true, lastName: true, phone: true },
            });
            if (user) {
                await this.prisma.customer.upsert({
                    where: { storeId_email: { storeId, email: user.email } },
                    update: { userId },
                    create: {
                        storeId,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        phone: user.phone,
                        userId,
                    },
                });
            }
        }

        return profile;
    }

    async getProfileWithUser(userId: string, storeId: string) {
        const profile = await this.getOrCreateProfile(userId, storeId);

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });

        return {
            ...user,
            storeProfile: {
                ordersCount: profile.ordersCount,
                totalSpent: Number(profile.totalSpent),
                memberSince: profile.createdAt,
                lastOrderAt: profile.lastOrderAt,
            },
        };
    }

    async updateProfile(userId: string, dto: UpdateBuyerProfileDto) {
        const updateData: Record<string, string> = {};
        if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
        if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
        if (dto.phone !== undefined) updateData.phone = dto.phone;

        if (dto.firstName !== undefined || dto.lastName !== undefined) {
            const current = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { firstName: true, lastName: true },
            });
            updateData.name = `${dto.firstName ?? current?.firstName} ${dto.lastName ?? current?.lastName}`;
        }

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });

        return user;
    }

    // ============= ADDRESSES =============
    async getAddresses(userId: string, storeId: string) {
        const profile = await this.getOrCreateProfile(userId, storeId);

        return this.prisma.buyerAddress.findMany({
            where: { profileId: profile.id },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async createAddress(userId: string, storeId: string, dto: CreateAddressDto) {
        const profile = await this.getOrCreateProfile(userId, storeId);

        // Si es default, quitar default de las demás
        if (dto.isDefault) {
            await this.prisma.buyerAddress.updateMany({
                where: { profileId: profile.id },
                data: { isDefault: false },
            });
        }

        return this.prisma.buyerAddress.create({
            data: {
                profileId: profile.id,
                ...dto,
            },
        });
    }

    async updateAddress(userId: string, storeId: string, addressId: string, dto: UpdateAddressDto) {
        const profile = await this.getOrCreateProfile(userId, storeId);

        const address = await this.prisma.buyerAddress.findFirst({
            where: { id: addressId, profileId: profile.id },
        });

        if (!address) {
            throw new NotFoundException('Dirección no encontrada');
        }

        // Si es default, quitar default de las demás
        if (dto.isDefault) {
            await this.prisma.buyerAddress.updateMany({
                where: { profileId: profile.id, id: { not: addressId } },
                data: { isDefault: false },
            });
        }

        return this.prisma.buyerAddress.update({
            where: { id: addressId },
            data: dto,
        });
    }

    async deleteAddress(userId: string, storeId: string, addressId: string) {
        const profile = await this.getOrCreateProfile(userId, storeId);

        const address = await this.prisma.buyerAddress.findFirst({
            where: { id: addressId, profileId: profile.id },
        });

        if (!address) {
            throw new NotFoundException('Dirección no encontrada');
        }

        await this.prisma.buyerAddress.delete({
            where: { id: addressId },
        });

        return { message: 'Dirección eliminada' };
    }

    // ============= ORDERS =============
    async getOrders(userId: string, storeId: string, page = 1, limit = 10) {
        const profile = await this.getOrCreateProfile(userId, storeId);

        const where = {
            storeId,
            customerEmail: await this.getUserEmail(userId),
        };

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    total: true,
                    createdAt: true,
                    items: {
                        select: { id: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            orders: orders.map(order => ({
                ...order,
                total: Number(order.total),
                itemsCount: order.items.length,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getOrderDetail(userId: string, storeId: string, orderId: string) {
        const userEmail = await this.getUserEmail(userId);

        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                storeId,
                customerEmail: userEmail,
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                images: { take: 1, select: { url: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        return {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            items: order.items.map(item => ({
                name: item.name,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice),
                image: item.imageUrl || item.product?.images?.[0]?.url,
            })),
            shippingAddress: order.shippingAddress,
            shippingMethodName: order.shippingMethodName,
            subtotal: Number(order.subtotal),
            shippingTotal: Number(order.shippingTotal),
            discountTotal: Number(order.discountTotal),
            taxTotal: Number(order.taxTotal),
            total: Number(order.total),
            createdAt: order.createdAt,
            paidAt: order.paidAt,
            shippedAt: order.shippedAt,
            deliveredAt: order.deliveredAt,
            trackingNumber: order.trackingNumber,
            trackingUrl: order.trackingUrl,
        };
    }

    private async getUserEmail(userId: string): Promise<string> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        return user?.email || '';
    }
}
