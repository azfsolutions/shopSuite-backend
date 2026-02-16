import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../test/prisma-mock.factory';

describe('ReviewsService', () => {
    let service: ReviewsService;
    let prisma: MockPrismaService;

    beforeEach(async () => {
        prisma = createMockPrismaService();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReviewsService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<ReviewsService>(ReviewsService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('getProductReviews', () => {
        it('should return reviews with summary stats', async () => {
            const reviews = [
                { id: 'r-1', rating: 5, comment: 'Great', status: 'APPROVED', customer: { firstName: 'A', lastName: 'B' } },
                { id: 'r-2', rating: 4, comment: 'Good', status: 'APPROVED', customer: { firstName: 'C', lastName: 'D' } },
            ];
            prisma.review.findMany.mockResolvedValue(reviews);

            const result = await service.getProductReviews('prod-1');

            expect(result.reviews).toHaveLength(2);
            expect(result.summary.total).toBe(2);
            expect(result.summary.average).toBe(4.5);
        });

        it('should handle no reviews — average 0', async () => {
            prisma.review.findMany.mockResolvedValue([]);

            const result = await service.getProductReviews('prod-1');

            expect(result.reviews).toHaveLength(0);
            expect(result.summary.average).toBe(0);
        });

        it('should round average to 1 decimal place', async () => {
            const reviews = [
                { id: 'r-1', rating: 5 },
                { id: 'r-2', rating: 4 },
                { id: 'r-3', rating: 3 },
            ];
            prisma.review.findMany.mockResolvedValue(reviews);

            const result = await service.getProductReviews('prod-1');

            // (5+4+3)/3 = 4.0
            expect(result.summary.average).toBe(4);
        });

        it('should include distribution in summary', async () => {
            const reviews = [
                { id: 'r-1', rating: 5 },
                { id: 'r-2', rating: 5 },
                { id: 'r-3', rating: 3 },
            ];
            prisma.review.findMany.mockResolvedValue(reviews);

            const result = await service.getProductReviews('prod-1');

            expect(result.summary.distribution[5]).toBe(2);
            expect(result.summary.distribution[3]).toBe(1);
            expect(result.summary.distribution[1]).toBe(0);
        });
    });

    describe('approveReview', () => {
        it('should approve review', async () => {
            prisma.review.findFirst.mockResolvedValue({ id: 'r-1', storeId: 'store-1' });
            prisma.review.update.mockResolvedValue({ id: 'r-1', status: 'APPROVED' });

            const result = await service.approveReview('store-1', 'r-1');
            expect(result.status).toBe('APPROVED');
        });

        it('should throw NotFoundException when review not in store', async () => {
            prisma.review.findFirst.mockResolvedValue(null);

            await expect(service.approveReview('store-1', 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('rejectReview', () => {
        it('should reject review', async () => {
            prisma.review.findFirst.mockResolvedValue({ id: 'r-1' });
            prisma.review.update.mockResolvedValue({ id: 'r-1', status: 'REJECTED' });

            const result = await service.rejectReview('store-1', 'r-1');
            expect(result.status).toBe('REJECTED');
        });
    });

    describe('deleteReview', () => {
        it('should delete review and return message', async () => {
            prisma.review.findFirst.mockResolvedValue({ id: 'r-1' });
            prisma.review.delete.mockResolvedValue({});

            const result = await service.deleteReview('store-1', 'r-1');

            expect(result.message).toBe('Reseña eliminada correctamente');
            expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } });
        });
    });
});
