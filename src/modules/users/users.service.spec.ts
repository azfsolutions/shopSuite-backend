import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockUser, createMockStore } from '../../test/test-helpers';

describe('UsersService', () => {
    let service: UsersService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('findById', () => {
        it('should return user when found', async () => {
            const user = createMockUser();
            prisma.user.findUnique.mockResolvedValue(user);

            const result = await service.findById('user-1');
            expect(result).toEqual(user);
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateProfile', () => {
        it('should update and return user profile', async () => {
            const updated = createMockUser({ firstName: 'Updated' });
            prisma.user.update.mockResolvedValue(updated);

            const result = await service.updateProfile('user-1', { firstName: 'Updated' });

            expect(result.firstName).toBe('Updated');
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: { firstName: 'Updated' },
                select: expect.any(Object),
            });
        });
    });

    describe('getUserStores', () => {
        it('should return owned and member stores', async () => {
            const ownedStore = createMockStore({ ownerId: 'user-1' });
            prisma.store.findMany.mockResolvedValue([ownedStore]);
            prisma.storeMember.findMany.mockResolvedValue([
                { store: createMockStore({ id: 'store-2' }), role: 'ADMIN' },
            ]);

            const result = await service.getUserStores('user-1');

            expect(result.owned).toHaveLength(1);
            expect(result.member).toHaveLength(1);
            expect(result.member[0].role).toBe('ADMIN');
        });

        it('should return empty arrays when no stores', async () => {
            prisma.store.findMany.mockResolvedValue([]);
            prisma.storeMember.findMany.mockResolvedValue([]);

            const result = await service.getUserStores('user-1');

            expect(result.owned).toHaveLength(0);
            expect(result.member).toHaveLength(0);
        });
    });
});
