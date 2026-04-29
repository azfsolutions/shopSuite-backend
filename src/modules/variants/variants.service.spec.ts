import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';

const USER_ID = 'user-1';
const PRODUCT_REF = { id: 'prod-1', storeId: 'store-1' };

describe('VariantsService', () => {
    let service: VariantsService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VariantsService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<VariantsService>(VariantsService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('findOptions', () => {
        it('should return product options with values', async () => {
            prisma.product.findFirst.mockResolvedValue(PRODUCT_REF);
            const options = [
                { id: 'opt-1', name: 'Color', values: [{ id: 'v-1', value: 'Red' }] },
            ];
            prisma.productOption.findMany.mockResolvedValue(options);

            const result = await service.findOptions(USER_ID, 'prod-1');
            expect(result).toHaveLength(1);
            expect(result[0].values).toHaveLength(1);
        });
    });

    describe('createOption', () => {
        it('should throw BadRequestException when max options exceeded', async () => {
            prisma.product.findFirst.mockResolvedValue(PRODUCT_REF);
            prisma.product.findUnique.mockResolvedValue({
                id: 'prod-1',
                options: [{}, {}, {}], // Already has 3 options (max)
            });

            await expect(
                service.createOption(USER_ID, 'prod-1', { name: 'Fourth Option', values: [{ value: 'A' }] } as any),
            ).rejects.toThrow(BadRequestException);
        });


        it('should create option with values', async () => {
            prisma.product.findFirst.mockResolvedValue(PRODUCT_REF);
            prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', options: [] });
            const mockOption = { id: 'opt-1', name: 'Size', values: [{ id: 'v-1', value: 'S' }] };
            prisma.productOption.create.mockResolvedValue(mockOption);

            const result = await service.createOption(USER_ID, 'prod-1', {
                name: 'Size',
                values: [{ value: 'S' }, { value: 'M' }, { value: 'L' }],
            } as any);
            expect(result).toBeDefined();
            expect(result.name).toBe('Size');
        });

        it('should throw ConflictException for duplicate option name', async () => {
            prisma.product.findFirst.mockResolvedValue(PRODUCT_REF);
            prisma.product.findUnique.mockResolvedValue({
                id: 'prod-1',
                options: [{ name: 'Color' }],
            });

            await expect(
                service.createOption(USER_ID, 'prod-1', { name: 'Color', values: [{ value: 'Red' }] } as any),
            ).rejects.toThrow(ConflictException);
        });

        it('should throw NotFoundException if product not found', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(
                service.createOption(USER_ID, 'nonexistent', { name: 'Size' } as any),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('findVariants', () => {
        it('should return product variants with option values', async () => {
            prisma.product.findFirst.mockResolvedValue(PRODUCT_REF);
            const variants = [
                {
                    id: 'var-1', sku: 'SKU-S-RED', price: 100, stock: 10,
                    optionValues: [{ optionValue: { id: 'v-1', value: 'S', option: { name: 'Size' } } }],
                },
            ];
            prisma.productVariant.findMany.mockResolvedValue(variants);

            const result = await service.findVariants(USER_ID, 'prod-1');
            expect(result).toHaveLength(1);
        });
    });

    describe('updateVariant', () => {
        it('should update variant price and stock', async () => {
            prisma.productVariant.findFirst.mockResolvedValue({ id: 'var-1', productId: 'prod-1' });
            prisma.productVariant.findUnique.mockResolvedValue({ id: 'var-1', productId: 'prod-1' });
            prisma.productVariant.update.mockResolvedValue({ id: 'var-1', price: 150, stock: 20 });

            const result = await service.updateVariant(USER_ID, 'var-1', { price: 150, stock: 20 } as any);

            expect(result.price).toBe(150);
            expect(result.stock).toBe(20);
        });

        it('should throw NotFoundException if variant not found', async () => {
            prisma.productVariant.findFirst.mockResolvedValue(null);

            await expect(
                service.updateVariant(USER_ID, 'nonexistent', { price: 100 } as any),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteVariant', () => {
        it('should delete variant and return message', async () => {
            prisma.productVariant.findFirst.mockResolvedValue({ id: 'var-1' });
            prisma.productVariant.findUnique.mockResolvedValue({ id: 'var-1' });
            prisma.productVariant.delete.mockResolvedValue({});

            const result = await service.deleteVariant(USER_ID, 'var-1');

            expect(result.message).toBe('Variante eliminada correctamente');
        });

        it('should throw NotFoundException if variant not found', async () => {
            prisma.productVariant.findFirst.mockResolvedValue(null);

            await expect(service.deleteVariant(USER_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('generateVariants', () => {
        it('should generate variants from option combinations', async () => {
            prisma.product.findFirst.mockResolvedValue(PRODUCT_REF);
            prisma.product.findUnique.mockResolvedValue({
                id: 'prod-1',
                price: 100,
                options: [
                    { id: 'opt-1', name: 'Size', values: [{ value: 'S' }, { value: 'M' }] },
                    { id: 'opt-2', name: 'Color', values: [{ value: 'Red' }, { value: 'Blue' }] },
                ],
                variants: [],
            });
            prisma.productVariant.deleteMany.mockResolvedValue({});
            prisma.productVariant.createMany.mockResolvedValue({ count: 4 });
            prisma.productVariant.findMany.mockResolvedValue([
                { id: 'v-1', name: 'S / Red' },
                { id: 'v-2', name: 'S / Blue' },
                { id: 'v-3', name: 'M / Red' },
                { id: 'v-4', name: 'M / Blue' },
            ]);

            const result = await service.generateVariants(USER_ID, 'prod-1');
            // Should generate 2x2 = 4 combinations
            expect(result).toHaveLength(4);
        });

        it('should throw NotFoundException if product not found', async () => {
            prisma.product.findFirst.mockResolvedValue(null);

            await expect(
                service.generateVariants(USER_ID, 'nonexistent'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw when no options exist', async () => {
            prisma.product.findFirst.mockResolvedValue(PRODUCT_REF);
            prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', options: [], variants: [] });

            await expect(
                service.generateVariants(USER_ID, 'prod-1'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw when option has no values', async () => {
            prisma.product.findFirst.mockResolvedValue(PRODUCT_REF);
            prisma.product.findUnique.mockResolvedValue({
                id: 'prod-1',
                options: [{ id: 'opt-1', name: 'Size', values: [] }],
                variants: [],
            });

            await expect(
                service.generateVariants(USER_ID, 'prod-1'),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
