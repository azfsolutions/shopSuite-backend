import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WishlistService {
    constructor(private readonly prisma: PrismaService) { }

    // Helpers to get customer from userId
    private async getOrCreateCustomerFromUser(userId: string, productId?: string) {
        // Si hay productId, obtenemos el storeId del producto
        let storeId: string | undefined;

        if (productId) {
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
                select: { storeId: true },
            });
            storeId = product?.storeId;
        }

        // Buscar customer existente del user
        const customer = await this.prisma.customer.findFirst({
            where: {
                email: {
                    equals: (await this.prisma.user.findUnique({ where: { id: userId } }))?.email ?? '',
                },
                ...(storeId && { storeId }),
            },
        });

        return customer;
    }

    // ============================================================
    // BY USER ID (for auth via AuthGuard)
    // ============================================================

    async getWishlistByUserId(userId: string) {
        const customer = await this.getCustomerFromUserId(userId);
        if (!customer) {
            return { items: [] };
        }
        return this.getWishlist(customer.id);
    }

    async addItemByUserId(userId: string, productId: string) {
        const customer = await this.getOrCreateCustomerForProduct(userId, productId);
        return this.addItem(customer.id, productId);
    }

    async removeItemByUserId(userId: string, productId: string) {
        const customer = await this.getCustomerFromUserId(userId);
        if (!customer) {
            throw new NotFoundException('Customer no encontrado');
        }
        return this.removeItem(customer.id, productId);
    }

    async isInWishlistByUserId(userId: string, productId: string): Promise<boolean> {
        const customer = await this.getCustomerFromUserId(userId);
        if (!customer) return false;
        return this.isInWishlist(customer.id, productId);
    }

    async getWishlistCountByUserId(userId: string): Promise<number> {
        const customer = await this.getCustomerFromUserId(userId);
        if (!customer) return 0;
        return this.getWishlistCount(customer.id);
    }

    private async getCustomerFromUserId(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if (!user) return null;

        return this.prisma.customer.findFirst({
            where: { email: user.email },
        });
    }

    private async getOrCreateCustomerForProduct(userId: string, productId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true, lastName: true },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { storeId: true },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        // Find or create customer for this store
        let customer = await this.prisma.customer.findFirst({
            where: {
                email: user.email,
                storeId: product.storeId,
            },
        });

        if (!customer) {
            customer = await this.prisma.customer.create({
                data: {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    storeId: product.storeId,
                },
            });
        }

        return customer;
    }

    // ============================================================
    // BY CUSTOMER ID (core methods)
    // ============================================================

    async getWishlist(customerId: string) {
        // Obtener o crear wishlist
        const wishlist = await this.prisma.wishlist.upsert({
            where: { customerId },
            create: { customerId },
            update: {},
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                images: { take: 1, orderBy: { position: 'asc' } },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        return wishlist;
    }

    async addItem(customerId: string, productId: string) {
        // Verificar que el producto existe
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        // Obtener o crear wishlist
        let wishlist = await this.prisma.wishlist.findUnique({
            where: { customerId },
        });

        if (!wishlist) {
            wishlist = await this.prisma.wishlist.create({
                data: { customerId },
            });
        }

        // Verificar si ya existe
        const existing = await this.prisma.wishlistItem.findUnique({
            where: {
                wishlistId_productId: {
                    wishlistId: wishlist.id,
                    productId,
                },
            },
        });

        if (existing) {
            throw new ConflictException('El producto ya está en tu lista de deseos');
        }

        // Agregar item
        const item = await this.prisma.wishlistItem.create({
            data: {
                wishlistId: wishlist.id,
                productId,
            },
            include: {
                product: {
                    include: {
                        images: { take: 1, orderBy: { position: 'asc' } },
                    },
                },
            },
        });

        return item;
    }

    async removeItem(customerId: string, productId: string) {
        const wishlist = await this.prisma.wishlist.findUnique({
            where: { customerId },
        });

        if (!wishlist) {
            throw new NotFoundException('Wishlist no encontrada');
        }

        const item = await this.prisma.wishlistItem.findUnique({
            where: {
                wishlistId_productId: {
                    wishlistId: wishlist.id,
                    productId,
                },
            },
        });

        if (!item) {
            throw new NotFoundException('Producto no encontrado en la wishlist');
        }

        await this.prisma.wishlistItem.delete({
            where: { id: item.id },
        });

        return { message: 'Producto removido de la wishlist' };
    }

    async isInWishlist(customerId: string, productId: string): Promise<boolean> {
        const wishlist = await this.prisma.wishlist.findUnique({
            where: { customerId },
        });

        if (!wishlist) {
            return false;
        }

        const item = await this.prisma.wishlistItem.findUnique({
            where: {
                wishlistId_productId: {
                    wishlistId: wishlist.id,
                    productId,
                },
            },
        });

        return !!item;
    }

    async getWishlistCount(customerId: string): Promise<number> {
        const wishlist = await this.prisma.wishlist.findUnique({
            where: { customerId },
            include: { _count: { select: { items: true } } },
        });

        return wishlist?._count.items ?? 0;
    }
}
