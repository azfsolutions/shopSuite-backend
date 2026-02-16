import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsQueryDto, AnalyticsPeriod } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) { }

    private getDateRange(period: AnalyticsPeriod, startDate?: string, endDate?: string) {
        const now = new Date();
        let start: Date;
        let end: Date = new Date(now);
        let previousStart: Date;
        let previousEnd: Date;

        switch (period) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                previousEnd = new Date(start);
                previousEnd.setMilliseconds(-1);
                previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate());
                break;
            case 'week':
                start = new Date(now);
                start.setDate(now.getDate() - 7);
                previousEnd = new Date(start);
                previousEnd.setMilliseconds(-1);
                previousStart = new Date(previousEnd);
                previousStart.setDate(previousEnd.getDate() - 7);
                break;
            case 'month':
                start = new Date(now);
                start.setDate(now.getDate() - 30);
                previousEnd = new Date(start);
                previousEnd.setMilliseconds(-1);
                previousStart = new Date(previousEnd);
                previousStart.setDate(previousEnd.getDate() - 30);
                break;
            case 'year':
                start = new Date(now);
                start.setFullYear(now.getFullYear() - 1);
                previousEnd = new Date(start);
                previousEnd.setMilliseconds(-1);
                previousStart = new Date(previousEnd);
                previousStart.setFullYear(previousEnd.getFullYear() - 1);
                break;
            case 'custom':
                start = startDate ? new Date(startDate) : new Date(now.setDate(now.getDate() - 30));
                end = endDate ? new Date(endDate) : new Date();
                const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                previousEnd = new Date(start);
                previousEnd.setMilliseconds(-1);
                previousStart = new Date(previousEnd);
                previousStart.setDate(previousEnd.getDate() - diffDays);
                break;
            default:
                start = new Date(now.setDate(now.getDate() - 30));
                previousEnd = new Date(start);
                previousEnd.setMilliseconds(-1);
                previousStart = new Date(previousEnd.setDate(previousEnd.getDate() - 30));
        }

        return { start, end, previousStart, previousEnd };
    }

    async getOverview(storeId: string, query: AnalyticsQueryDto) {
        const { start, end, previousStart, previousEnd } = this.getDateRange(
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
        const newCustomers = await this.prisma.storeCustomerProfile.count({
            where: {
                storeId,
                createdAt: { gte: start, lte: end },
            },
        });

        const previousCustomers = await this.prisma.storeCustomerProfile.count({
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
        const { start, end } = this.getDateRange(
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

    async getTopProducts(storeId: string, query: AnalyticsQueryDto) {
        const { start, end } = this.getDateRange(
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

    async getOrdersByStatus(storeId: string, query: AnalyticsQueryDto) {
        const { start, end } = this.getDateRange(
            query.period || 'month',
            query.startDate,
            query.endDate,
        );

        const statusCounts = await this.prisma.order.groupBy({
            by: ['status'],
            where: {
                storeId,
                createdAt: { gte: start, lte: end },
            },
            _count: true,
        });

        const total = statusCounts.reduce((sum, s) => sum + s._count, 0);

        return {
            statuses: statusCounts.map(s => ({
                status: s.status,
                count: s._count,
                percentage: total > 0 ? Math.round((s._count / total) * 1000) / 10 : 0,
            })),
            total,
        };
    }

    async getTopCustomers(storeId: string, query: AnalyticsQueryDto) {
        const limit = query.limit || 5;

        const profiles = await this.prisma.storeCustomerProfile.findMany({
            where: {
                storeId,
                ordersCount: { gt: 0 },
            },
            orderBy: { totalSpent: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return {
            customers: profiles.map(p => ({
                id: p.user.id,
                email: p.user.email,
                firstName: p.user.firstName,
                lastName: p.user.lastName,
                ordersCount: p.ordersCount,
                totalSpent: Number(p.totalSpent),
            })),
        };
    }

    async getSalesByCategory(storeId: string, query: AnalyticsQueryDto) {
        const { start, end } = this.getDateRange(
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
