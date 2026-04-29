import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockProduct } from '../../test/test-helpers';

describe('ProductsService', () => {
    let service: ProductsService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
    });

    afterEach(() => jest.clearAllMocks());

    // ─── FIND ALL ────────────────────────────────────────────
    describe('findAll', () => {
        it('should return products with pagination meta', async () => {
            const products = [createMockProduct(), createMockProduct({ id: 'prod-2' })];
            prisma.product.findMany.mockResolvedValue(products);

            const result = await service.findAll('store-1');

            expect(result.data).toHaveLength(2);
            expect(result.meta).toHaveProperty('total');
            expect(result.meta).toHaveProperty('page');
        });

        it('should filter by storeId and exclude deleted', async () => {
            prisma.product.findMany.mockResolvedValue([]);

            await service.findAll('store-1');

            expect(prisma.product.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ storeId: 'store-1', deletedAt: null }),
                }),
            );
        });
    });

    // ─── FIND BY ID ──────────────────────────────────────────
    describe('findById', () => {
        it('should return product with relations', async () => {
            const product = createMockProduct();
            prisma.product.findFirst.mockResolvedValue(product);

            const result = await service.findById('store-1', 'prod-1');

            expect(result).toEqual(product);
            expect(prisma.product.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: expect.objectContaining({ category: true }),
                }),
            );
        });

        it('should throw NotFoundException when product not found', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(service.findById('store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ─── CREATE ──────────────────────────────────────────────
    describe('create', () => {
        it('should create product when slug is unique', async () => {
            prisma.product.findFirst.mockResolvedValue(null);
            prisma.product.create.mockResolvedValue(createMockProduct());

            const result = await service.create('store-1', {
                name: 'New Product',
                slug: 'new-product',
                price: 50,
            });

            expect(result).toBeDefined();
            expect(prisma.product.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ slug: 'new-product', storeId: 'store-1' }),
                }),
            );
        });

        it('should throw ConflictException for duplicate slug', async () => {
            prisma.product.findFirst.mockResolvedValue(createMockProduct());

            await expect(
                service.create('store-1', { name: 'Dup', slug: 'test-product', price: 10 }),
            ).rejects.toThrow(ConflictException);
        });

        it('should default stock to 0 and status to DRAFT', async () => {
            prisma.product.findFirst.mockResolvedValue(null);
            prisma.product.create.mockResolvedValue(createMockProduct());

            await service.create('store-1', { name: 'P', slug: 'p', price: 10 });

            expect(prisma.product.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ stock: 0, status: 'DRAFT' }),
                }),
            );
        });
    });

    // ─── UPDATE ──────────────────────────────────────────────
    describe('update', () => {
        it('should verify existence before updating', async () => {
            prisma.product.findFirst.mockResolvedValue(createMockProduct());
            prisma.product.update.mockResolvedValue(createMockProduct({ name: 'Updated' }));

            await service.update('store-1', 'prod-1', { name: 'Updated' });

            expect(prisma.product.findFirst).toHaveBeenCalled();
            expect(prisma.product.update).toHaveBeenCalled();
        });

        it('should throw NotFoundException if product does not exist', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(
                service.update('store-1', 'nonexistent', { name: 'X' }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ─── DELETE (Soft Delete) ────────────────────────────────
    describe('delete', () => {
        it('should soft delete by setting deletedAt', async () => {
            prisma.product.findFirst.mockResolvedValue(createMockProduct());
            prisma.product.update.mockResolvedValue(createMockProduct({ deletedAt: new Date() }));

            await service.delete('store-1', 'prod-1');

            expect(prisma.product.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ deletedAt: expect.any(Date) }),
                }),
            );
        });

        it('should throw if product not found before deleting', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(service.delete('store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ─── IMAGES ──────────────────────────────────────────────
    describe('addImage', () => {
        it('should add image to product', async () => {
            prisma.product.findFirst.mockResolvedValue(createMockProduct());
            prisma.productImage.create.mockResolvedValue({ id: 'img-1', url: 'http://img.jpg', position: 0 });

            await service.addImage('store-1', 'prod-1', 'http://img.jpg');

            expect(prisma.productImage.create).toHaveBeenCalledWith({
                data: { productId: 'prod-1', url: 'http://img.jpg', position: 0 },
            });
        });
    });

    describe('deleteImage', () => {
        it('should delete image by id', async () => {
            prisma.product.findFirst.mockResolvedValue(createMockProduct());
            prisma.productImage.findFirst.mockResolvedValue({ id: 'img-1', productId: 'prod-1' });
            prisma.productImage.delete.mockResolvedValue({});

            await service.deleteImage('store-1', 'prod-1', 'img-1');

            expect(prisma.productImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
        });
    });

    // ─── EXCLUSIVE STATUS ────────────────────────────────────
    describe('updateExclusiveStatus', () => {
        it('should update exclusive status', async () => {
            prisma.product.findFirst.mockResolvedValue(createMockProduct());
            prisma.product.update.mockResolvedValue(createMockProduct({ isExclusive: true }));

            await service.updateExclusiveStatus('store-1', 'prod-1', true);

            expect(prisma.product.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { isExclusive: true },
                }),
            );
        });

        it('should throw NotFoundException if product not found', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(
                service.updateExclusiveStatus('store-1', 'nonexistent', true),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
