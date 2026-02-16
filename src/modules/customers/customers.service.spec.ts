import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockCustomer } from '../../test/test-helpers';

describe('CustomersService', () => {
    let service: CustomersService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomersService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<CustomersService>(CustomersService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('findAll', () => {
        it('should return paginated customers', async () => {
            const customers = [createMockCustomer()];
            prisma.customer.findMany.mockResolvedValue(customers);
            prisma.customer.count.mockResolvedValue(1);

            const result = await service.findAll('store-1');

            expect(result.data).toHaveLength(1);
            expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
        });

        it('should support custom pagination', async () => {
            prisma.customer.findMany.mockResolvedValue([]);
            prisma.customer.count.mockResolvedValue(0);

            await service.findAll('store-1', 2, 10);

            expect(prisma.customer.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 10,
                    take: 10,
                }),
            );
        });

        it('should exclude soft-deleted customers', async () => {
            prisma.customer.findMany.mockResolvedValue([]);
            prisma.customer.count.mockResolvedValue(0);

            await service.findAll('store-1');

            expect(prisma.customer.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ deletedAt: null }),
                }),
            );
        });
    });

    describe('findById', () => {
        it('should return customer with orders', async () => {
            const customer = createMockCustomer();
            prisma.customer.findFirst.mockResolvedValue(customer);

            const result = await service.findById('store-1', 'cust-1');
            expect(result).toEqual(customer);
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.customer.findFirst.mockResolvedValue(null);

            await expect(service.findById('store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });
});
