import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockCoupon } from '../../test/test-helpers';

describe('CouponsService', () => {
    let service: CouponsService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CouponsService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<CouponsService>(CouponsService);
    });

    afterEach(() => jest.clearAllMocks());

    // ─── CREATE ──────────────────────────────────────────────
    describe('create', () => {
        it('should create a coupon with uppercase code', async () => {
            prisma.coupon.findFirst.mockResolvedValue(null);
            prisma.coupon.create.mockResolvedValue(createMockCoupon());

            await service.create('store-1', {
                code: 'save10',
                type: 'PERCENTAGE' as any,
                value: 10,
            } as any);

            expect(prisma.coupon.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ code: 'SAVE10' }),
                }),
            );
        });

        it('should throw ConflictException for duplicate code', async () => {
            prisma.coupon.findFirst.mockResolvedValue(createMockCoupon());

            await expect(
                service.create('store-1', { code: 'SAVE10', type: 'PERCENTAGE', value: 10 } as any),
            ).rejects.toThrow(ConflictException);
        });
    });

    // ─── FIND ────────────────────────────────────────────────
    describe('findOne', () => {
        it('should return coupon when found', async () => {
            const coupon = createMockCoupon();
            prisma.coupon.findFirst.mockResolvedValue(coupon);

            const result = await service.findOne('store-1', 'coupon-1');
            expect(result).toEqual(coupon);
        });

        it('should throw NotFoundException when coupon not found', async () => {
            prisma.coupon.findFirst.mockResolvedValue(null);

            await expect(service.findOne('store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ─── CALCULATE DISCOUNT (Pure Logic) ─────────────────────
    describe('calculateDiscount', () => {
        it('should calculate percentage discount correctly', () => {
            const coupon = createMockCoupon({ type: 'PERCENTAGE', value: 10 });
            const result = (service as any).calculateDiscount(coupon, 200);
            expect(result).toBe(20);
        });

        it('should cap percentage discount at maxDiscountAmount', () => {
            const coupon = createMockCoupon({
                type: 'PERCENTAGE',
                value: 50,
                maxDiscountAmount: 25,
            });
            const result = (service as any).calculateDiscount(coupon, 200);
            expect(result).toBe(25);
        });

        it('should calculate fixed amount discount', () => {
            const coupon = createMockCoupon({ type: 'FIXED_AMOUNT', value: 15 });
            const result = (service as any).calculateDiscount(coupon, 200);
            expect(result).toBe(15);
        });

        it('should not exceed cart total for fixed discount', () => {
            const coupon = createMockCoupon({ type: 'FIXED_AMOUNT', value: 500 });
            const result = (service as any).calculateDiscount(coupon, 200);
            expect(result).toBe(200);
        });

        it('should return 0 for FREE_SHIPPING type', () => {
            const coupon = createMockCoupon({ type: 'FREE_SHIPPING', value: 0 });
            const result = (service as any).calculateDiscount(coupon, 200);
            expect(result).toBe(0);
        });

        it('should return 0 for unknown type', () => {
            const coupon = createMockCoupon({ type: 'UNKNOWN', value: 10 });
            const result = (service as any).calculateDiscount(coupon, 200);
            expect(result).toBe(0);
        });
    });

    // ─── VALIDATE (Business Rules) ──────────────────────────
    describe('validate', () => {
        it('should validate a valid percentage coupon', async () => {
            const coupon = createMockCoupon({ type: 'PERCENTAGE', value: 10, isActive: true });
            prisma.coupon.findFirst.mockResolvedValue(coupon);

            const result = await service.validate('store-1', { code: 'SAVE10', cartTotal: 100 });
            expect(result.valid).toBe(true);
            expect(result.discount).toBe(10);
        });

        it('should throw for non-existent coupon', async () => {
            prisma.coupon.findFirst.mockResolvedValue(null);

            await expect(
                service.validate('store-1', { code: 'FAKE', cartTotal: 100 }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw for inactive coupon', async () => {
            prisma.coupon.findFirst.mockResolvedValue(createMockCoupon({ isActive: false }));

            await expect(
                service.validate('store-1', { code: 'SAVE10', cartTotal: 100 }),
            ).rejects.toThrow('Cupón no está activo');
        });

        it('should throw for not-yet-valid coupon', async () => {
            const futureDate = new Date('2099-01-01');
            prisma.coupon.findFirst.mockResolvedValue(createMockCoupon({ startsAt: futureDate }));

            await expect(
                service.validate('store-1', { code: 'SAVE10', cartTotal: 100 }),
            ).rejects.toThrow('Cupón aún no es válido');
        });

        it('should throw for expired coupon', async () => {
            const pastDate = new Date('2020-01-01');
            prisma.coupon.findFirst.mockResolvedValue(createMockCoupon({ expiresAt: pastDate }));

            await expect(
                service.validate('store-1', { code: 'SAVE10', cartTotal: 100 }),
            ).rejects.toThrow('Cupón expirado');
        });

        it('should throw when usage limit reached', async () => {
            prisma.coupon.findFirst.mockResolvedValue(
                createMockCoupon({ usageLimit: 5, usageCount: 5 }),
            );

            await expect(
                service.validate('store-1', { code: 'SAVE10', cartTotal: 100 }),
            ).rejects.toThrow('Cupón agotado');
        });

        it('should throw when cart total below minimum', async () => {
            prisma.coupon.findFirst.mockResolvedValue(
                createMockCoupon({ minPurchaseAmount: 200 }),
            );

            await expect(
                service.validate('store-1', { code: 'SAVE10', cartTotal: 50 }),
            ).rejects.toThrow(/Compra mínima requerida/);
        });
    });

    // ─── DISCOUNT MESSAGE ────────────────────────────────────
    describe('getDiscountMessage', () => {
        it('should format percentage message', () => {
            const coupon = createMockCoupon({ type: 'PERCENTAGE', value: 10 });
            const msg = (service as any).getDiscountMessage(coupon, 15);
            expect(msg).toContain('10%');
            expect(msg).toContain('$15.00');
        });

        it('should format fixed amount message', () => {
            const coupon = createMockCoupon({ type: 'FIXED_AMOUNT', value: 20 });
            const msg = (service as any).getDiscountMessage(coupon, 20);
            expect(msg).toContain('$20.00');
        });

        it('should format free shipping message', () => {
            const coupon = createMockCoupon({ type: 'FREE_SHIPPING' });
            const msg = (service as any).getDiscountMessage(coupon, 0);
            expect(msg).toContain('Envío gratis');
        });
    });

    // ─── INCREMENT USAGE ─────────────────────────────────────
    describe('incrementUsage', () => {
        it('should increment usage count by 1', async () => {
            prisma.coupon.update.mockResolvedValue(createMockCoupon({ usageCount: 1 }));

            await service.incrementUsage('coupon-1');

            expect(prisma.coupon.update).toHaveBeenCalledWith({
                where: { id: 'coupon-1' },
                data: { usageCount: { increment: 1 } },
            });
        });
    });
});
