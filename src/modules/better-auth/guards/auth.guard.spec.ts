import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { BetterAuthService } from '../better-auth.service';
import { PrismaService } from '../../../database/prisma.service';

// Mock better-auth/node to avoid ESM import issues
jest.mock('better-auth/node', () => ({
    fromNodeHeaders: jest.fn((headers) => headers),
}));

// Mock the auth factory
jest.mock('../../../lib/auth', () => ({
    createAuthInstance: jest.fn(),
}));

describe('AuthGuard', () => {
    let guard: AuthGuard;

    const mockAuthService = {
        api: {
            getSession: jest.fn(),
        },
        auth: {},
    };

    const mockPrismaService = {
        store: { findUnique: jest.fn() },
        storeMember: { findUnique: jest.fn() },
    };

    const mockReflector = {
        getAllAndOverride: jest.fn(),
    };

    // Helper to create mock ExecutionContext
    function createMockContext(requestOverrides: any = {}): ExecutionContext {
        const mockRequest = {
            headers: { cookie: 'shopsuite.session_token=test-token' },
            path: '/api/test',
            ip: '127.0.0.1',
            ...requestOverrides,
        };

        return {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        } as unknown as ExecutionContext;
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthGuard,
                { provide: Reflector, useValue: mockReflector },
                { provide: BetterAuthService, useValue: mockAuthService },
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        guard = module.get<AuthGuard>(AuthGuard);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('canActivate', () => {
        it('should be defined', () => {
            expect(guard).toBeDefined();
        });

        it('should allow access to @Public() routes without calling getSession', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(true);
            const context = createMockContext();

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(mockAuthService.api.getSession).not.toHaveBeenCalled();
        });

        it('should allow access with valid session and attach user/session to request', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(false);
            const mockUser = { id: 'user-1', email: 'test@test.com' };
            const mockSession = { id: 'session-1', userId: 'user-1' };
            mockAuthService.api.getSession.mockResolvedValue({
                user: mockUser,
                session: mockSession,
            });

            const mockRequest: any = {
                headers: { cookie: 'test=cookie' },
                path: '/api/test',
                ip: '127.0.0.1',
            };
            const context = {
                switchToHttp: () => ({ getRequest: () => mockRequest }),
                getHandler: () => ({}),
                getClass: () => ({}),
            } as unknown as ExecutionContext;

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            expect(mockRequest.user).toEqual(mockUser);
            expect(mockRequest.session).toEqual(mockSession);
        });

        it('should throw UnauthorizedException when session is null', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(false);
            mockAuthService.api.getSession.mockResolvedValue(null);

            const context = createMockContext();

            await expect(guard.canActivate(context)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException when session has no user', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(false);
            mockAuthService.api.getSession.mockResolvedValue({
                user: null,
                session: null,
            });

            const context = createMockContext();

            await expect(guard.canActivate(context)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException and log when API call fails', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(false);
            mockAuthService.api.getSession.mockRejectedValue(
                new Error('Connection refused'),
            );

            const context = createMockContext();

            await expect(guard.canActivate(context)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should re-throw UnauthorizedException directly without wrapping', async () => {
            mockReflector.getAllAndOverride.mockReturnValue(false);
            const originalError = new UnauthorizedException('Token expired');
            mockAuthService.api.getSession.mockRejectedValue(originalError);

            const context = createMockContext();

            await expect(guard.canActivate(context)).rejects.toThrow(originalError);
        });
    });

    describe('store context', () => {
        const mockUser = { id: 'user-1', email: 'test@test.com' };
        const mockSessionObj = { id: 'session-1', userId: 'user-1' };
        const mockStore = { id: 'store-1', name: 'Test Store' };
        const mockMembership = {
            userId: 'user-1',
            storeId: 'store-1',
            role: 'OWNER',
        };

        beforeEach(() => {
            mockReflector.getAllAndOverride.mockReturnValue(false);
            mockAuthService.api.getSession.mockResolvedValue({
                user: mockUser,
                session: mockSessionObj,
            });
        });

        it('should attach store and membership when X-Store-Id header + valid membership', async () => {
            mockPrismaService.store.findUnique.mockResolvedValue(mockStore);
            mockPrismaService.storeMember.findUnique.mockResolvedValue(mockMembership);

            const mockRequest: any = {
                headers: { cookie: 'c', 'x-store-id': 'store-1' },
                path: '/api/test',
                ip: '127.0.0.1',
            };
            const context = {
                switchToHttp: () => ({ getRequest: () => mockRequest }),
                getHandler: () => ({}),
                getClass: () => ({}),
            } as unknown as ExecutionContext;

            await guard.canActivate(context);

            expect(mockRequest.store).toEqual(mockStore);
            expect(mockRequest.storeMember).toEqual(mockMembership);
        });

        it('should not attach store when store not found', async () => {
            mockPrismaService.store.findUnique.mockResolvedValue(null);

            const mockRequest: any = {
                headers: { cookie: 'c', 'x-store-id': 'nonexistent' },
                path: '/api/test',
                ip: '127.0.0.1',
            };
            const context = {
                switchToHttp: () => ({ getRequest: () => mockRequest }),
                getHandler: () => ({}),
                getClass: () => ({}),
            } as unknown as ExecutionContext;

            await guard.canActivate(context);

            expect(mockRequest.store).toBeUndefined();
        });

        it('should not attach store when user is not a member', async () => {
            mockPrismaService.store.findUnique.mockResolvedValue(mockStore);
            mockPrismaService.storeMember.findUnique.mockResolvedValue(null);

            const mockRequest: any = {
                headers: { cookie: 'c', 'x-store-id': 'store-1' },
                path: '/api/test',
                ip: '127.0.0.1',
            };
            const context = {
                switchToHttp: () => ({ getRequest: () => mockRequest }),
                getHandler: () => ({}),
                getClass: () => ({}),
            } as unknown as ExecutionContext;

            await guard.canActivate(context);

            expect(mockRequest.store).toBeUndefined();
            expect(mockRequest.storeMember).toBeUndefined();
        });

        it('should skip store lookup when no X-Store-Id header', async () => {
            const mockRequest: any = {
                headers: { cookie: 'c' },
                path: '/api/test',
                ip: '127.0.0.1',
            };
            const context = {
                switchToHttp: () => ({ getRequest: () => mockRequest }),
                getHandler: () => ({}),
                getClass: () => ({}),
            } as unknown as ExecutionContext;

            await guard.canActivate(context);

            expect(mockPrismaService.store.findUnique).not.toHaveBeenCalled();
        });
    });
});
