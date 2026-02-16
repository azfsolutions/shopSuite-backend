import { Module } from '@nestjs/common';
import {
    ReviewsStorefrontController,
    ReviewsAccountController,
    ReviewsDashboardController,
} from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [
        ReviewsStorefrontController,
        ReviewsAccountController,
        ReviewsDashboardController,
    ],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule { }
