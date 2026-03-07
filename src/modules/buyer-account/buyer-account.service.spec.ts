import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BuyerAccountService } from './buyer-account.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import {
    createMockStoreCustomerProfile,
    createMockBuyerAddress,
    createMockOrder,
} from '../../test/test-helpers';

// Mock BuyerUser shape returned by prisma.buyerUser.findUnique
function createMockBuyerUser(overrides: Record<string, any> = {}) {
    return {
        id: 'buyer-1',
        email: 'buyer@test.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+595991234567',
        ...overrides,
    };
}

describe('BuyerAccountService', () => {
    let service: BuyerAccountService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BuyerAccountService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<BuyerAccountService>(BuyerAccountService);
    });

    afterEach(() => jest.clearAllMocks());

    // ─── GET OR CREATE PROFILE ───────────────────────────────
    describe('getOrCreateProfile', () => {
        it('should return existing profile', async () => {
            const profile = createMockStoreCustomerProfile();
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);

            const result = await service.getOrCreateProfile('buyer-1', 'store-1');

            expect(result).toEqual(profile);
            expect(prisma.storeCustomerProfile.findUnique).toHaveBeenCalledWith({
                where: { buyerUserId_storeId: { buyerUserId: 'buyer-1', storeId: 'store-1' } },
            });
            expect(prisma.storeCustomerProfile.create).not.toHaveBeenCalled();
        });

        it('should return null when profile not found', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(null);

            const result = await service.getOrCreateProfile('buyer-1', 'store-1');

            expect(result).toBeNull();
            expect(prisma.storeCustomerProfile.create).not.toHaveBeenCalled();
        });
    });

    // ─── GET PROFILE WITH USER ───────────────────────────────
    describe('getProfileWithUser', () => {
        it('should return buyer user data merged with store profile stats', async () => {
            const profile = createMockStoreCustomerProfile({
                ordersCount: 5,
                totalSpent: 50000,
            });
            const buyerUser = createMockBuyerUser();

            prisma.buyerUser.findUnique.mockResolvedValue(buyerUser);
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);

            const result = await service.getProfileWithUser('buyer-1', 'store-1');

            expect(result.email).toBe('buyer@test.com');
            expect(result.firstName).toBe('Juan');
            expect(result.lastName).toBe('Pérez');
            expect(result.phone).toBe('+595991234567');
            expect(result.storeProfile!.ordersCount).toBe(5);
            expect(result.storeProfile!.totalSpent).toBe(50000);
        });

        it('should return storeProfile: null when profile is missing', async () => {
            const buyerUser = createMockBuyerUser();

            prisma.buyerUser.findUnique.mockResolvedValue(buyerUser);
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(null);

            const result = await service.getProfileWithUser('buyer-1', 'store-1');

            expect(result.storeProfile).toBeNull();
            expect(prisma.storeCustomerProfile.create).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when buyer user not found', async () => {
            prisma.buyerUser.findUnique.mockResolvedValue(null);

            await expect(
                service.getProfileWithUser('buyer-1', 'store-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should query buyerUser with selected fields', async () => {
            prisma.buyerUser.findUnique.mockResolvedValue(createMockBuyerUser());
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());

            await service.getProfileWithUser('buyer-1', 'store-1');

            expect(prisma.buyerUser.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                }),
            );
        });
    });

    // ─── UPDATE PROFILE ──────────────────────────────────────
    describe('updateProfile', () => {
        it('should update firstName', async () => {
            const updated = createMockBuyerUser({ firstName: 'New' });
            prisma.buyerUser.update.mockResolvedValue(updated);

            const result = await service.updateProfile('buyer-1', { firstName: 'New' });

            expect(result.firstName).toBe('New');
            expect(prisma.buyerUser.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'buyer-1' },
                    data: { firstName: 'New' },
                }),
            );
        });

        it('should update lastName', async () => {
            prisma.buyerUser.update.mockResolvedValue(createMockBuyerUser({ lastName: 'García' }));

            await service.updateProfile('buyer-1', { lastName: 'García' });

            expect(prisma.buyerUser.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { lastName: 'García' },
                }),
            );
        });

        it('should update phone without querying current user', async () => {
            prisma.buyerUser.update.mockResolvedValue(createMockBuyerUser({ phone: '+595991000000' }));

            await service.updateProfile('buyer-1', { phone: '+595991000000' });

            expect(prisma.buyerUser.findUnique).not.toHaveBeenCalled();
            expect(prisma.buyerUser.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { phone: '+595991000000' },
                }),
            );
        });

        it('should update multiple fields at once', async () => {
            prisma.buyerUser.update.mockResolvedValue(createMockBuyerUser());

            await service.updateProfile('buyer-1', {
                firstName: 'Juan',
                lastName: 'Pérez',
                phone: '+595991000000',
            });

            expect(prisma.buyerUser.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        firstName: 'Juan',
                        lastName: 'Pérez',
                        phone: '+595991000000',
                    }),
                }),
            );
        });
    });

    // ─── ADDRESSES — GET ─────────────────────────────────────
    describe('getAddresses', () => {
        it('should return addresses from profile include', async () => {
            const addresses = [
                createMockBuyerAddress({ isDefault: true }),
                createMockBuyerAddress({ id: 'addr-2', isDefault: false }),
            ];
            const profile = { ...createMockStoreCustomerProfile(), buyerAddresses: addresses };

            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);

            const result = await service.getAddresses('buyer-1', 'store-1');

            expect(result).toHaveLength(2);
            expect(prisma.buyerAddress.findMany).not.toHaveBeenCalled();
        });

        it('should return empty array when no profile exists', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(null);

            const result = await service.getAddresses('buyer-1', 'store-1');

            expect(result).toHaveLength(0);
        });
    });

    // ─── ADDRESSES — CREATE ──────────────────────────────────
    describe('createAddress', () => {
        const addressDto = {
            firstName: 'Juan',
            lastName: 'Pérez',
            address1: 'Av. España 1234',
            city: 'Asunción',
            state: 'Central',
            postalCode: '1234',
            country: 'Paraguay',
            isDefault: true,
        };

        it('should unset other defaults when creating with isDefault=true', async () => {
            const profile = createMockStoreCustomerProfile();
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.buyerAddress.updateMany.mockResolvedValue({ count: 1 });
            prisma.buyerAddress.create.mockResolvedValue(createMockBuyerAddress());

            await service.createAddress('buyer-1', 'store-1', addressDto);

            expect(prisma.buyerAddress.updateMany).toHaveBeenCalledWith({
                where: { profileId: profile.id },
                data: { isDefault: false },
            });
        });

        it('should NOT unset defaults when isDefault is false', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.buyerAddress.create.mockResolvedValue(createMockBuyerAddress({ isDefault: false }));

            await service.createAddress('buyer-1', 'store-1', { ...addressDto, isDefault: false });

            expect(prisma.buyerAddress.updateMany).not.toHaveBeenCalled();
        });

        it('should link address to the correct profile', async () => {
            const profile = createMockStoreCustomerProfile({ id: 'profile-99' });
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.buyerAddress.create.mockResolvedValue(createMockBuyerAddress());

            await service.createAddress('buyer-1', 'store-1', { ...addressDto, isDefault: false });

            expect(prisma.buyerAddress.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ profileId: 'profile-99' }),
            });
        });

        it('should throw NotFoundException when profile not found', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(null);

            await expect(
                service.createAddress('buyer-1', 'store-1', addressDto),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ─── ADDRESSES — UPDATE ──────────────────────────────────
    describe('updateAddress', () => {
        it('should update existing address fields', async () => {
            const profile = createMockStoreCustomerProfile();
            const address = createMockBuyerAddress();
            const updated = createMockBuyerAddress({ city: 'Encarnación' });

            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.buyerAddress.findFirst.mockResolvedValue(address);
            prisma.buyerAddress.update.mockResolvedValue(updated);

            const result = await service.updateAddress('buyer-1', 'store-1', 'addr-1', { city: 'Encarnación' });

            expect(result.city).toBe('Encarnación');
        });

        it('should throw NotFoundException when address not owned by profile', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.buyerAddress.findFirst.mockResolvedValue(null);

            await expect(
                service.updateAddress('buyer-1', 'store-1', 'nonexistent', { city: 'X' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('should unset other defaults when setting isDefault=true', async () => {
            const profile = createMockStoreCustomerProfile();
            const address = createMockBuyerAddress({ id: 'addr-2', isDefault: false });

            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.buyerAddress.findFirst.mockResolvedValue(address);
            prisma.buyerAddress.updateMany.mockResolvedValue({ count: 1 });
            prisma.buyerAddress.update.mockResolvedValue({ ...address, isDefault: true });

            await service.updateAddress('buyer-1', 'store-1', 'addr-2', { isDefault: true });

            expect(prisma.buyerAddress.updateMany).toHaveBeenCalledWith({
                where: { profileId: profile.id, id: { not: 'addr-2' } },
                data: { isDefault: false },
            });
        });
    });

    // ─── ADDRESSES — DELETE ──────────────────────────────────
    describe('deleteAddress', () => {
        it('should delete address that belongs to profile', async () => {
            const profile = createMockStoreCustomerProfile();
            const address = createMockBuyerAddress();

            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.buyerAddress.findFirst.mockResolvedValue(address);
            prisma.buyerAddress.delete.mockResolvedValue(address);

            const result = await service.deleteAddress('buyer-1', 'store-1', 'addr-1');

            expect(result.message).toBe('Dirección eliminada');
            expect(prisma.buyerAddress.delete).toHaveBeenCalledWith({
                where: { id: 'addr-1' },
            });
        });

        it('should throw NotFoundException when address not found', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.buyerAddress.findFirst.mockResolvedValue(null);

            await expect(
                service.deleteAddress('buyer-1', 'store-1', 'nonexistent'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ─── ORDERS — LIST ───────────────────────────────────────
    describe('getOrders', () => {
        it('should return paginated orders with itemsCount and pagination meta', async () => {
            const customer = { id: 'cust-1', email: 'buyer@test.com', storeId: 'store-1', buyerUserId: 'buyer-1' };
            const orders = [
                { ...createMockOrder(), total: 15000, items: [{ id: 'i1' }, { id: 'i2' }] },
            ];

            prisma.customer.findFirst.mockResolvedValue(customer);
            prisma.order.findMany.mockResolvedValue(orders);
            prisma.order.count.mockResolvedValue(1);

            const result = await service.getOrders('buyer-1', 'store-1', 1, 10);

            expect(result.orders).toHaveLength(1);
            expect(result.orders[0].itemsCount).toBe(2);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            });
        });

        it('should return empty orders when no customer record exists', async () => {
            prisma.customer.findFirst.mockResolvedValue(null);

            const result = await service.getOrders('buyer-1', 'store-1', 1, 10);

            expect(result.orders).toEqual([]);
            expect(result.pagination.total).toBe(0);
            expect(prisma.order.findMany).not.toHaveBeenCalled();
        });

        it('should calculate correct skip/take for page 2', async () => {
            const customer = { id: 'cust-1', email: 'buyer@test.com' };
            prisma.customer.findFirst.mockResolvedValue(customer);
            prisma.order.findMany.mockResolvedValue([]);
            prisma.order.count.mockResolvedValue(15);

            const result = await service.getOrders('buyer-1', 'store-1', 2, 10);

            expect(result.pagination.totalPages).toBe(2);
            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 10, take: 10 }),
            );
        });

        it('should filter orders by storeId and customerEmail', async () => {
            const customer = { id: 'cust-1', email: 'buyer@test.com' };
            prisma.customer.findFirst.mockResolvedValue(customer);
            prisma.order.findMany.mockResolvedValue([]);
            prisma.order.count.mockResolvedValue(0);

            await service.getOrders('buyer-1', 'store-1');

            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        storeId: 'store-1',
                        customerEmail: 'buyer@test.com',
                    }),
                }),
            );
        });
    });

    // ─── ORDERS — DETAIL ─────────────────────────────────────
    describe('getOrderDetail', () => {
        const mockOrderDetail = {
            id: 'order-1',
            orderNumber: 'ORD-001',
            status: 'PENDING',
            paymentStatus: 'PENDING',
            subtotal: 10000,
            shippingTotal: 5000,
            discountTotal: 0,
            taxTotal: 1000,
            total: 16000,
            shippingAddress: { city: 'Asunción' },
            shippingMethodName: 'Standard',
            createdAt: new Date(),
            paidAt: null,
            shippedAt: null,
            deliveredAt: null,
            trackingNumber: null,
            trackingUrl: null,
            items: [
                {
                    name: 'Product A',
                    sku: 'SKU-001',
                    quantity: 2,
                    unitPrice: 5000,
                    totalPrice: 10000,
                    imageUrl: 'https://example.com/img.jpg',
                    product: { images: [{ url: 'https://example.com/fallback.jpg' }] },
                },
            ],
        };

        it('should return formatted order detail', async () => {
            const customer = { id: 'cust-1', email: 'buyer@test.com' };
            prisma.customer.findFirst.mockResolvedValue(customer);
            prisma.order.findFirst.mockResolvedValue(mockOrderDetail);

            const result = await service.getOrderDetail('buyer-1', 'store-1', 'order-1');

            expect(result.orderNumber).toBe('ORD-001');
            expect(result.items).toHaveLength(1);
            expect(result.items[0].unitPrice).toBe(5000);
            expect(result.items[0].image).toBe('https://example.com/img.jpg');
            expect(result.total).toBe(16000);
        });

        it('should throw NotFoundException when customer not found', async () => {
            prisma.customer.findFirst.mockResolvedValue(null);

            await expect(
                service.getOrderDetail('buyer-1', 'store-1', 'order-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException when order not found', async () => {
            const customer = { id: 'cust-1', email: 'buyer@test.com' };
            prisma.customer.findFirst.mockResolvedValue(customer);
            prisma.order.findFirst.mockResolvedValue(null);

            await expect(
                service.getOrderDetail('buyer-1', 'store-1', 'nonexistent'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should use product image as fallback when item imageUrl is null', async () => {
            const orderNoImg = {
                ...mockOrderDetail,
                items: [{
                    name: 'Product B',
                    sku: 'SKU-002',
                    quantity: 1,
                    unitPrice: 5000,
                    totalPrice: 5000,
                    imageUrl: null,
                    product: { images: [{ url: 'https://example.com/product.jpg' }] },
                }],
            };

            const customer = { id: 'cust-1', email: 'buyer@test.com' };
            prisma.customer.findFirst.mockResolvedValue(customer);
            prisma.order.findFirst.mockResolvedValue(orderNoImg);

            const result = await service.getOrderDetail('buyer-1', 'store-1', 'order-1');

            expect(result.items[0].image).toBe('https://example.com/product.jpg');
        });

        it('should filter order by storeId and customerEmail', async () => {
            const customer = { id: 'cust-1', email: 'buyer@test.com' };
            prisma.customer.findFirst.mockResolvedValue(customer);
            prisma.order.findFirst.mockResolvedValue(mockOrderDetail);

            await service.getOrderDetail('buyer-1', 'store-1', 'order-1');

            expect(prisma.order.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        id: 'order-1',
                        storeId: 'store-1',
                        customerEmail: 'buyer@test.com',
                    }),
                }),
            );
        });
    });
});
