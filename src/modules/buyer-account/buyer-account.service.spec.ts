import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BuyerAccountService } from './buyer-account.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockUser, createMockOrder } from '../../test/test-helpers';

describe('BuyerAccountService', () => {
    let service: BuyerAccountService;
    let prisma: MockPrismaService;

    const mockProfile = { id: 'profile-1', userId: 'user-1', storeId: 'store-1', ordersCount: 0, totalSpent: 0, createdAt: new Date(), lastOrderAt: null };

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

    describe('getOrCreateProfile', () => {
        it('should return existing profile', async () => {
            (prisma as any).storeCustomerProfile = { findUnique: jest.fn().mockResolvedValue(mockProfile), create: jest.fn() };

            const result = await service.getOrCreateProfile('user-1', 'store-1');
            expect(result).toEqual(mockProfile);
        });

        it('should create profile when not found', async () => {
            (prisma as any).storeCustomerProfile = {
                findUnique: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockResolvedValue(mockProfile),
            };

            const result = await service.getOrCreateProfile('user-1', 'store-1');
            expect(result).toEqual(mockProfile);
        });
    });

    describe('getAddresses', () => {
        it('should return addresses for buyer profile', async () => {
            (prisma as any).storeCustomerProfile = { findUnique: jest.fn().mockResolvedValue(mockProfile), create: jest.fn() };
            (prisma as any).buyerAddress = { findMany: jest.fn().mockResolvedValue([{ id: 'addr-1', city: 'Asuncion' }]) };

            const result = await service.getAddresses('user-1', 'store-1');
            expect(result).toHaveLength(1);
        });
    });

    describe('deleteAddress', () => {
        it('should delete address that belongs to profile', async () => {
            (prisma as any).storeCustomerProfile = { findUnique: jest.fn().mockResolvedValue(mockProfile), create: jest.fn() };
            (prisma as any).buyerAddress = {
                findFirst: jest.fn().mockResolvedValue({ id: 'addr-1' }),
                delete: jest.fn().mockResolvedValue({}),
            };

            const result = await service.deleteAddress('user-1', 'store-1', 'addr-1');
            expect(result.message).toBe('Dirección eliminada');
        });

        it('should throw NotFoundException when address not found', async () => {
            (prisma as any).storeCustomerProfile = { findUnique: jest.fn().mockResolvedValue(mockProfile), create: jest.fn() };
            (prisma as any).buyerAddress = { findFirst: jest.fn().mockResolvedValue(null) };

            await expect(service.deleteAddress('user-1', 'store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getOrderDetail', () => {
        it('should throw NotFoundException when order not found', async () => {
            prisma.user.findUnique.mockResolvedValue(createMockUser());
            prisma.order.findFirst.mockResolvedValue(null);

            await expect(service.getOrderDetail('user-1', 'store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });
});
