import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BuyerAuthController } from './buyer-auth.controller';
import { BetterAuthService } from './better-auth.service';
import { PrismaService } from '../../database/prisma.service';

// Mock ESM modules
jest.mock('better-auth/node', () => ({
    fromNodeHeaders: jest.fn((headers) => headers),
}));
jest.mock('../../lib/auth', () => ({
    createAuthInstance: jest.fn(),
}));

describe('BuyerAuthController', () => {
    let controller: BuyerAuthController;

    const mockAuthService = {
        api: {
            signUpEmail: jest.fn(),
        },
        auth: {},
    };

    const mockPrismaService = {
        user: {
            update: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BuyerAuthController],
            providers: [
                { provide: BetterAuthService, useValue: mockAuthService },
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        controller = module.get<BuyerAuthController>(BuyerAuthController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('signup', () => {
        const validDto = {
            email: 'buyer@test.com',
            password: 'password123',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
        };

        it('should register a buyer successfully', async () => {
            const mockResult = {
                user: { id: 'user-123', email: 'buyer@test.com' },
                session: { id: 'session-123' },
            };

            mockAuthService.api.signUpEmail.mockResolvedValue(mockResult);

            const result = await controller.signup(validDto);

            expect(result).toEqual(mockResult);
            expect(mockAuthService.api.signUpEmail).toHaveBeenCalledWith({
                body: {
                    email: 'buyer@test.com',
                    password: 'password123',
                    name: 'John Doe',
                    firstName: 'John',
                    lastName: 'Doe',
                    phone: '+1234567890',
                },
            });
        });

        it('should not send globalRole in the signup body (input: false)', async () => {
            const mockResult = {
                user: { id: 'user-456' },
                session: { id: 'session-456' },
            };
            mockAuthService.api.signUpEmail.mockResolvedValue(mockResult);

            await controller.signup(validDto);

            const signupCall = mockAuthService.api.signUpEmail.mock.calls[0][0];
            expect(signupCall.body).not.toHaveProperty('globalRole');
        });

        it('should throw BadRequestException when signup fails', async () => {
            mockAuthService.api.signUpEmail.mockRejectedValue(
                new Error('Email already exists'),
            );

            await expect(controller.signup(validDto)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should handle phone as optional (empty string default)', async () => {
            const dtoWithoutPhone = {
                email: 'buyer@test.com',
                password: 'password123',
                firstName: 'Jane',
                lastName: 'Doe',
            };

            const mockResult = {
                user: { id: 'user-789' },
                session: { id: 'session-789' },
            };
            mockAuthService.api.signUpEmail.mockResolvedValue(mockResult);

            await controller.signup(dtoWithoutPhone as any);

            expect(mockAuthService.api.signUpEmail).toHaveBeenCalledWith({
                body: expect.objectContaining({
                    phone: '',
                }),
            });
        });
    });
});
