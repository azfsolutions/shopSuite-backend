import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SalesAnalyticsService } from './services/sales-analytics.service';
import { CustomerAnalyticsService } from './services/customer-analytics.service';
import { ProductAnalyticsService } from './services/product-analytics.service';
import { OrderAnalyticsService } from './services/order-analytics.service';
import { DashboardAlertsService } from './services/dashboard-alerts.service';
import { PrismaModule } from '../../database/prisma.module';
import { StoreAccessGuard } from '../../core/guards/store-access.guard';

@Module({
    imports: [PrismaModule],
    controllers: [AnalyticsController],
    providers: [
        AnalyticsService,
        SalesAnalyticsService,
        CustomerAnalyticsService,
        ProductAnalyticsService,
        OrderAnalyticsService,
        DashboardAlertsService,
        StoreAccessGuard,
    ],
    exports: [AnalyticsService],
})
export class AnalyticsModule {}
