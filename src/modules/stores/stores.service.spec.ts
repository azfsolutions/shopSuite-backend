import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { StoresService } from './stores.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockStore } from '../../test/test-helpers';

describe('StoresService', () => {
    let service: StoresService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StoresService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<StoresService>(StoresService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('create', () => {
        it('should create store with settings and owner member', async () => {
            prisma.store.findUnique.mockResolvedValue(null);
            const store = createMockStore({ id: 'new-store' });
            prisma.store.create.mockResolvedValue(store);
            prisma.storeMember.create.mockResolvedValue({});

            const result = await service.create('user-1', { name: 'My Store', slug: 'my-store' } as any);

            expect(result).toEqual(store);
            expect(prisma.storeMember.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ role: 'OWNER' }),
                }),
            );
        });

        it('should throw ConflictException for duplicate slug', async () => {
            prisma.store.findUnique.mockResolvedValueOnce(createMockStore());

            await expect(
                service.create('user-1', { name: 'S', slug: 'test-store' } as any),
            ).rejects.toThrow(ConflictException);
        });

        it('should throw ConflictException for duplicate subdomain', async () => {
            prisma.store.findUnique
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(createMockStore());

            await expect(
                service.create('user-1', { name: 'S', slug: 'taken-subdomain' } as any),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('findById', () => {
        it('should return store with settings and counts', async () => {
            const store = createMockStore();
            prisma.store.findUnique.mockResolvedValue(store);

            const result = await service.findById('store-1');
            expect(result).toEqual(store);
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.store.findUnique.mockResolvedValue(null);

            await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('findBySlug', () => {
        it('should return store by slug', async () => {
            const store = createMockStore();
            prisma.store.findUnique.mockResolvedValue(store);

            const result = await service.findBySlug('test-store');
            expect(result).toEqual(store);
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.store.findUnique.mockResolvedValue(null);

            await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('delete', () => {
        it('should soft delete store', async () => {
            prisma.store.findUnique.mockResolvedValue(createMockStore());
            prisma.store.update.mockResolvedValue(createMockStore({ deletedAt: new Date() }));

            await service.delete('store-1');

            expect(prisma.store.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ deletedAt: expect.any(Date) }),
                }),
            );
        });
    });

    describe('getDashboardStats', () => {
        it('should aggregate all dashboard stats', async () => {
            prisma.product.count.mockResolvedValue(50);
            prisma.order.count.mockResolvedValueOnce(100)   // totalOrders
                .mockResolvedValueOnce(5)                    // pendingOrders
                .mockResolvedValueOnce(3);                   // todayOrders
            prisma.customer.count.mockResolvedValue(200);
            prisma.order.aggregate.mockResolvedValue({ _sum: { total: 25000 } });

            const stats = await service.getDashboardStats('store-1');

            expect(stats).toEqual({
                totalProducts: 50,
                totalOrders: 100,
                totalCustomers: 200,
                pendingOrders: 5,
                todayOrders: 3,
                totalRevenue: 25000,
            });
        });

        it('should default totalRevenue to 0 when no paid orders', async () => {
            prisma.product.count.mockResolvedValue(0);
            prisma.order.count.mockResolvedValue(0);
            prisma.customer.count.mockResolvedValue(0);
            prisma.order.aggregate.mockResolvedValue({ _sum: { total: null } });

            const stats = await service.getDashboardStats('store-1');

            expect(stats.totalRevenue).toBe(0);
        });
    });
});
