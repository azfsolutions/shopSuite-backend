import { Module } from '@nestjs/common';
import {
    PlansController,
    SubscriptionController,
    AdminSubscriptionsController,
} from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { LimitsGuard } from './limits.guard';
import { PrismaModule } from '../../database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [
        PlansController,
        SubscriptionController,
        AdminSubscriptionsController,
    ],
    providers: [SubscriptionsService, LimitsGuard],
    exports: [SubscriptionsService, LimitsGuard],
})
export class SubscriptionsModule { }
