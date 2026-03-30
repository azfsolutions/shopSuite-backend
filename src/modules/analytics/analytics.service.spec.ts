import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { SalesAnalyticsService } from './services/sales-analytics.service';
import { CustomerAnalyticsService } from './services/customer-analytics.service';
import { ProductAnalyticsService } from './services/product-analytics.service';
import { OrderAnalyticsService } from './services/order-analytics.service';
import { DashboardAlertsService } from './services/dashboard-alerts.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { getDateRange } from './helpers/date-range.helper';

describe('AnalyticsService', () => {
    let service: AnalyticsService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                SalesAnalyticsService,
                CustomerAnalyticsService,
                ProductAnalyticsService,
                OrderAnalyticsService,
                DashboardAlertsService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('getDateRange', () => {
        it('should calculate today range correctly', () => {
            const range = getDateRange('today');
            const today = new Date();

            expect(range.start.getDate()).toBe(today.getDate());
            expect(range.end).toBeInstanceOf(Date);
        });

        it('should calculate week range', () => {
            const range = getDateRange('week');
            expect(range.start).toBeInstanceOf(Date);
        });

        it('should calculate month range', () => {
            const range = getDateRange('month');
            expect(range.start).toBeInstanceOf(Date);
        });

        it('should calculate year range', () => {
            const range = getDateRange('year');
            expect(range.start).toBeInstanceOf(Date);
        });

        it('should handle custom date range', () => {
            const range = getDateRange('custom', '2024-01-01', '2024-01-31');
            expect(range.start.toISOString()).toContain('2024-01-01');
        });
    });

    describe('getOverview', () => {
        it('should aggregate overview stats', async () => {
            prisma.order.aggregate.mockResolvedValue({ _sum: { total: 10000 }, _count: 50 });
            prisma.order.count.mockResolvedValue(50);
            prisma.storeCustomerProfile.count.mockResolvedValue(30);
            prisma.product.count.mockResolvedValue(20);

            const result = await service.getOverview('store-1', { period: 'month' });
            expect(result).toBeDefined();
        });
    });

    describe('getTopProducts', () => {
        it('should return top selling products', async () => {
            (prisma.orderItem as any).groupBy = jest.fn().mockResolvedValue([
                { productId: 'p1', _sum: { quantity: 100, totalPrice: 5000 } },
            ]);
            prisma.product.findMany.mockResolvedValue([
                { id: 'p1', name: 'Widget', sku: 'W123', images: [] },
            ]);

            const result = await service.getTopProducts('store-1', { period: 'month' });
            expect(result).toBeDefined();
        });
    });

    describe('getOrdersByStatus', () => {
        it('should return orders grouped by status', async () => {
            (prisma.order as any).groupBy = jest.fn().mockResolvedValue([
                { status: 'PENDING', _count: { id: 10 } },
            ]);

            const result = await service.getOrdersByStatus('store-1', { period: 'month' });
            expect(result).toBeDefined();
        });
    });
});
