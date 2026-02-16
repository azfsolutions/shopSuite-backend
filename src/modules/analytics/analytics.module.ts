import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../../database/prisma.module';
import { StoreAccessGuard } from '../../core/guards/store-access.guard';

@Module({
    imports: [PrismaModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService, StoreAccessGuard],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }

