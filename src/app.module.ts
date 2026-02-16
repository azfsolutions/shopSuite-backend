import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { CoreModule } from './core/core.module';
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

        // Database
        PrismaModule,

        // Core
        CoreModule,

        // Authentication (Better Auth)
        BetterAuthModule,

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
    ],
})
export class AppModule { }
