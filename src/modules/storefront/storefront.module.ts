import { Module } from '@nestjs/common';
import { StorefrontController } from './core/storefront.controller';
import { StorefrontService } from './core/storefront.service';

// Features
import { AdminFeaturedProductsController } from './features/featured-products/admin-featured-products.controller';
import { BannersController } from './features/banners/banners.controller';
import { BannersService } from './features/banners/banners.service';
import { BenefitsController } from './features/benefits/benefits.controller';
import { BenefitsService } from './features/benefits/benefits.service';
import { FlashSalesController } from './features/flash-sales/flash-sales.controller';
import { FlashSalesService } from './features/flash-sales/flash-sales.service';
import { NewsletterController } from './features/newsletter/newsletter.controller';
import { NewsletterService } from './features/newsletter/newsletter.service';
import { SettingsController } from './features/settings/settings.controller';
import { SettingsService } from './features/settings/settings.service';
import { TestimonialsController } from './features/testimonials/testimonials.controller';
import { TestimonialsService } from './features/testimonials/testimonials.service';
import { FeaturedProductsService } from './features/featured-products/featured-products.service';

import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
    imports: [CouponsModule, ShippingModule],
    controllers: [
        StorefrontController,
        AdminFeaturedProductsController,
        BannersController,
        BenefitsController,
        FlashSalesController,
        NewsletterController,
        SettingsController,
        TestimonialsController
    ],
    providers: [
        StorefrontService,
        BannersService,
        BenefitsService,
        FlashSalesService,
        NewsletterService,
        SettingsService,
        TestimonialsService,
        FeaturedProductsService
    ],
    exports: [FeaturedProductsService]
})
export class StorefrontModule { }
