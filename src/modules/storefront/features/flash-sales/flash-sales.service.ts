import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateFlashSaleDto, UpdateFlashSaleDto, FlashSaleItemDto } from './dto';



/**
 * Service para gestionar Flash Sales (ofertas con countdown)
 */
@Injectable()
export class FlashSalesService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtener todas las flash sales de una tienda
     */
    async findAllByStore(storeId: string, includeItems = true) {
        const flashSales = await this.prisma.flashSale.findMany({
            where: { storeId },
            include: includeItems
                ? {
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                    price: true,
                                    images: { take: 1, select: { url: true } },
                                },
                            },
                        },
                    },
                }
                : undefined,
            orderBy: { startDate: 'desc' },
        });

        return flashSales;
    }

    /**
     * Obtener una flash sale por ID (scoped al storeId)
     */
    async findById(storeId: string, flashSaleId: string) {
        const flashSale = await this.prisma.flashSale.findFirst({
            where: { id: flashSaleId, storeId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                price: true,
                                images: { take: 1, select: { url: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!flashSale) {
            throw new NotFoundException('Flash Sale no encontrada');
        }

        return flashSale;
    }

    /**
     * Crear una nueva flash sale con items
     */
    async create(storeId: string, createDto: CreateFlashSaleDto) {
        // Validar que la tienda existe
        const storeExists = await this.prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!storeExists) {
            throw new BadRequestException('Tienda no encontrada');
        }

        // Validar fechas
        const startDate = new Date(createDto.startDate);
        const endDate = new Date(createDto.endDate);

        if (endDate <= startDate) {
            throw new BadRequestException(
                'La fecha de fin debe ser posterior a la de inicio',
            );
        }

        // Validar que los productos existen y pertenecen a la tienda
        const productIds = createDto.items.map((item: FlashSaleItemDto) => item.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, storeId },
        });

        if (products.length !== productIds.length) {
            throw new BadRequestException(
                'Algunos productos no existen o no pertenecen a esta tienda',
            );
        }

        // Crear flash sale con items
        const flashSale = await this.prisma.flashSale.create({
            data: {
                name: createDto.name,
                startDate,
                endDate,
                isActive: createDto.isActive ?? true,
                storeId,
                items: {
                    create: createDto.items.map((item: FlashSaleItemDto) => ({
                        productId: item.productId,
                        discountPercentage: item.discountPercentage,
                        stockLimit: item.stockLimit,
                        soldCount: 0,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                price: true,
                                images: { take: 1, select: { url: true } },
                            },
                        },
                    },
                },
            },
        });

        return flashSale;
    }

    /**
     * Actualizar una flash sale (scoped al storeId, sin items)
     */
    async update(storeId: string, flashSaleId: string, updateDto: UpdateFlashSaleDto) {
        await this.findById(storeId, flashSaleId);

        const data: any = { ...updateDto };

        // Convert dates if provided
        if (updateDto.startDate) {
            data.startDate = new Date(updateDto.startDate);
        }
        if (updateDto.endDate) {
            data.endDate = new Date(updateDto.endDate);
        }

        const updated = await this.prisma.flashSale.update({
            where: { id: flashSaleId },
            data,
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                price: true,
                                images: { take: 1, select: { url: true } },
                            },
                        },
                    },
                },
            },
        });

        return updated;
    }

    /**
     * Eliminar una flash sale y sus items (scoped al storeId)
     */
    async delete(storeId: string, flashSaleId: string) {
        await this.findById(storeId, flashSaleId);

        await this.prisma.flashSaleItem.deleteMany({
            where: { flashSaleId },
        });

        await this.prisma.flashSale.delete({
            where: { id: flashSaleId },
        });

        return { message: 'Flash Sale eliminada exitosamente' };
    }

    /**
     * Agregar un producto a una flash sale existente (scoped al storeId)
     */
    async addItem(storeId: string, flashSaleId: string, item: FlashSaleItemDto) {
        const flashSale = await this.findById(storeId, flashSaleId);

        // Verificar que el producto existe y pertenece a la tienda
        const product = await this.prisma.product.findFirst({
            where: { id: item.productId, storeId: flashSale.storeId },
        });

        if (!product) {
            throw new BadRequestException('Producto no encontrado en esta tienda');
        }

        // Verificar que no existe ya
        const existing = await this.prisma.flashSaleItem.findFirst({
            where: { flashSaleId, productId: item.productId },
        });

        if (existing) {
            throw new BadRequestException('Este producto ya está en la flash sale');
        }

        const newItem = await this.prisma.flashSaleItem.create({
            data: {
                flashSaleId,
                productId: item.productId,
                discountPercentage: item.discountPercentage,
                stockLimit: item.stockLimit,
                soldCount: 0,
            },
            include: {
                product: {
                    select: { id: true, name: true, slug: true, price: true },
                },
            },
        });

        return newItem;
    }

    /**
     * Eliminar un item de una flash sale (scoped al storeId)
     */
    async removeItem(storeId: string, flashSaleId: string, itemId: string) {
        await this.findById(storeId, flashSaleId);

        const item = await this.prisma.flashSaleItem.findFirst({
            where: { id: itemId, flashSaleId },
        });

        if (!item) {
            throw new NotFoundException('Item no encontrado');
        }

        await this.prisma.flashSaleItem.delete({
            where: { id: itemId },
        });

        return { message: 'Item eliminado exitosamente' };
    }

    /**
     * Incrementar contador de ventas de un item
     */
    async incrementSoldCount(itemId: string, quantity = 1) {
        await this.prisma.flashSaleItem.update({
            where: { id: itemId },
            data: { soldCount: { increment: quantity } },
        });
    }
}
