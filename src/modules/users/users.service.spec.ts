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

    // ─── FIND BY ID ──────────────────────────────────────────
    describe('findById', () => {
        it('should return user when found', async () => {
            const user = createMockUser();
            prisma.user.findUnique.mockResolvedValue(user);

            const result = await service.findById('user-1');

            expect(result).toEqual(user);
            expect(prisma.user.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'user-1' },
                    select: expect.objectContaining({
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        globalRole: true,
                    }),
                }),
            );
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ─── UPDATE PROFILE ──────────────────────────────────────
    describe('updateProfile', () => {
        it('should update firstName and sync name field', async () => {
            const currentUser = createMockUser({ firstName: 'Old', lastName: 'User' });
            const updated = createMockUser({ firstName: 'New', name: 'New User' });

            prisma.user.findUnique.mockResolvedValue(currentUser);
            prisma.user.update.mockResolvedValue(updated);

            const result = await service.updateProfile('user-1', { firstName: 'New' });

            expect(result.firstName).toBe('New');
            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'user-1' },
                    data: expect.objectContaining({
                        firstName: 'New',
                        name: 'New User',
                    }),
                }),
            );
        });

        it('should update lastName and sync name field', async () => {
            const currentUser = createMockUser({ firstName: 'Test', lastName: 'Old' });
            const updated = createMockUser({ lastName: 'New', name: 'Test New' });

            prisma.user.findUnique.mockResolvedValue(currentUser);
            prisma.user.update.mockResolvedValue(updated);

            await service.updateProfile('user-1', { lastName: 'New' });

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        lastName: 'New',
                        name: 'Test New',
                    }),
                }),
            );
        });

        it('should update both firstName and lastName and sync name', async () => {
            const currentUser = createMockUser();
            const updated = createMockUser({ firstName: 'Juan', lastName: 'Pérez', name: 'Juan Pérez' });

            prisma.user.findUnique.mockResolvedValue(currentUser);
            prisma.user.update.mockResolvedValue(updated);

            await service.updateProfile('user-1', { firstName: 'Juan', lastName: 'Pérez' });

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        firstName: 'Juan',
                        lastName: 'Pérez',
                        name: 'Juan Pérez',
                    }),
                }),
            );
        });

        it('should update phone without touching name', async () => {
            const updated = createMockUser({ phone: '+595991234567' });
            prisma.user.update.mockResolvedValue(updated);

            const result = await service.updateProfile('user-1', { phone: '+595991234567' });

            expect(result.phone).toBe('+595991234567');
            expect(prisma.user.findUnique).not.toHaveBeenCalled();
            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { phone: '+595991234567' },
                }),
            );
        });

        it('should update avatar without touching name', async () => {
            const updated = createMockUser({ avatar: 'https://example.com/avatar.jpg' });
            prisma.user.update.mockResolvedValue(updated);

            await service.updateProfile('user-1', { avatar: 'https://example.com/avatar.jpg' });

            expect(prisma.user.findUnique).not.toHaveBeenCalled();
            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { avatar: 'https://example.com/avatar.jpg' },
                }),
            );
        });

        it('should handle updating all fields at once', async () => {
            const currentUser = createMockUser();
            const updated = createMockUser({
                firstName: 'Juan',
                lastName: 'Pérez',
                phone: '+595991000000',
                avatar: 'https://example.com/new.jpg',
            });

            prisma.user.findUnique.mockResolvedValue(currentUser);
            prisma.user.update.mockResolvedValue(updated);

            await service.updateProfile('user-1', {
                firstName: 'Juan',
                lastName: 'Pérez',
                phone: '+595991000000',
                avatar: 'https://example.com/new.jpg',
            });

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        firstName: 'Juan',
                        lastName: 'Pérez',
                        phone: '+595991000000',
                        avatar: 'https://example.com/new.jpg',
                        name: 'Juan Pérez',
                    }),
                }),
            );
        });

        it('should return select fields including phone', async () => {
            const updated = createMockUser({ phone: '+595991234567' });
            prisma.user.update.mockResolvedValue(updated);

            await service.updateProfile('user-1', { phone: '+595991234567' });

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    select: expect.objectContaining({
                        phone: true,
                        avatar: true,
                    }),
                }),
            );
        });
    });

    // ─── GET USER STORES ─────────────────────────────────────
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

        it('should filter out deleted stores', async () => {
            prisma.store.findMany.mockResolvedValue([]);
            prisma.storeMember.findMany.mockResolvedValue([]);

            await service.getUserStores('user-1');

            expect(prisma.store.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ deletedAt: null }),
                }),
            );
        });
    });
});
