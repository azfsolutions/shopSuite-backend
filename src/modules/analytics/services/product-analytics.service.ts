import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { getDateRange } from '../helpers/date-range.helper';

@Injectable()
export class ProductAnalyticsService {
    constructor(private readonly prisma: PrismaService) {}

    async getTopProducts(storeId: string, query: AnalyticsQueryDto) {
        const { start, end } = getDateRange(
            query.period || 'month',
            query.startDate,
            query.endDate,
        );

        const limit = query.limit || 10;

        const orderItems = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                order: {
                    storeId,
                    status: { not: 'CANCELLED' },
                    createdAt: { gte: start, lte: end },
                },
            },
            _sum: {
                quantity: true,
                totalPrice: true,
            },
            orderBy: {
                _sum: { totalPrice: 'desc' },
            },
            take: limit,
        });

        // Fetch product details
        const productIds = orderItems.map(item => item.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
                id: true,
                name: true,
                sku: true,
                images: { take: 1, select: { url: true } },
            },
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        return {
            products: orderItems.map(item => {
                const product = productMap.get(item.productId);
                return {
                    id: item.productId,
                    name: product?.name || 'Producto eliminado',
                    sku: product?.sku || '',
                    image: product?.images?.[0]?.url || null,
                    unitsSold: item._sum.quantity || 0,
                    revenue: Number(item._sum.totalPrice || 0),
                };
            }),
        };
    }

    async getProductMargin(storeId: string, query: AnalyticsQueryDto) {
        const { start, end } = getDateRange(
            query.period || 'month',
            query.startDate,
            query.endDate,
        );

        const products = await this.prisma.product.findMany({
            where: {
                storeId,
                costPerItem: { gt: 0 },
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                price: true,
                costPerItem: true,
            },
            orderBy: { price: 'desc' },
            take: 50,
        });

        if (products.length === 0) return { products: [] };

        const productIds = products.map(p => p.id);

        const salesData = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                productId: { in: productIds },
                order: {
                    storeId,
                    status: { not: 'CANCELLED' },
                    createdAt: { gte: start, lte: end },
                },
            },
            _sum: { quantity: true, totalPrice: true },
        });

        const salesMap = new Map(salesData.map(s => [s.productId, s]));

        const result = products.map(p => {
            const price = Number(p.price);
            const cost = Number(p.costPerItem);
            const margin = price - cost;
            const marginPct = price > 0 ? (margin / price) * 100 : 0;
            const sales = salesMap.get(p.id);
            const unitsSold = Number(sales?._sum.quantity || 0);
            const revenue = Number(sales?._sum.totalPrice || 0);

            return {
                id: p.id,
                name: p.name,
                price,
                costPerItem: cost,
                margin: Math.round(margin * 100) / 100,
                marginPct: Math.round(marginPct * 10) / 10,
                unitsSold,
                revenue: Math.round(revenue * 100) / 100,
            };
        });

        result.sort((a, b) => b.margin - a.margin);

        return { products: result };
    }
}
