import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GlobalRoleGuard } from './global-role.guard';

describe('GlobalRoleGuard', () => {
    let guard: GlobalRoleGuard;

    const mockReflector = {
        getAllAndOverride: jest.fn(),
    };

    function createMockContext(user: any = {}): ExecutionContext {
        const mockRequest = { user };

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
                GlobalRoleGuard,
                { provide: Reflector, useValue: mockReflector },
            ],
        }).compile();

        guard = module.get<GlobalRoleGuard>(GlobalRoleGuard);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should allow access when route is @Public()', () => {
        // First call: IS_PUBLIC_KEY -> true
        mockReflector.getAllAndOverride.mockReturnValueOnce(true);

        const context = createMockContext();
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when no @RequireGlobalRole() decorator is present', () => {
        // First call: IS_PUBLIC_KEY -> false, Second call: GLOBAL_ROLE_KEY -> null
        mockReflector.getAllAndOverride.mockReturnValueOnce(false);
        mockReflector.getAllAndOverride.mockReturnValueOnce(null);

        const context = createMockContext({ globalRole: 'BUYER' });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user role matches required role', () => {
        mockReflector.getAllAndOverride.mockReturnValueOnce(false);
        mockReflector.getAllAndOverride.mockReturnValueOnce(['USER', 'SUPER_ADMIN']);

        const context = createMockContext({ globalRole: 'USER' });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has SUPER_ADMIN role', () => {
        mockReflector.getAllAndOverride.mockReturnValueOnce(false);
        mockReflector.getAllAndOverride.mockReturnValueOnce(['USER', 'SUPER_ADMIN']);

        const context = createMockContext({ globalRole: 'SUPER_ADMIN' });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access (ForbiddenException) when user role does not match', () => {
        mockReflector.getAllAndOverride.mockReturnValueOnce(false);
        mockReflector.getAllAndOverride.mockReturnValueOnce(['USER', 'SUPER_ADMIN']);

        const context = createMockContext({ globalRole: 'BUYER' });
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny access when user has no globalRole', () => {
        mockReflector.getAllAndOverride.mockReturnValueOnce(false);
        mockReflector.getAllAndOverride.mockReturnValueOnce(['USER', 'SUPER_ADMIN']);

        const context = createMockContext({});
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny access when user is null', () => {
        mockReflector.getAllAndOverride.mockReturnValueOnce(false);
        mockReflector.getAllAndOverride.mockReturnValueOnce(['USER', 'SUPER_ADMIN']);

        const context = createMockContext(null);
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle single role requirement', () => {
        mockReflector.getAllAndOverride.mockReturnValueOnce(false);
        mockReflector.getAllAndOverride.mockReturnValueOnce(['SUPER_ADMIN']);

        const context = createMockContext({ globalRole: 'USER' });
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow when empty roles array (no restriction)', () => {
        mockReflector.getAllAndOverride.mockReturnValueOnce(false);
        mockReflector.getAllAndOverride.mockReturnValueOnce([]);

        const context = createMockContext({ globalRole: 'BUYER' });
        expect(guard.canActivate(context)).toBe(true);
    });
});
