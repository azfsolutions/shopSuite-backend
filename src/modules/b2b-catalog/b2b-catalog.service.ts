import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpsertCatalogDto, CatalogItemDto } from './dto/upsert-catalog.dto';
import { CustomerType } from '@prisma/client';

@Injectable()
export class B2BCatalogService {
    private readonly logger = new Logger(B2BCatalogService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getOrCreate(storeId: string, customerId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, storeId, deletedAt: null },
            select: { id: true, customerType: true },
        });
        if (!customer) throw new NotFoundException('Cliente no encontrado');
        if (customer.customerType !== CustomerType.B2B_VIP) {
            throw new ForbiddenException('Catálogo solo disponible para clientes B2B_VIP');
        }

        const existing = await this.prisma.b2BCatalog.findUnique({
            where: { customerId },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, slug: true, sku: true, price: true, stock: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (existing) return existing;

        return this.prisma.b2BCatalog.create({
            data: { storeId, customerId },
            include: { items: { include: { product: true } } },
        });
    }

    async upsertForStore(storeId: string, customerId: string, dto: UpsertCatalogDto) {
        await this.getOrCreate(storeId, customerId);

        const catalog = await this.prisma.b2BCatalog.update({
            where: { customerId },
            data: {
                minOrderAmount: dto.minOrderAmount,
                minOrderQuantity: dto.minOrderQuantity,
                notes: dto.notes,
            },
        });

        if (dto.items) {
            await this.replaceItems(catalog.id, storeId, dto.items);
        }

        return this.getOrCreate(storeId, customerId);
    }

    async getForBuyer(storeId: string, buyerUserId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { storeId, buyerUserId, deletedAt: null },
            select: { id: true, customerType: true },
        });
        if (!customer || customer.customerType !== CustomerType.B2B_VIP) {
            throw new ForbiddenException('Acceso VIP requerido');
        }
        return this.getOrCreate(storeId, customer.id);
    }

    private async replaceItems(catalogId: string, storeId: string, items: CatalogItemDto[]) {
        const productIds = [...new Set(items.map((i) => i.productId))];
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, storeId, deletedAt: null },
            select: { id: true },
        });
        if (products.length !== productIds.length) {
            throw new BadRequestException('Uno o más productos no pertenecen a esta tienda');
        }

        await this.prisma.$transaction([
            this.prisma.b2BCatalogItem.deleteMany({ where: { catalogId } }),
            this.prisma.b2BCatalogItem.createMany({
                data: items.map((i) => ({
                    catalogId,
                    productId: i.productId,
                    price: i.price,
                    notes: i.notes,
                    enabled: i.enabled ?? true,
                })),
            }),
        ]);
    }
}
