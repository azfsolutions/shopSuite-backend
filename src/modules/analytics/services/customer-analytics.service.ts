import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AnalyticsQueryDto, AtRiskCustomersQueryDto } from '../dto/analytics-query.dto';

@Injectable()
export class CustomerAnalyticsService {
    constructor(private readonly prisma: PrismaService) {}

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
                buyerUser: {
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
                id: p.buyerUser?.id ?? p.id,
                email: p.buyerUser?.email ?? '',
                firstName: p.buyerUser?.firstName ?? '',
                lastName: p.buyerUser?.lastName ?? '',
                ordersCount: p.ordersCount,
                totalSpent: Number(p.totalSpent),
            })),
        };
    }

    async getCustomerSegments(storeId: string) {
        const profiles = await this.prisma.storeCustomerProfile.findMany({
            where: { storeId, ordersCount: { gt: 0 } },
            select: { totalSpent: true },
        });

        const counts = { alto: 0, medio: 0, bajo: 0 };
        const revenue = { alto: 0, medio: 0, bajo: 0 };

        for (const p of profiles) {
            const spent = Number(p.totalSpent);
            if (spent > 500) {
                counts.alto++;
                revenue.alto += spent;
            } else if (spent >= 100) {
                counts.medio++;
                revenue.medio += spent;
            } else {
                counts.bajo++;
                revenue.bajo += spent;
            }
        }

        const total = profiles.length;
        const totalRevenue = revenue.alto + revenue.medio + revenue.bajo;

        return {
            segments: [
                {
                    label: 'Alto',
                    count: counts.alto,
                    totalRevenue: Math.round(revenue.alto * 100) / 100,
                    percentage: total > 0 ? Math.round((counts.alto / total) * 1000) / 10 : 0,
                    revenuePercentage: totalRevenue > 0 ? Math.round((revenue.alto / totalRevenue) * 1000) / 10 : 0,
                },
                {
                    label: 'Medio',
                    count: counts.medio,
                    totalRevenue: Math.round(revenue.medio * 100) / 100,
                    percentage: total > 0 ? Math.round((counts.medio / total) * 1000) / 10 : 0,
                    revenuePercentage: totalRevenue > 0 ? Math.round((revenue.medio / totalRevenue) * 1000) / 10 : 0,
                },
                {
                    label: 'Bajo',
                    count: counts.bajo,
                    totalRevenue: Math.round(revenue.bajo * 100) / 100,
                    percentage: total > 0 ? Math.round((counts.bajo / total) * 1000) / 10 : 0,
                    revenuePercentage: totalRevenue > 0 ? Math.round((revenue.bajo / totalRevenue) * 1000) / 10 : 0,
                },
            ],
            total,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
        };
    }

    async getAtRiskCustomers(storeId: string, query: AtRiskCustomersQueryDto) {
        const daysInactive = query.daysInactive ?? 60;
        const limit = query.limit ?? 20;
        const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);

        const profiles = await this.prisma.storeCustomerProfile.findMany({
            where: {
                storeId,
                lastOrderAt: { lt: cutoffDate },
            },
            include: {
                buyerUser: {
                    select: { email: true, firstName: true, lastName: true },
                },
            },
            take: limit,
            orderBy: { lastOrderAt: 'asc' },
        });

        return {
            customers: profiles.map(p => ({
                id: p.buyerUserId,
                email: p.buyerUser?.email ?? '',
                firstName: p.buyerUser?.firstName ?? '',
                lastName: p.buyerUser?.lastName ?? '',
                totalSpent: Number(p.totalSpent),
                ordersCount: p.ordersCount,
                lastOrderAt: p.lastOrderAt?.toISOString() ?? null,
                daysInactive: p.lastOrderAt
                    ? Math.floor((Date.now() - p.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
                    : null,
            })),
        };
    }
}
