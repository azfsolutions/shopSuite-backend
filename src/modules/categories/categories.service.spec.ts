import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';
import { createMockCategory } from '../../test/test-helpers';

describe('CategoriesService', () => {
    let service: CategoriesService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CategoriesService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<CategoriesService>(CategoriesService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('findAll', () => {
        it('should return categories ordered by position', async () => {
            const categories = [createMockCategory(), createMockCategory({ id: 'cat-2', position: 1 })];
            prisma.category.findMany.mockResolvedValue(categories);

            const result = await service.findAll('store-1');

            expect(result).toHaveLength(2);
            expect(prisma.category.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { position: 'asc' },
                }),
            );
        });

        it('should exclude soft-deleted categories', async () => {
            prisma.category.findMany.mockResolvedValue([]);

            await service.findAll('store-1');

            expect(prisma.category.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ deletedAt: null }),
                }),
            );
        });
    });

    describe('findById', () => {
        it('should return category with children and _count', async () => {
            const cat = createMockCategory();
            prisma.category.findFirst.mockResolvedValue(cat);

            const result = await service.findById('store-1', 'cat-1');
            expect(result).toEqual(cat);
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.category.findFirst.mockResolvedValue(null);

            await expect(service.findById('store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('create', () => {
        it('should create category when slug is unique', async () => {
            prisma.category.findFirst.mockResolvedValue(null);
            prisma.category.create.mockResolvedValue(createMockCategory());

            await service.create('store-1', { name: 'New Cat', slug: 'new-cat' });

            expect(prisma.category.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ storeId: 'store-1' }),
                }),
            );
        });

        it('should throw ConflictException for duplicate slug', async () => {
            prisma.category.findFirst.mockResolvedValue(createMockCategory());

            await expect(
                service.create('store-1', { name: 'Dup', slug: 'test-category' }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('update', () => {
        it('should verify existence then update', async () => {
            prisma.category.findFirst.mockResolvedValue(createMockCategory());
            prisma.category.update.mockResolvedValue(createMockCategory({ name: 'Updated' }));

            await service.update('store-1', 'cat-1', { name: 'Updated' });

            expect(prisma.category.update).toHaveBeenCalled();
        });

        it('should throw NotFoundException if not found', async () => {
            prisma.category.findFirst.mockResolvedValue(null);

            await expect(service.update('store-1', 'x', { name: 'Y' })).rejects.toThrow(NotFoundException);
        });
    });

    describe('delete', () => {
        it('should soft delete by setting deletedAt', async () => {
            prisma.category.findFirst.mockResolvedValue(createMockCategory());
            prisma.category.update.mockResolvedValue(createMockCategory({ deletedAt: new Date() }));

            await service.delete('store-1', 'cat-1');

            expect(prisma.category.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ deletedAt: expect.any(Date) }),
                }),
            );
        });

        it('should throw if not found before deleting', async () => {
            prisma.category.findFirst.mockResolvedValue(null);

            await expect(service.delete('store-1', 'x')).rejects.toThrow(NotFoundException);
        });
    });
});
