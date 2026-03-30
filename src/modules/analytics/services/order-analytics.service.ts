import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';
import { getDateRange } from '../helpers/date-range.helper';

@Injectable()
export class OrderAnalyticsService {
    constructor(private readonly prisma: PrismaService) {}

    async getOrdersByStatus(storeId: string, query: AnalyticsQueryDto) {
        const { start, end } = getDateRange(
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
}
