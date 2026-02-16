import { Test, TestingModule } from '@nestjs/testing';
import { BetterAuthService } from './better-auth.service';
import { PrismaService } from '../../database/prisma.service';

// Mock the auth factory to avoid importing better-auth (ESM)
jest.mock('../../lib/auth', () => ({
    createAuthInstance: jest.fn().mockReturnValue({
        api: {
            getSession: jest.fn(),
            signUpEmail: jest.fn(),
            signInEmail: jest.fn(),
            signOut: jest.fn(),
        },
        handler: jest.fn(),
    }),
}));

describe('BetterAuthService', () => {
    let service: BetterAuthService;

    const mockPrismaService = {
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        session: { findUnique: jest.fn(), findMany: jest.fn() },
        account: { findUnique: jest.fn(), findMany: jest.fn() },
        $connect: jest.fn(),
        $disconnect: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BetterAuthService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<BetterAuthService>(BetterAuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Reset the lazy instance between tests
        service['_authInstance'] = null;
    });

    describe('initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should not create auth instance at construction time', () => {
            expect(service['_authInstance']).toBeNull();
        });

        it('should create auth instance on first access', () => {
            const auth = service.auth;
            expect(auth).toBeDefined();
            expect(service['_authInstance']).not.toBeNull();
        });

        it('should return the same instance on subsequent accesses (singleton)', () => {
            const auth1 = service.auth;
            const auth2 = service.auth;
            expect(auth1).toBe(auth2);
        });

        it('should call createAuthInstance with PrismaService', () => {
            const { createAuthInstance } = require('../../lib/auth');
            service.auth;
            expect(createAuthInstance).toHaveBeenCalledWith(mockPrismaService);
        });
    });

    describe('api', () => {
        it('should expose the Better Auth API', () => {
            const api = service.api;
            expect(api).toBeDefined();
        });

        it('should have getSession method', () => {
            const api = service.api;
            expect(api.getSession).toBeDefined();
            expect(typeof api.getSession).toBe('function');
        });

        it('should use the same auth instance for api access', () => {
            const api1 = service.api;
            const api2 = service.api;
            expect(api1).toBe(api2);
        });
    });
});
