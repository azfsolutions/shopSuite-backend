import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StorefrontOrdersService } from './storefront-orders.service';
import { PrismaService } from '../../../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const makeStore = (overrides = {}) => ({
    id: 'store-1',
    status: 'ACTIVE',
    name: 'Test Store',
    ...overrides,
});

const makeShippingMethod = (overrides = {}) => ({
    id: 'ship-1',
    storeId: 'store-1',
    name: 'Standard',
    price: new Decimal('5.00'),
    freeAbove: null,
    isActive: true,
    ...overrides,
});

const makeProduct = (overrides = {}) => ({
    id: 'prod-1',
    storeId: 'store-1',
    name: 'Widget',
    price: new Decimal('10.00'),
    sku: 'WID-001',
    stock: 100,
    trackInventory: true,
    status: 'ACTIVE',
    deletedAt: null,
    variants: [],
    images: [{ url: 'https://example.com/img.jpg' }],
    ...overrides,
});

const makeCoupon = (overrides = {}) => ({
    id: 'coupon-1',
    storeId: 'store-1',
    code: 'SAVE10',
    type: 'FIXED_AMOUNT',
    value: new Decimal('10.00'),
    minPurchaseAmount: null,
    maxDiscountAmount: null,
    usageLimit: null,
    usageCount: 0,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    deletedAt: null,
    ...overrides,
});

const makeCustomer = (overrides = {}) => ({
    id: 'cust-1',
    storeId: 'store-1',
    email: 'buyer@test.com',
    buyerUserId: null,
    ordersCount: 0,
    totalSpent: new Decimal('0'),
    ...overrides,
});

const makeOrder = (overrides = {}) => ({
    id: 'order-1',
    storeId: 'store-1',
    orderNumber: 'ORD-2600001',
    status: 'PENDING',
    total: new Decimal('15.00'),
    createdAt: new Date(),
    ...overrides,
});

const baseDto = {
    email: 'buyer@test.com',
    firstName: 'Jane',
    lastName: 'Doe',
    shippingAddress: {
        firstName: 'Jane',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'Asunción',
        state: 'Central',
        postalCode: '1000',
        country: 'Paraguay',
    },
    shippingMethodId: 'ship-1',
    items: [{ productId: 'prod-1', quantity: 1 }],
};

// ──────────────────────────────────────────────────────────────────────────────
// Mock Prisma
// ──────────────────────────────────────────────────────────────────────────────

function buildMockPrisma(overrides: Record<string, any> = {}) {
    const mockPrisma: any = {
        store: { findUnique: jest.fn().mockResolvedValue(makeStore()) },
        shippingMethod: { findFirst: jest.fn().mockResolvedValue(makeShippingMethod()) },
        product: {
            findMany: jest.fn().mockResolvedValue([makeProduct()]),
            update: jest.fn().mockResolvedValue({}),
        },
        coupon: {
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({}),
        },
        customer: {
            upsert: jest.fn().mockResolvedValue(makeCustomer()),
            update: jest.fn().mockResolvedValue({}),
        },
        storeCustomerProfile: {
            upsert: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
        },
        order: {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockResolvedValue(makeOrder()),
        },
        productVariant: { update: jest.fn().mockResolvedValue({}) },
        ...overrides,
    };

    // $transaction executes the callback immediately with the same mock
    mockPrisma.$transaction = jest.fn((cb: (tx: any) => Promise<any>) => cb(mockPrisma));

    return mockPrisma;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('StorefrontOrdersService', () => {
    let service: StorefrontOrdersService;
    let mockPrisma: ReturnType<typeof buildMockPrisma>;

    async function buildService(prismaOverrides = {}) {
        mockPrisma = buildMockPrisma(prismaOverrides);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StorefrontOrdersService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get<StorefrontOrdersService>(StorefrontOrdersService);
    }

    beforeEach(async () => {
        await buildService();
    });

    // ── Happy paths ───────────────────────────────────────────────────────────

    describe('createOrder — authenticated buyer', () => {
        it('should create order and update StoreCustomerProfile stats', async () => {
            const result = await service.createOrder('store-1', baseDto, 'user-1');

            expect(result).toMatchObject({
                orderNumber: 'ORD-2600001',
                status: 'PENDING',
            });

            // Customer upserted with buyerUserId
            expect(mockPrisma.customer.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: { buyerUserId: 'user-1' },
                    create: expect.objectContaining({ buyerUserId: 'user-1' }),
                }),
            );

            // StoreCustomerProfile upserted
            expect(mockPrisma.storeCustomerProfile.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { buyerUserId_storeId: { buyerUserId: 'user-1', storeId: 'store-1' } },
                }),
            );

            // StoreCustomerProfile stats updated
            expect(mockPrisma.storeCustomerProfile.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { buyerUserId_storeId: { buyerUserId: 'user-1', storeId: 'store-1' } },
                    data: expect.objectContaining({ ordersCount: { increment: 1 } }),
                }),
            );

            // Order has customerId
            expect(mockPrisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ customerId: 'cust-1' }),
                }),
            );
        });
    });

    describe('createOrder — guest buyer', () => {
        it('should create order without StoreCustomerProfile updates', async () => {
            const result = await service.createOrder('store-1', baseDto);

            expect(result.orderNumber).toBe('ORD-2600001');

            // Customer upserted without buyerUserId
            expect(mockPrisma.customer.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: {},
                    create: expect.objectContaining({ buyerUserId: null }),
                }),
            );

            // StoreCustomerProfile NOT upserted
            expect(mockPrisma.storeCustomerProfile.upsert).not.toHaveBeenCalled();
            expect(mockPrisma.storeCustomerProfile.update).not.toHaveBeenCalled();
        });
    });

    // ── Stock validation ──────────────────────────────────────────────────────

    it('should throw BadRequestException when product stock is insufficient', async () => {
        await buildService({
            product: {
                findMany: jest.fn().mockResolvedValue([
                    makeProduct({ stock: 0, trackInventory: true }),
                ]),
                update: jest.fn(),
            },
        });

        await expect(
            service.createOrder('store-1', { ...baseDto, items: [{ productId: 'prod-1', quantity: 5 }] }),
        ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when variant stock is insufficient', async () => {
        const product = makeProduct({
            variants: [
                {
                    id: 'var-1',
                    name: 'Red',
                    price: new Decimal('10.00'),
                    stock: 1,
                    trackInventory: true,
                    isActive: true,
                    sku: null,
                },
            ],
        });

        await buildService({
            product: { findMany: jest.fn().mockResolvedValue([product]), update: jest.fn() },
        });

        const dto = { ...baseDto, items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 10 }] };

        await expect(service.createOrder('store-1', dto)).rejects.toThrow(BadRequestException);
    });

    // ── Multi-tenancy: product from another store ─────────────────────────────

    it('should throw BadRequestException when product belongs to another store', async () => {
        await buildService({
            product: {
                // Returns fewer products than requested (one doesn't belong to this store)
                findMany: jest.fn().mockResolvedValue([]),
                update: jest.fn(),
            },
        });

        await expect(service.createOrder('store-1', baseDto)).rejects.toThrow(BadRequestException);
    });

    // ── Coupon validation ─────────────────────────────────────────────────────

    it('should throw BadRequestException for expired coupon', async () => {
        await buildService({
            coupon: {
                findFirst: jest.fn().mockResolvedValue(
                    makeCoupon({ expiresAt: new Date('2000-01-01') }),
                ),
                update: jest.fn(),
            },
        });

        const dto = { ...baseDto, couponCode: 'SAVE10' };
        await expect(service.createOrder('store-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when coupon usage limit is reached', async () => {
        await buildService({
            coupon: {
                findFirst: jest.fn().mockResolvedValue(
                    makeCoupon({ usageLimit: 5, usageCount: 5 }),
                ),
                update: jest.fn(),
            },
        });

        const dto = { ...baseDto, couponCode: 'SAVE10' };
        await expect(service.createOrder('store-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for coupon from another store (not found)', async () => {
        await buildService({
            coupon: {
                findFirst: jest.fn().mockResolvedValue(null),
                update: jest.fn(),
            },
        });

        const dto = { ...baseDto, couponCode: 'OTHERCOUPON' };
        await expect(service.createOrder('store-1', dto)).rejects.toThrow(BadRequestException);
    });

    // ── Discount calculations ─────────────────────────────────────────────────

    it('should apply PERCENTAGE discount with maxDiscountAmount cap', async () => {
        const capturedOrderData: any = {};
        await buildService({
            coupon: {
                findFirst: jest.fn().mockResolvedValue(
                    makeCoupon({
                        type: 'PERCENTAGE',
                        value: new Decimal('50'), // 50%
                        maxDiscountAmount: new Decimal('3.00'), // cap at $3
                    }),
                ),
                update: jest.fn(),
            },
            order: {
                count: jest.fn().mockResolvedValue(0),
                create: jest.fn().mockImplementation(({ data }) => {
                    Object.assign(capturedOrderData, data);
                    return makeOrder({ total: data.total });
                }),
            },
        });

        const dto = { ...baseDto, couponCode: 'SAVE10' };
        await service.createOrder('store-1', dto);

        // subtotal = 10, 50% = 5 but capped at 3 → discountTotal = 3
        expect(Number(capturedOrderData.discountTotal)).toBe(3);
        // total = 10 - 3 + 5 (shipping) = 12
        expect(Number(capturedOrderData.total)).toBe(12);
    });

    it('should apply FIXED_AMOUNT discount', async () => {
        const capturedOrderData: any = {};
        await buildService({
            coupon: {
                findFirst: jest.fn().mockResolvedValue(makeCoupon({ type: 'FIXED_AMOUNT', value: new Decimal('4.00') })),
                update: jest.fn(),
            },
            order: {
                count: jest.fn().mockResolvedValue(0),
                create: jest.fn().mockImplementation(({ data }) => {
                    Object.assign(capturedOrderData, data);
                    return makeOrder({ total: data.total });
                }),
            },
        });

        await service.createOrder('store-1', { ...baseDto, couponCode: 'SAVE10' });
        // subtotal=10, discount=4, shipping=5 → total=11
        expect(Number(capturedOrderData.discountTotal)).toBe(4);
        expect(Number(capturedOrderData.total)).toBe(11);
    });

    it('should apply FREE_SHIPPING coupon', async () => {
        const capturedOrderData: any = {};
        await buildService({
            coupon: {
                findFirst: jest.fn().mockResolvedValue(makeCoupon({ type: 'FREE_SHIPPING', value: new Decimal('0') })),
                update: jest.fn(),
            },
            order: {
                count: jest.fn().mockResolvedValue(0),
                create: jest.fn().mockImplementation(({ data }) => {
                    Object.assign(capturedOrderData, data);
                    return makeOrder({ total: data.total });
                }),
            },
        });

        await service.createOrder('store-1', { ...baseDto, couponCode: 'FREESHIP' });
        // subtotal=10, discount=0, shipping=0 → total=10
        expect(Number(capturedOrderData.shippingTotal)).toBe(0);
        expect(Number(capturedOrderData.total)).toBe(10);
    });

    // ── Inactive store ────────────────────────────────────────────────────────

    it('should throw NotFoundException when store is not ACTIVE', async () => {
        await buildService({
            store: { findUnique: jest.fn().mockResolvedValue(makeStore({ status: 'SUSPENDED' })) },
        });

        await expect(service.createOrder('store-1', baseDto)).rejects.toThrow(NotFoundException);
    });

    // ── Transaction rollback propagation ─────────────────────────────────────

    it('should propagate errors to caller (enabling rollback)', async () => {
        await buildService({
            product: {
                findMany: jest.fn().mockRejectedValue(new Error('DB connection lost')),
                update: jest.fn(),
            },
        });

        await expect(service.createOrder('store-1', baseDto)).rejects.toThrow('DB connection lost');
    });
});
