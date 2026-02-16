import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StoreAccessGuard } from './store-access.guard';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockStore } from '../../test/test-helpers';

describe('StoreAccessGuard', () => {
    let guard: StoreAccessGuard;
    let prisma: MockPrismaService;

    const mockContext = (params: Record<string, any> = {}, user: any = { id: 'user-1' }, headers: Record<string, any> = {}): ExecutionContext =>
    ({
        switchToHttp: () => ({
            getRequest: () => ({
                params,
                headers,
                user,
                store: undefined,
                storeMember: undefined,
            }),
        }),
    } as unknown as ExecutionContext);

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StoreAccessGuard,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        guard = module.get<StoreAccessGuard>(StoreAccessGuard);
    });

    afterEach(() => jest.clearAllMocks());

    it('should allow access for store owner', async () => {
        const store = createMockStore({ ownerId: 'user-1', members: [] });
        prisma.store.findUnique.mockResolvedValue(store);

        const result = await guard.canActivate(mockContext({ storeId: 'store-1' }));
        expect(result).toBe(true);
    });

    it('should allow access for store member', async () => {
        const store = createMockStore({
            ownerId: 'other-user',
            members: [{ userId: 'user-1', role: 'ADMIN' }],
        });
        prisma.store.findUnique.mockResolvedValue(store);

        const result = await guard.canActivate(mockContext({ storeId: 'store-1' }));
        expect(result).toBe(true);
    });

    it('should throw ForbiddenException when storeId missing', async () => {
        await expect(guard.canActivate(mockContext({}))).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user missing', async () => {
        await expect(
            guard.canActivate(mockContext({ storeId: 'store-1' }, null)),
        ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when store does not exist', async () => {
        prisma.store.findUnique.mockResolvedValue(null);

        await expect(
            guard.canActivate(mockContext({ storeId: 'nonexistent' })),
        ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is neither owner nor member', async () => {
        const store = createMockStore({ ownerId: 'other-user', members: [] });
        prisma.store.findUnique.mockResolvedValue(store);

        await expect(
            guard.canActivate(mockContext({ storeId: 'store-1' })),
        ).rejects.toThrow(ForbiddenException);
    });

    it('should read storeId from x-store-id header when not in params', async () => {
        const store = createMockStore({ ownerId: 'user-1', members: [] });
        prisma.store.findUnique.mockResolvedValue(store);

        const result = await guard.canActivate(
            mockContext({}, { id: 'user-1' }, { 'x-store-id': 'store-1' }),
        );
        expect(result).toBe(true);
    });
});
