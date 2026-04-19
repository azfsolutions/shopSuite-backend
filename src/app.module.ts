import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './database/prisma.module';
import { CoreModule } from './core/core.module';
import { RedisModule } from './modules/redis/redis.module';
import { BetterAuthModule } from './modules/better-auth/better-auth.module';
import { UsersModule } from './modules/users/users.module';
import { StoresModule } from './modules/stores/stores.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { BuyerAccountModule } from './modules/buyer-account/buyer-account.module';
import { TeamModule } from './modules/team/team.module';
import { VariantsModule } from './modules/variants/variants.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AuditModule } from './modules/audit/audit.module';
import { BuyerAuthModule } from './modules/buyer-auth/buyer-auth.module';
import { BuyerNotificationsModule } from './modules/buyer-notifications/buyer-notifications.module';
import { WholesaleSettingsModule } from './modules/wholesale-settings/wholesale-settings.module';
import { CustomerTiersModule } from './modules/customer-tiers/customer-tiers.module';
import { WholesaleRequestsModule } from './modules/wholesale-requests/wholesale-requests.module';
import { WholesaleChatModule } from './modules/wholesale-chat/wholesale-chat.module';
import { B2BCatalogModule } from './modules/b2b-catalog/b2b-catalog.module';
import { StockReservationsModule } from './modules/stock-reservations/stock-reservations.module';
import { B2BQuotesModule } from './modules/b2b-quotes/b2b-quotes.module';
import { BackordersModule } from './modules/backorders/backorders.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Rate Limiting
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),

        // Scheduled jobs (cron)
        ScheduleModule.forRoot(),

        // Database
        PrismaModule,

        // Core
        CoreModule,

        // Redis — @Global, must be before any module that uses RedisService
        RedisModule,

        // Authentication (Better Auth)
        BetterAuthModule,

        // Buyer Authentication
        BuyerAuthModule,

        // Buyer Notifications
        BuyerNotificationsModule,

        // Feature Modules
        UsersModule,
        StoresModule,
        CategoriesModule,
        ProductsModule,
        CustomersModule,
        OrdersModule,
        CouponsModule,
        ShippingModule,
        AnalyticsModule,
        StorefrontModule,
        BuyerAccountModule,
        TeamModule,
        VariantsModule,
        WishlistModule,
        ReviewsModule,
        SubscriptionsModule,
        AuditModule,

        // Wholesale B2B
        WholesaleSettingsModule,
        CustomerTiersModule,
        WholesaleRequestsModule,
        WholesaleChatModule,
        B2BCatalogModule,
        StockReservationsModule,
        B2BQuotesModule,
        BackordersModule,
    ],
})
export class AppModule { }
