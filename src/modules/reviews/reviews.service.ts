import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReviewDto, ReplyReviewDto } from './dto';
import { ReviewStatus, NotificationType } from '@prisma/client';

@Injectable()
export class ReviewsService {
    constructor(private readonly prisma: PrismaService) { }

    // ============================================================
    // STOREFRONT - Customer facing
    // ============================================================

    async getProductReviews(productId: string) {
        const reviews = await this.prisma.review.findMany({
            where: {
                productId,
                status: ReviewStatus.APPROVED,
            },
            include: {
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calcular rating promedio
        const avgRating =
            reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;

        return {
            reviews,
            summary: {
                total: reviews.length,
                average: Math.round(avgRating * 10) / 10,
                distribution: this.calculateDistribution(reviews),
            },
        };
    }

    private calculateDistribution(reviews: { rating: number }[]) {
        const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((r) => {
            distribution[r.rating]++;
        });
        return distribution;
    }

    async createReviewByUserId(userId: string, productId: string, dto: CreateReviewDto) {
        // Obtener customerId desde userId
        const customer = await this.getOrCreateCustomerForProduct(userId, productId);
        return this.createReview(customer.id, productId, dto);
    }

    async createReview(customerId: string, productId: string, dto: CreateReviewDto) {
        // Verificar que el producto existe
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { store: { select: { id: true, ownerId: true } } },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        // Verificar si ya dejó una review
        const existingReview = await this.prisma.review.findFirst({
            where: { productId, customerId },
        });

        if (existingReview) {
            throw new BadRequestException('Ya has dejado una reseña para este producto');
        }

        // Verificar si el customer compró el producto (para isVerified)
        const hasPurchased = await this.prisma.orderItem.findFirst({
            where: {
                productId,
                order: {
                    customerId,
                    paymentStatus: 'PAID',
                },
            },
        });

        // Crear la review
        const review = await this.prisma.review.create({
            data: {
                productId,
                customerId,
                rating: dto.rating,
                title: dto.title,
                comment: dto.comment,
                status: ReviewStatus.PENDING,
                isVerified: !!hasPurchased,
            },
        });

        // Notificar al merchant
        await this.notifyMerchant(product.store.ownerId, product.store.id, product.name);

        return review;
    }

    private async notifyMerchant(userId: string, storeId: string, productName: string) {
        await this.prisma.notification.create({
            data: {
                userId,
                type: NotificationType.NEW_REVIEW,
                title: 'Nueva reseña pendiente',
                message: `Tienes una nueva reseña en "${productName}" que requiere moderación`,
                data: { storeId },
            },
        });
    }

    async getMyReviewsByUserId(userId: string) {
        const customer = await this.getCustomerFromUserId(userId);
        if (!customer) {
            return [];
        }
        return this.getMyReviews(customer.id);
    }

    async getMyReviews(customerId: string) {
        return this.prisma.review.findMany({
            where: { customerId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        images: { take: 1, orderBy: { position: 'asc' } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ============================================================
    // DASHBOARD - Merchant facing
    // ============================================================

    async getStoreReviews(storeId: string, status?: ReviewStatus) {
        return this.prisma.review.findMany({
            where: {
                product: { storeId },
                ...(status && { status }),
            },
            include: {
                product: {
                    select: { id: true, name: true, slug: true },
                },
                customer: {
                    select: { firstName: true, lastName: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async approveReview(storeId: string, reviewId: string) {
        await this.findReviewForStore(storeId, reviewId);

        return this.prisma.review.update({
            where: { id: reviewId },
            data: { status: ReviewStatus.APPROVED },
        });
    }

    async rejectReview(storeId: string, reviewId: string) {
        await this.findReviewForStore(storeId, reviewId);

        return this.prisma.review.update({
            where: { id: reviewId },
            data: { status: ReviewStatus.REJECTED },
        });
    }

    async replyToReview(storeId: string, reviewId: string, dto: ReplyReviewDto) {
        const review = await this.findReviewForStore(storeId, reviewId);

        if (review.reply) {
            throw new BadRequestException('Ya has respondido a esta reseña');
        }

        return this.prisma.review.update({
            where: { id: reviewId },
            data: {
                reply: dto.reply,
                repliedAt: new Date(),
            },
        });
    }

    async deleteReview(storeId: string, reviewId: string) {
        await this.findReviewForStore(storeId, reviewId);

        await this.prisma.review.delete({
            where: { id: reviewId },
        });

        return { message: 'Reseña eliminada correctamente' };
    }

    private async findReviewForStore(storeId: string, reviewId: string) {
        const review = await this.prisma.review.findFirst({
            where: {
                id: reviewId,
                product: { storeId },
            },
            include: {
                product: { select: { storeId: true } },
            },
        });

        if (!review) {
            throw new NotFoundException('Reseña no encontrada');
        }

        return review;
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private async getCustomerFromUserId(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        if (!user) return null;

        return this.prisma.customer.findFirst({
            where: { email: user.email },
        });
    }

    private async getOrCreateCustomerForProduct(userId: string, productId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true, lastName: true },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { storeId: true },
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        // Find or create customer for this store
        let customer = await this.prisma.customer.findFirst({
            where: {
                email: user.email,
                storeId: product.storeId,
            },
        });

        if (!customer) {
            customer = await this.prisma.customer.create({
                data: {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    storeId: product.storeId,
                },
            });
        }

        return customer;
    }

    async getProductRatingSummary(productId: string) {
        const result = await this.prisma.review.aggregate({
            where: {
                productId,
                status: ReviewStatus.APPROVED,
            },
            _avg: { rating: true },
            _count: true,
        });

        return {
            average: result._avg.rating ?? 0,
            count: result._count,
        };
    }
}
