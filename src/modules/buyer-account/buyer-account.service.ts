import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { UpdateBuyerProfileDto } from './dto/update-profile.dto';

@Injectable()
export class BuyerAccountService {
    constructor(private readonly prisma: PrismaService) { }

    // ============= PROFILE =============
    async getOrCreateProfile(buyerUserId: string, storeId: string) {
        // Solo busca si existe, NO crea automáticamente
        const profile = await this.prisma.storeCustomerProfile.findUnique({
            where: { buyerUserId_storeId: { buyerUserId, storeId } },
        });
        return profile;
    }

    async getProfileWithUser(buyerUserId: string, storeId: string) {
        const buyerUser = await this.prisma.buyerUser.findUnique({
            where: { id: buyerUserId },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
        });

        if (!buyerUser) throw new NotFoundException('Comprador no encontrado');

        const profile = await this.prisma.storeCustomerProfile.findUnique({
            where: { buyerUserId_storeId: { buyerUserId, storeId } },
        });

        return {
            ...buyerUser,
            storeProfile: profile ? {
                ordersCount: profile.ordersCount,
                totalSpent: Number(profile.totalSpent),
                memberSince: profile.createdAt,
                lastOrderAt: profile.lastOrderAt,
            } : null,
        };
    }

    async updateProfile(buyerUserId: string, dto: UpdateBuyerProfileDto) {
        const updateData: Record<string, string> = {};
        if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
        if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
        if (dto.phone !== undefined) updateData.phone = dto.phone;

        const buyerUser = await this.prisma.buyerUser.update({
            where: { id: buyerUserId },
            data: updateData,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
            },
        });

        return buyerUser;
    }

    // ============= ADDRESSES =============
    async getAddresses(buyerUserId: string, storeId: string) {
        const profile = await this.prisma.storeCustomerProfile.findUnique({
            where: { buyerUserId_storeId: { buyerUserId, storeId } },
            include: { buyerAddresses: true },
        });
        return profile?.buyerAddresses ?? [];
    }

    async createAddress(buyerUserId: string, storeId: string, dto: CreateAddressDto) {
        const profile = await this.prisma.storeCustomerProfile.findUnique({
            where: { buyerUserId_storeId: { buyerUserId, storeId } },
        });

        if (!profile) {
            throw new NotFoundException('Perfil no encontrado para esta tienda');
        }

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

    async updateAddress(buyerUserId: string, storeId: string, addressId: string, dto: UpdateAddressDto) {
        const profile = await this.prisma.storeCustomerProfile.findUnique({
            where: { buyerUserId_storeId: { buyerUserId, storeId } },
        });

        if (!profile) {
            throw new NotFoundException('Perfil no encontrado para esta tienda');
        }

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

    async deleteAddress(buyerUserId: string, storeId: string, addressId: string) {
        const profile = await this.prisma.storeCustomerProfile.findUnique({
            where: { buyerUserId_storeId: { buyerUserId, storeId } },
        });

        if (!profile) {
            throw new NotFoundException('Perfil no encontrado para esta tienda');
        }

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
    async getOrders(buyerUserId: string, storeId: string, page = 1, limit = 10) {
        const customer = await this.prisma.customer.findFirst({
            where: { storeId, buyerUserId },
        });

        if (!customer) {
            return {
                orders: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
            };
        }

        const where = {
            storeId,
            customerEmail: customer.email,
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

    async getOrderDetail(buyerUserId: string, storeId: string, orderId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { storeId, buyerUserId },
        });

        if (!customer) {
            throw new NotFoundException('Pedido no encontrado');
        }

        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                storeId,
                customerEmail: customer.email,
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
}
