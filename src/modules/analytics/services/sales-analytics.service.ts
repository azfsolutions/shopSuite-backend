import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { getDateRange } from '../helpers/date-range.helper';

@Injectable()
export class SalesAnalyticsService {
    constructor(private readonly prisma: PrismaService) {}

    async getOverview(storeId: string, query: AnalyticsQueryDto) {
        const { start, end, previousStart, previousEnd } = getDateRange(
            query.period || 'month',
            query.startDate,
            query.endDate,
        );

        // Current period
        const currentOrders = await this.prisma.order.aggregate({
            where: {
                storeId,
                status: { not: 'CANCELLED' },
                createdAt: { gte: start, lte: end },
            },
            _sum: { total: true },
            _count: true,
        });

        // Previous period
        const previousOrders = await this.prisma.order.aggregate({
            where: {
                storeId,
                status: { not: 'CANCELLED' },
                createdAt: { gte: previousStart, lte: previousEnd },
            },
            _sum: { total: true },
            _count: true,
        });

        // New customers
        const newCustomers = await this.prisma.customer.count({
            where: {
                storeId,
                createdAt: { gte: start, lte: end },
            },
        });

        const previousCustomers = await this.prisma.customer.count({
            where: {
                storeId,
                createdAt: { gte: previousStart, lte: previousEnd },
            },
        });

        const currentSales = Number(currentOrders._sum.total || 0);
        const previousSales = Number(previousOrders._sum.total || 0);
        const currentCount = currentOrders._count || 0;
        const previousCount = previousOrders._count || 0;
        const currentAOV = currentCount > 0 ? currentSales / currentCount : 0;
        const previousAOV = previousCount > 0 ? previousSales / previousCount : 0;

        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        return {
            totalSales: currentSales,
            ordersCount: currentCount,
            averageOrderValue: Math.round(currentAOV * 100) / 100,
            newCustomers,
            comparison: {
                salesChange: Math.round(calculateChange(currentSales, previousSales) * 10) / 10,
                ordersChange: Math.round(calculateChange(currentCount, previousCount) * 10) / 10,
                aovChange: Math.round(calculateChange(currentAOV, previousAOV) * 10) / 10,
                customersChange: Math.round(calculateChange(newCustomers, previousCustomers) * 10) / 10,
            },
            period: {
                start: start.toISOString(),
                end: end.toISOString(),
            },
        };
    }

    async getSalesChart(storeId: string, query: AnalyticsQueryDto) {
        const { start, end } = getDateRange(
            query.period || 'month',
            query.startDate,
            query.endDate,
        );

        const orders = await this.prisma.order.findMany({
            where: {
                storeId,
                status: { not: 'CANCELLED' },
                createdAt: { gte: start, lte: end },
            },
            select: {
                total: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        // Group by date
        const salesByDate = new Map<string, { sales: number; orders: number }>();

        orders.forEach(order => {
            const dateKey = order.createdAt.toISOString().split('T')[0];
            const existing = salesByDate.get(dateKey) || { sales: 0, orders: 0 };
            existing.sales += Number(order.total);
            existing.orders += 1;
            salesByDate.set(dateKey, existing);
        });

        const data = Array.from(salesByDate.entries()).map(([date, values]) => ({
            date,
            sales: Math.round(values.sales * 100) / 100,
            orders: values.orders,
        }));

        return {
            data,
            total: data.reduce((sum, d) => sum + d.sales, 0),
        };
    }

    async getSalesHeatmap(storeId: string, query: AnalyticsQueryDto) {
        const { start, end } = getDateRange(
            query.period || 'month',
            query.startDate,
            query.endDate,
        );

        try {
            const rows = await this.prisma.$queryRaw<Array<{
                dayOfWeek: number;
                hour: number;
                count: number;
                total: number;
            }>>(Prisma.sql`
                SELECT
                    EXTRACT(DOW FROM "createdAt" AT TIME ZONE 'UTC')::int AS "dayOfWeek",
                    EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC')::int AS "hour",
                    COUNT(*)::int AS count,
                    COALESCE(SUM(total), 0)::float AS total
                FROM orders
                WHERE "storeId" = ${storeId}
                  AND status != 'CANCELLED'
                  AND "createdAt" >= ${start}
                  AND "createdAt" <= ${end}
                GROUP BY "dayOfWeek", "hour"
                ORDER BY "dayOfWeek", "hour"
            `);

            return {
                cells: rows.map(r => ({
                    dayOfWeek: Number(r.dayOfWeek),
                    hour: Number(r.hour),
                    count: Number(r.count),
                    total: Number(r.total),
                })),
            };
        } catch (error) {
            throw new InternalServerErrorException('Error al obtener datos del heatmap de ventas');
        }
    }

    async getSalesByCategory(storeId: string, query: AnalyticsQueryDto) {
        const { start, end } = getDateRange(
            query.period || 'month',
            query.startDate,
            query.endDate,
        );

        const orderItems = await this.prisma.orderItem.findMany({
            where: {
                order: {
                    storeId,
                    status: { not: 'CANCELLED' },
                    createdAt: { gte: start, lte: end },
                },
            },
            select: {
                totalPrice: true,
                product: {
                    select: {
                        category: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });

        const categoryMap = new Map<string, { name: string; revenue: number }>();

        orderItems.forEach(item => {
            const categoryId = item.product?.category?.id || 'uncategorized';
            const categoryName = item.product?.category?.name || 'Sin categoría';
            const existing = categoryMap.get(categoryId) || { name: categoryName, revenue: 0 };
            existing.revenue += Number(item.totalPrice);
            categoryMap.set(categoryId, existing);
        });

        const categories = Array.from(categoryMap.entries())
            .map(([id, data]) => ({
                id,
                name: data.name,
                revenue: Math.round(data.revenue * 100) / 100,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        return { categories };
    }
}
