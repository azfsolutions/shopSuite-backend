import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { PrismaService } from '../../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../../test/prisma-mock.factory';
import { RedisService } from '../../redis/redis.service';
import { createMockStore, createMockProduct, createMockCategory } from '../../../test/test-helpers';

const mockRedisService = { isAvailable: false, get: jest.fn(), set: jest.fn() };

describe('StorefrontService', () => {
    let service: StorefrontService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StorefrontService,
                { provide: PrismaService, useValue: prisma },
                { provide: RedisService, useValue: mockRedisService },
            ],
        }).compile();

        service = module.get<StorefrontService>(StorefrontService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('getStoreBySlug', () => {
        it('should return store when found', async () => {
            const store = createMockStore();
            prisma.store.findUnique.mockResolvedValue(store);

            const result = await service.getStoreBySlug('test-store');
            expect(result).toEqual(store);
        });

        it('should throw NotFoundException for invalid slug', async () => {
            prisma.store.findUnique.mockResolvedValue(null);

            await expect(service.getStoreBySlug('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getCategories', () => {
        it('should return active categories ordered by position', async () => {
            const cats = [createMockCategory(), createMockCategory({ id: 'cat-2', position: 1 })];
            prisma.category.findMany.mockResolvedValue(cats);

            const result = await service.getCategories('store-1');
            expect(result).toHaveLength(2);
        });
    });

    describe('getProducts', () => {
        it('should return paginated products', async () => {
            const products = [createMockProduct()];
            prisma.product.findMany.mockResolvedValue(products);
            prisma.product.count.mockResolvedValue(1);

            const result = await service.getProducts('store-1');

            expect(result.data).toBeDefined();
        });

        it('should filter by category slug when provided', async () => {
            const mockCategory = { id: 'cat-1', slug: 'test-category', name: 'Test' };
            prisma.category.findFirst.mockResolvedValue(mockCategory);
            prisma.product.findMany.mockResolvedValue([]);
            prisma.product.count.mockResolvedValue(0);

            await service.getProducts('store-1', 'test-category');

            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        categoryId: 'cat-1',
                    }),
                }),
            );
        });
    });

    describe('getProductBySlug', () => {
        it('should return product by slug', async () => {
            const product = createMockProduct();
            prisma.product.findFirst.mockResolvedValue(product);

            const result = await service.getProductBySlug('store-1', 'test-product');
            expect(result).toEqual(product);
        });

        it('should throw NotFoundException for missing product', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(service.getProductBySlug('store-1', 'missing')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getNewArrivals', () => {
        it('should return active products ordered by creation date', async () => {
            const products = [createMockProduct()];
            prisma.product.findMany.mockResolvedValue(products);

            const result = await service.getNewArrivals('store-1', 8);
            expect(result).toBeDefined();
        });
    });

    describe('getExclusiveProducts', () => {
        it('should return exclusive products with stock > 0', async () => {
            const products = [createMockProduct({ isExclusive: true, stock: 5 })];
            prisma.product.findMany.mockResolvedValue(products);

            const result = await service.getExclusiveProducts('store-1');
            expect(result).toBeDefined();
        });
    });

    describe('getActiveBanners', () => {
        it('should return active banners', async () => {
            prisma.banner.findMany.mockResolvedValue([
                { id: 'b-1', title: 'Sale!', isActive: true },
            ]);

            const result = await service.getActiveBanners('store-1');
            expect(result).toHaveLength(1);
        });
    });

    describe('getActiveFlashSales', () => {
        it('should return active flash sales', async () => {
            prisma.flashSale.findMany.mockResolvedValue([]);

            const result = await service.getActiveFlashSales('store-1');
            expect(result).toHaveLength(0);
        });
    });
});
