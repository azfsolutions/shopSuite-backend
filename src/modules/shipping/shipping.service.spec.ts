import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockShippingMethod } from '../../test/test-helpers';

describe('ShippingService', () => {
    let service: ShippingService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ShippingService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<ShippingService>(ShippingService);
    });

    afterEach(() => jest.clearAllMocks());

    // ─── CREATE ──────────────────────────────────────────────
    describe('create', () => {
        it('should create with auto-incremented position', async () => {
            prisma.shippingMethod.aggregate.mockResolvedValue({ _max: { position: 2 } });
            prisma.shippingMethod.create.mockResolvedValue(createMockShippingMethod({ position: 3 }));

            await service.create('store-1', { name: 'Express', price: 10000 } as any);

            expect(prisma.shippingMethod.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ position: 3 }),
                }),
            );
        });

        it('should start at position 0 when no existing methods', async () => {
            prisma.shippingMethod.aggregate.mockResolvedValue({ _max: { position: null } });
            prisma.shippingMethod.create.mockResolvedValue(createMockShippingMethod({ position: 0 }));

            await service.create('store-1', { name: 'Standard', price: 5000 } as any);

            expect(prisma.shippingMethod.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ position: 0 }),
                }),
            );
        });
    });

    // ─── FIND ONE ────────────────────────────────────────────
    describe('findOne', () => {
        it('should return method when found', async () => {
            const method = createMockShippingMethod();
            prisma.shippingMethod.findFirst.mockResolvedValue(method);

            const result = await service.findOne('store-1', 'ship-1');
            expect(result).toEqual(method);
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.shippingMethod.findFirst.mockResolvedValue(null);

            await expect(service.findOne('store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ─── GET AVAILABLE FOR CART (Business Logic) ─────────────
    describe('getAvailableForCart', () => {
        it('should mark shipping as free when cart total exceeds freeAbove', async () => {
            const methods = [
                createMockShippingMethod({ price: 5000, freeAbove: 50000 }),
            ];
            prisma.shippingMethod.findMany.mockResolvedValue(methods);

            const result = await service.getAvailableForCart('store-1', 60000);

            expect(result[0].isFree).toBe(true);
            expect(result[0].calculatedPrice).toBe(0);
        });

        it('should charge normal price when cart total is below freeAbove', async () => {
            const methods = [
                createMockShippingMethod({ price: 5000, freeAbove: 50000 }),
            ];
            prisma.shippingMethod.findMany.mockResolvedValue(methods);

            const result = await service.getAvailableForCart('store-1', 30000);

            expect(result[0].isFree).toBe(false);
            expect(result[0].calculatedPrice).toBe(5000);
        });

        it('should handle methods without freeAbove threshold', async () => {
            const methods = [
                createMockShippingMethod({ price: 5000, freeAbove: null }),
            ];
            prisma.shippingMethod.findMany.mockResolvedValue(methods);

            const result = await service.getAvailableForCart('store-1', 999999);

            expect(result[0].isFree).toBe(false);
            expect(result[0].calculatedPrice).toBe(5000);
        });

        it('should format delivery estimate for range (minDays-maxDays)', async () => {
            const methods = [
                createMockShippingMethod({ minDays: 3, maxDays: 5 }),
            ];
            prisma.shippingMethod.findMany.mockResolvedValue(methods);

            const result = await service.getAvailableForCart('store-1', 100);

            expect(result[0].deliveryEstimate).toBe('3-5 días');
        });

        it('should format delivery estimate when minDays equals maxDays', async () => {
            const methods = [
                createMockShippingMethod({ minDays: 2, maxDays: 2 }),
            ];
            prisma.shippingMethod.findMany.mockResolvedValue(methods);

            const result = await service.getAvailableForCart('store-1', 100);

            expect(result[0].deliveryEstimate).toBe('2 días');
        });

        it('should format delivery estimate with only minDays', async () => {
            const methods = [
                createMockShippingMethod({ minDays: 5, maxDays: null }),
            ];
            prisma.shippingMethod.findMany.mockResolvedValue(methods);

            const result = await service.getAvailableForCart('store-1', 100);

            expect(result[0].deliveryEstimate).toBe('5+ días');
        });

        it('should format delivery estimate with only maxDays', async () => {
            const methods = [
                createMockShippingMethod({ minDays: null, maxDays: 7 }),
            ];
            prisma.shippingMethod.findMany.mockResolvedValue(methods);

            const result = await service.getAvailableForCart('store-1', 100);

            expect(result[0].deliveryEstimate).toBe('Hasta 7 días');
        });

        it('should return null deliveryEstimate when no days set', async () => {
            const methods = [
                createMockShippingMethod({ minDays: null, maxDays: null }),
            ];
            prisma.shippingMethod.findMany.mockResolvedValue(methods);

            const result = await service.getAvailableForCart('store-1', 100);

            expect(result[0].deliveryEstimate).toBeNull();
        });
    });

    // ─── REORDER ─────────────────────────────────────────────
    describe('reorder', () => {
        it('should update positions in transaction', async () => {
            prisma.$transaction.mockImplementation((updates) => Promise.resolve(updates));
            prisma.shippingMethod.findMany.mockResolvedValue([]);

            await service.reorder('store-1', ['id-a', 'id-b', 'id-c']);

            expect(prisma.$transaction).toHaveBeenCalled();
        });
    });
});
