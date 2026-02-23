import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, AtRiskCustomersQueryDto } from './dto/analytics-query.dto';
import { AuthGuard, GlobalRoleGuard } from '../../core/guards';
import { StoreAccessGuard } from '../../core/guards/store-access.guard';
import { CurrentStore, RequireGlobalRole } from '../../core/decorators';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get analytics overview with KPIs' })
    async getOverview(
        @CurrentStore('id') storeId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getOverview(storeId, query);
    }

    @Get('sales-chart')
    @ApiOperation({ summary: 'Get sales data for chart' })
    async getSalesChart(
        @CurrentStore('id') storeId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getSalesChart(storeId, query);
    }

    @Get('top-products')
    @ApiOperation({ summary: 'Get top selling products' })
    async getTopProducts(
        @CurrentStore('id') storeId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getTopProducts(storeId, query);
    }

    @Get('orders-by-status')
    @ApiOperation({ summary: 'Get orders distribution by status' })
    async getOrdersByStatus(
        @CurrentStore('id') storeId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getOrdersByStatus(storeId, query);
    }

    @Get('top-customers')
    @ApiOperation({ summary: 'Get top customers by spending' })
    async getTopCustomers(
        @CurrentStore('id') storeId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getTopCustomers(storeId, query);
    }

    @Get('sales-by-category')
    @ApiOperation({ summary: 'Get sales grouped by category' })
    async getSalesByCategory(
        @CurrentStore('id') storeId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getSalesByCategory(storeId, query);
    }

    @Get('dashboard-alerts')
    @ApiOperation({ summary: 'Get operational alerts: low stock + urgent pending orders' })
    async getDashboardAlerts(@CurrentStore('id') storeId: string) {
        return this.analyticsService.getDashboardAlerts(storeId);
    }

    @Get('product-margin')
    @ApiOperation({ summary: 'Get products sorted by profit margin' })
    async getProductMargin(
        @CurrentStore('id') storeId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getProductMargin(storeId, query);
    }

    @Get('customer-segments')
    @ApiOperation({ summary: 'Get customer LTV segments (Alto/Medio/Bajo)' })
    async getCustomerSegments(@CurrentStore('id') storeId: string) {
        return this.analyticsService.getCustomerSegments(storeId);
    }

    @Get('sales-heatmap')
    @ApiOperation({ summary: 'Get sales heatmap by day-of-week and hour' })
    async getSalesHeatmap(
        @CurrentStore('id') storeId: string,
        @Query() query: AnalyticsQueryDto,
    ) {
        return this.analyticsService.getSalesHeatmap(storeId, query);
    }

    @Get('at-risk-customers')
    @ApiOperation({ summary: 'Get customers who have not purchased in X days' })
    async getAtRiskCustomers(
        @CurrentStore('id') storeId: string,
        @Query() query: AtRiskCustomersQueryDto,
    ) {
        return this.analyticsService.getAtRiskCustomers(storeId, query);
    }
}
