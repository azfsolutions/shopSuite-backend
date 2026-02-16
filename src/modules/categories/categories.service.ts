import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CategoriesService {
    private readonly logger = new Logger(CategoriesService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findAll(storeId: string) {
        return this.prisma.category.findMany({
            where: { storeId, deletedAt: null },
            include: {
                children: {
                    where: { deletedAt: null },
                },
                _count: { select: { products: true } },
            },
            orderBy: { position: 'asc' },
        });
    }

    async findById(storeId: string, categoryId: string) {
        const category = await this.prisma.category.findFirst({
            where: { id: categoryId, storeId, deletedAt: null },
            include: {
                children: { where: { deletedAt: null } },
                parent: true,
                _count: { select: { products: true } },
            },
        });

        if (!category) {
            throw new NotFoundException('Categoría no encontrada');
        }

        return category;
    }

    async create(storeId: string, data: { name: string; slug: string; description?: string; parentId?: string; image?: string }) {
        const existing = await this.prisma.category.findFirst({
            where: { storeId, slug: data.slug },
        });

        if (existing) {
            throw new ConflictException('El slug ya existe');
        }

        return this.prisma.category.create({
            data: { ...data, storeId },
        });
    }

    async update(storeId: string, categoryId: string, data: { name?: string; description?: string; image?: string; isActive?: boolean }) {
        // Verify category exists before updating
        await this.findById(storeId, categoryId);

        return this.prisma.category.update({
            where: { id: categoryId },
            data,
        });
    }

    async delete(storeId: string, categoryId: string) {
        // Verify category exists before deleting
        await this.findById(storeId, categoryId);

        return this.prisma.category.update({
            where: { id: categoryId },
            data: { deletedAt: new Date() },
        });
    }
}
