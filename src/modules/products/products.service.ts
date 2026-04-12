import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface CreateProductData {
    name: string;
    slug: string;
    description?: string;
    price: number;
    compareAtPrice?: number;
    sku?: string;
    stock?: number;
    categoryId?: string;
    status?: string;
    isFeatured?: boolean;
}

interface ProductFilterDto {
    categoryId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findAll(storeId: string, filterDto: ProductFilterDto = {}) {
        const page = filterDto.page || 1;
        const limit = filterDto.limit || 20;

        const where: any = { storeId, deletedAt: null };
        if (filterDto.categoryId) where.categoryId = filterDto.categoryId;
        if (filterDto.status) where.status = filterDto.status;
        if (filterDto.search) {
            where.name = { contains: filterDto.search, mode: 'insensitive' };
        }

        const [total, products] = await Promise.all([
            this.prisma.product.count({ where }),
            this.prisma.product.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    price: true,
                    compareAtPrice: true,
                    stock: true,
                    status: true,
                    isFeatured: true,
                    isExclusive: true,
                    createdAt: true,
                    category: { select: { id: true, name: true, slug: true } },
                    images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
                },
                take: limit,
                skip: (page - 1) * limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        this.logger.debug(`findAll(${storeId}): found ${products.length} of ${total}`);

        return {
            data: products,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(storeId: string, productId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, storeId, deletedAt: null },
            include: {
                category: true,
                images: { orderBy: { position: 'asc' } },
                variants: { orderBy: { position: 'asc' } },
            },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        return product;
    }

    async create(storeId: string, data: CreateProductData) {
        const existing = await this.prisma.product.findFirst({
            where: { storeId, slug: data.slug },
        });

        if (existing) {
            throw new ConflictException('El slug ya existe');
        }

        return this.prisma.product.create({
            data: {
                name: data.name,
                slug: data.slug,
                description: data.description,
                price: data.price,
                compareAtPrice: data.compareAtPrice,
                sku: data.sku,
                stock: data.stock ?? 0,
                categoryId: data.categoryId,
                status: (data.status as any) ?? 'DRAFT',
                isFeatured: data.isFeatured ?? false,
                storeId,
            },
            include: {
                category: true,
                images: true,
            },
        });
    }

    async update(storeId: string, productId: string, data: Partial<CreateProductData>) {
        // Verify product exists before updating
        await this.findById(storeId, productId);

        return this.prisma.product.update({
            where: { id: productId },
            data: {
                name: data.name,
                slug: data.slug,
                description: data.description,
                price: data.price,
                compareAtPrice: data.compareAtPrice,
                sku: data.sku,
                stock: data.stock,
                categoryId: data.categoryId,
                status: data.status as any,
                isFeatured: data.isFeatured,
            },
            include: {
                category: true,
                images: true,
            },
        });
    }

    async delete(storeId: string, productId: string) {
        // Verify product exists before deleting
        await this.findById(storeId, productId);

        return this.prisma.product.update({
            where: { id: productId },
            data: { deletedAt: new Date() },
        });
    }

    async addImage(storeId: string, productId: string, url: string, position: number = 0) {
        await this.findById(storeId, productId);

        return this.prisma.productImage.create({
            data: { productId, url, position },
        });
    }

    async deleteImage(storeId: string, productId: string, imageId: string) {
        await this.findById(storeId, productId);

        const image = await this.prisma.productImage.findFirst({
            where: { id: imageId, productId },
        });

        if (!image) {
            throw new NotFoundException('Imagen no encontrada');
        }

        return this.prisma.productImage.delete({
            where: { id: imageId },
        });
    }

    /**
     * Update product exclusive status
     */
    async updateExclusiveStatus(storeId: string, productId: string, isExclusive: boolean) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, storeId, deletedAt: null }
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        return this.prisma.product.update({
            where: { id: productId },
            data: { isExclusive },
            include: { category: true, images: { take: 1 } }
        });
    }
}
