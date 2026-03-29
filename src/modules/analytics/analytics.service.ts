import { Injectable } from '@nestjs/common';
import { AnalyticsQueryDto, AtRiskCustomersQueryDto } from './dto/analytics-query.dto';
import { SalesAnalyticsService } from './services/sales-analytics.service';
import { CustomerAnalyticsService } from './services/customer-analytics.service';
import { ProductAnalyticsService } from './services/product-analytics.service';
import { OrderAnalyticsService } from './services/order-analytics.service';
import { DashboardAlertsService } from './services/dashboard-alerts.service';

@Injectable()
export class AnalyticsService {
    constructor(
        private readonly sales: SalesAnalyticsService,
        private readonly customers: CustomerAnalyticsService,
        private readonly products: ProductAnalyticsService,
        private readonly orders: OrderAnalyticsService,
        private readonly alerts: DashboardAlertsService,
    ) {}

    getOverview(storeId: string, query: AnalyticsQueryDto) {
        return this.sales.getOverview(storeId, query);
    }

    getSalesChart(storeId: string, query: AnalyticsQueryDto) {
        return this.sales.getSalesChart(storeId, query);
    }

    getSalesHeatmap(storeId: string, query: AnalyticsQueryDto) {
        return this.sales.getSalesHeatmap(storeId, query);
    }

    getSalesByCategory(storeId: string, query: AnalyticsQueryDto) {
        return this.sales.getSalesByCategory(storeId, query);
    }

    getTopCustomers(storeId: string, query: AnalyticsQueryDto) {
        return this.customers.getTopCustomers(storeId, query);
    }

    getCustomerSegments(storeId: string) {
        return this.customers.getCustomerSegments(storeId);
    }

    getAtRiskCustomers(storeId: string, query: AtRiskCustomersQueryDto) {
        return this.customers.getAtRiskCustomers(storeId, query);
    }

    getTopProducts(storeId: string, query: AnalyticsQueryDto) {
        return this.products.getTopProducts(storeId, query);
    }

    getProductMargin(storeId: string, query: AnalyticsQueryDto) {
        return this.products.getProductMargin(storeId, query);
    }

    getOrdersByStatus(storeId: string, query: AnalyticsQueryDto) {
        return this.orders.getOrdersByStatus(storeId, query);
    }

    getDashboardAlerts(storeId: string) {
        return this.alerts.getDashboardAlerts(storeId);
    }
}
