import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BuyerAccountService } from './buyer-account.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import {
    createMockUser,
    createMockStoreCustomerProfile,
    createMockBuyerAddress,
    createMockOrder,
} from '../../test/test-helpers';

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

            const result = await service.getOrCreateProfile('user-1', 'store-1');

            expect(result).toEqual(profile);
            expect(prisma.storeCustomerProfile.findUnique).toHaveBeenCalledWith({
                where: { userId_storeId: { userId: 'user-1', storeId: 'store-1' } },
            });
            expect(prisma.storeCustomerProfile.create).not.toHaveBeenCalled();
        });

        it('should create profile when not found', async () => {
            const newProfile = createMockStoreCustomerProfile();
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(null);
            prisma.storeCustomerProfile.create.mockResolvedValue(newProfile);

            const result = await service.getOrCreateProfile('user-1', 'store-1');

            expect(result).toEqual(newProfile);
            expect(prisma.storeCustomerProfile.create).toHaveBeenCalledWith({
                data: { userId: 'user-1', storeId: 'store-1' },
            });
        });
    });

    // ─── GET PROFILE WITH USER ───────────────────────────────
    describe('getProfileWithUser', () => {
        it('should return user data merged with store profile stats', async () => {
            const profile = createMockStoreCustomerProfile({
                ordersCount: 5,
                totalSpent: 50000,
            });
            const user = createMockUser({
                email: 'buyer@test.com',
                firstName: 'Juan',
                lastName: 'Pérez',
                phone: '+595991234567',
            });

            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.user.findUnique.mockResolvedValue(user);

            const result = await service.getProfileWithUser('user-1', 'store-1');

            expect(result.email).toBe('buyer@test.com');
            expect(result.firstName).toBe('Juan');
            expect(result.lastName).toBe('Pérez');
            expect(result.phone).toBe('+595991234567');
            expect(result.storeProfile!.ordersCount).toBe(5);
            expect(result.storeProfile!.totalSpent).toBe(50000);
        });

        it('should auto-create profile if missing and still return data', async () => {
            const profile = createMockStoreCustomerProfile();
            const user = createMockUser();

            prisma.storeCustomerProfile.findUnique.mockResolvedValue(null);
            prisma.storeCustomerProfile.create.mockResolvedValue(profile);
            prisma.user.findUnique.mockResolvedValue(user);

            const result = await service.getProfileWithUser('user-1', 'store-1');

            expect(result.storeProfile).toBeDefined();
            expect(prisma.storeCustomerProfile.create).toHaveBeenCalled();
        });

        it('should select only necessary user fields', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.user.findUnique.mockResolvedValue(createMockUser());

            await service.getProfileWithUser('user-1', 'store-1');

            expect(prisma.user.findUnique).toHaveBeenCalledWith(
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
        it('should update firstName and sync name field', async () => {
            const currentUser = createMockUser({ firstName: 'Old', lastName: 'User' });
            const updatedUser = createMockUser({ firstName: 'New', name: 'New User' });

            prisma.user.findUnique.mockResolvedValue(currentUser);
            prisma.user.update.mockResolvedValue(updatedUser);

            const result = await service.updateProfile('user-1', { firstName: 'New' });

            expect(result.firstName).toBe('New');
            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        firstName: 'New',
                        name: 'New User',
                    }),
                }),
            );
        });

        it('should update lastName and sync name using existing firstName', async () => {
            const currentUser = createMockUser({ firstName: 'Test', lastName: 'Old' });
            prisma.user.findUnique.mockResolvedValue(currentUser);
            prisma.user.update.mockResolvedValue(createMockUser({ lastName: 'Pérez' }));

            await service.updateProfile('user-1', { lastName: 'Pérez' });

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        lastName: 'Pérez',
                        name: 'Test Pérez',
                    }),
                }),
            );
        });

        it('should update phone without querying for current user', async () => {
            prisma.user.update.mockResolvedValue(createMockUser({ phone: '+595991000000' }));

            await service.updateProfile('user-1', { phone: '+595991000000' });

            expect(prisma.user.findUnique).not.toHaveBeenCalled();
            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { phone: '+595991000000' },
                }),
            );
        });

        it('should handle all fields updated together', async () => {
            const currentUser = createMockUser();
            prisma.user.findUnique.mockResolvedValue(currentUser);
            prisma.user.update.mockResolvedValue(createMockUser());

            await service.updateProfile('user-1', {
                firstName: 'Juan',
                lastName: 'Pérez',
                phone: '+595991000000',
            });

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        firstName: 'Juan',
                        lastName: 'Pérez',
                        phone: '+595991000000',
                        name: 'Juan Pérez',
                    }),
                }),
            );
        });
    });

    // ─── ADDRESSES — GET ─────────────────────────────────────
    describe('getAddresses', () => {
        it('should return addresses ordered by default first, then by date', async () => {
            const profile = createMockStoreCustomerProfile();
            const addresses = [
                createMockBuyerAddress({ isDefault: true }),
                createMockBuyerAddress({ id: 'addr-2', isDefault: false }),
            ];

            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.buyerAddress.findMany.mockResolvedValue(addresses);

            const result = await service.getAddresses('user-1', 'store-1');

            expect(result).toHaveLength(2);
            expect(prisma.buyerAddress.findMany).toHaveBeenCalledWith({
                where: { profileId: profile.id },
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
            });
        });

        it('should return empty array when no addresses', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.buyerAddress.findMany.mockResolvedValue([]);

            const result = await service.getAddresses('user-1', 'store-1');

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

            await service.createAddress('user-1', 'store-1', addressDto);

            expect(prisma.buyerAddress.updateMany).toHaveBeenCalledWith({
                where: { profileId: profile.id },
                data: { isDefault: false },
            });
        });

        it('should NOT unset defaults when isDefault is false/undefined', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.buyerAddress.create.mockResolvedValue(createMockBuyerAddress({ isDefault: false }));

            await service.createAddress('user-1', 'store-1', { ...addressDto, isDefault: false });

            expect(prisma.buyerAddress.updateMany).not.toHaveBeenCalled();
        });

        it('should link address to the correct profile', async () => {
            const profile = createMockStoreCustomerProfile({ id: 'profile-99' });
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.buyerAddress.create.mockResolvedValue(createMockBuyerAddress());

            await service.createAddress('user-1', 'store-1', { ...addressDto, isDefault: false });

            expect(prisma.buyerAddress.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ profileId: 'profile-99' }),
            });
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

            const result = await service.updateAddress('user-1', 'store-1', 'addr-1', { city: 'Encarnación' });

            expect(result.city).toBe('Encarnación');
        });

        it('should throw NotFoundException when address not owned by profile', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.buyerAddress.findFirst.mockResolvedValue(null);

            await expect(
                service.updateAddress('user-1', 'store-1', 'nonexistent', { city: 'X' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('should unset other defaults when setting isDefault=true', async () => {
            const profile = createMockStoreCustomerProfile();
            const address = createMockBuyerAddress({ id: 'addr-2', isDefault: false });

            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.buyerAddress.findFirst.mockResolvedValue(address);
            prisma.buyerAddress.updateMany.mockResolvedValue({ count: 1 });
            prisma.buyerAddress.update.mockResolvedValue({ ...address, isDefault: true });

            await service.updateAddress('user-1', 'store-1', 'addr-2', { isDefault: true });

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

            const result = await service.deleteAddress('user-1', 'store-1', 'addr-1');

            expect(result.message).toBe('Dirección eliminada');
            expect(prisma.buyerAddress.delete).toHaveBeenCalledWith({
                where: { id: 'addr-1' },
            });
        });

        it('should throw NotFoundException when address not found', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.buyerAddress.findFirst.mockResolvedValue(null);

            await expect(
                service.deleteAddress('user-1', 'store-1', 'nonexistent'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ─── ORDERS — LIST ───────────────────────────────────────
    describe('getOrders', () => {
        it('should return paginated orders with itemsCount and pagination meta', async () => {
            const profile = createMockStoreCustomerProfile();
            const orders = [
                { ...createMockOrder(), total: 15000, items: [{ id: 'i1' }, { id: 'i2' }] },
            ];

            prisma.storeCustomerProfile.findUnique.mockResolvedValue(profile);
            prisma.user.findUnique.mockResolvedValue(createMockUser({ email: 'buyer@test.com' }));
            prisma.order.findMany.mockResolvedValue(orders);
            prisma.order.count.mockResolvedValue(1);

            const result = await service.getOrders('user-1', 'store-1', 1, 10);

            expect(result.orders).toHaveLength(1);
            expect(result.orders[0].itemsCount).toBe(2);
            expect(result.orders[0].total).toBe(15000);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            });
        });

        it('should calculate correct skip/take for page 2', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.user.findUnique.mockResolvedValue(createMockUser({ email: 'buyer@test.com' }));
            prisma.order.findMany.mockResolvedValue([]);
            prisma.order.count.mockResolvedValue(15);

            const result = await service.getOrders('user-1', 'store-1', 2, 10);

            expect(result.pagination.totalPages).toBe(2);
            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 10, take: 10 }),
            );
        });

        it('should filter by storeId and customerEmail', async () => {
            prisma.storeCustomerProfile.findUnique.mockResolvedValue(createMockStoreCustomerProfile());
            prisma.user.findUnique.mockResolvedValue(createMockUser({ email: 'buyer@test.com' }));
            prisma.order.findMany.mockResolvedValue([]);
            prisma.order.count.mockResolvedValue(0);

            await service.getOrders('user-1', 'store-1');

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
            prisma.user.findUnique.mockResolvedValue(createMockUser({ email: 'buyer@test.com' }));
            prisma.order.findFirst.mockResolvedValue(mockOrderDetail);

            const result = await service.getOrderDetail('user-1', 'store-1', 'order-1');

            expect(result.orderNumber).toBe('ORD-001');
            expect(result.items).toHaveLength(1);
            expect(result.items[0].unitPrice).toBe(5000);
            expect(result.items[0].image).toBe('https://example.com/img.jpg');
            expect(result.total).toBe(16000);
        });

        it('should throw NotFoundException when order not found', async () => {
            prisma.user.findUnique.mockResolvedValue(createMockUser({ email: 'buyer@test.com' }));
            prisma.order.findFirst.mockResolvedValue(null);

            await expect(
                service.getOrderDetail('user-1', 'store-1', 'nonexistent'),
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

            prisma.user.findUnique.mockResolvedValue(createMockUser({ email: 'buyer@test.com' }));
            prisma.order.findFirst.mockResolvedValue(orderNoImg);

            const result = await service.getOrderDetail('user-1', 'store-1', 'order-1');

            expect(result.items[0].image).toBe('https://example.com/product.jpg');
        });

        it('should filter order by storeId and customerEmail', async () => {
            prisma.user.findUnique.mockResolvedValue(createMockUser({ email: 'buyer@test.com' }));
            prisma.order.findFirst.mockResolvedValue(mockOrderDetail);

            await service.getOrderDetail('user-1', 'store-1', 'order-1');

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
