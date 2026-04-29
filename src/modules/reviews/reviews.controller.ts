import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReplyReviewDto } from './dto';
import { AuthGuard, GlobalRoleGuard, StoreAccessGuard } from '../../core/guards';
import { RequireGlobalRole } from '../../core/decorators';
import { CurrentStore } from '../../core/decorators/current-store.decorator';
import { ReviewStatus } from '@prisma/client';

// ============================================================
// STOREFRONT CONTROLLER - Customer facing
// ============================================================

@ApiTags('Reviews - Storefront')
@Controller('products/:productId/reviews')
export class ReviewsStorefrontController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener reviews aprobadas de un producto' })
    @ApiResponse({ status: 200, description: 'Lista de reviews con resumen' })
    getProductReviews(@Param('productId') productId: string) {
        return this.reviewsService.getProductReviews(productId);
    }

    @Post()
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Throttle({ default: { ttl: 3600000, limit: 3 } }) // 3 reviews per hour per IP (S-D-2)
    @ApiOperation({ summary: 'Crear una review (requiere auth)' })
    @ApiResponse({ status: 201, description: 'Review creada (pendiente moderación)' })
    createReview(
        @Request() req: any,
        @Param('productId') productId: string,
        @Body() dto: CreateReviewDto,
    ) {
        return this.reviewsService.createReviewByUserId(req.user.id, productId, dto);
    }
}

@ApiTags('Reviews - Storefront')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('account/reviews')
export class ReviewsAccountController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener mis reviews' })
    @ApiResponse({ status: 200, description: 'Lista de mis reviews' })
    getMyReviews(@Request() req: any) {
        return this.reviewsService.getMyReviewsByUserId(req.user.id);
    }
}

// ============================================================
// DASHBOARD CONTROLLER - Merchant facing
// ============================================================

@ApiTags('Reviews - Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@Controller('reviews')
export class ReviewsDashboardController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Get()
    @ApiOperation({ summary: 'Listar todas las reviews de mi tienda' })
    @ApiQuery({ name: 'status', required: false, enum: ReviewStatus })
    @ApiResponse({ status: 200, description: 'Lista de reviews' })
    getStoreReviews(
        @CurrentStore('id') storeId: string,
        @Query('status') status?: ReviewStatus,
    ) {
        return this.reviewsService.getStoreReviews(storeId, status);
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Aprobar una review' })
    @ApiResponse({ status: 200, description: 'Review aprobada' })
    approveReview(
        @CurrentStore('id') storeId: string,
        @Param('id') reviewId: string,
    ) {
        return this.reviewsService.approveReview(storeId, reviewId);
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: 'Rechazar una review' })
    @ApiResponse({ status: 200, description: 'Review rechazada' })
    rejectReview(
        @CurrentStore('id') storeId: string,
        @Param('id') reviewId: string,
    ) {
        return this.reviewsService.rejectReview(storeId, reviewId);
    }

    @Post(':id/reply')
    @ApiOperation({ summary: 'Responder a una review' })
    @ApiResponse({ status: 200, description: 'Respuesta agregada' })
    replyToReview(
        @CurrentStore('id') storeId: string,
        @Param('id') reviewId: string,
        @Body() dto: ReplyReviewDto,
    ) {
        return this.reviewsService.replyToReview(storeId, reviewId, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar una review' })
    @ApiResponse({ status: 200, description: 'Review eliminada' })
    deleteReview(
        @CurrentStore('id') storeId: string,
        @Param('id') reviewId: string,
    ) {
        return this.reviewsService.deleteReview(storeId, reviewId);
    }
}
