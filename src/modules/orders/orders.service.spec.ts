import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockOrder } from '../../test/test-helpers';

describe('OrdersService', () => {
    let service: OrdersService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    afterEach(() => jest.clearAllMocks());

    // ─── FIND ALL ────────────────────────────────────────────
    describe('findAll', () => {
        it('should return orders with pagination meta', async () => {
            const orders = [createMockOrder(), createMockOrder({ id: 'order-2' })];
            prisma.order.findMany.mockResolvedValue(orders);
            prisma.order.count.mockResolvedValue(2);

            const result = await service.findAll('store-1');

            expect(result.data).toHaveLength(2);
            expect(result.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
        });

        it('should filter by status when provided', async () => {
            prisma.order.findMany.mockResolvedValue([]);
            prisma.order.count.mockResolvedValue(0);

            await service.findAll('store-1', 'SHIPPED');

            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { storeId: 'store-1', status: 'SHIPPED' },
                }),
            );
        });

        it('should calculate totalPages correctly', async () => {
            prisma.order.findMany.mockResolvedValue([]);
            prisma.order.count.mockResolvedValue(45);

            const result = await service.findAll('store-1', undefined, 1, 20);

            expect(result.meta.totalPages).toBe(3);
        });

        it('should support custom pagination', async () => {
            prisma.order.findMany.mockResolvedValue([]);
            prisma.order.count.mockResolvedValue(0);

            await service.findAll('store-1', undefined, 3, 10);

            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 20,
                    take: 10,
                }),
            );
        });
    });

    // ─── FIND BY ID ──────────────────────────────────────────
    describe('findById', () => {
        it('should return order when found', async () => {
            const order = createMockOrder();
            prisma.order.findFirst.mockResolvedValue(order);

            const result = await service.findById('store-1', 'order-1');
            expect(result).toEqual(order);
        });

        it('should scope query to storeId', async () => {
            prisma.order.findFirst.mockResolvedValue(createMockOrder());

            await service.findById('store-1', 'order-1');

            expect(prisma.order.findFirst).toHaveBeenCalledWith({
                where: { id: 'order-1', storeId: 'store-1' },
            });
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.order.findFirst.mockResolvedValue(null);

            await expect(service.findById('store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ─── UPDATE STATUS ───────────────────────────────────────
    describe('updateStatus', () => {
        it('should update order status', async () => {
            prisma.order.findFirst.mockResolvedValue(createMockOrder());
            prisma.order.update.mockResolvedValue(createMockOrder({ status: 'SHIPPED' }));

            const result = await service.updateStatus('store-1', 'order-1', 'SHIPPED', 'user-1');

            expect(result.status).toBe('SHIPPED');
            expect(prisma.order.update).toHaveBeenCalledWith({
                where: { id: 'order-1' },
                data: { status: 'SHIPPED' },
            });
        });

        it('should throw NotFoundException if order does not exist', async () => {
            prisma.order.findFirst.mockResolvedValue(null);

            await expect(
                service.updateStatus('store-1', 'nonexistent', 'SHIPPED'),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
