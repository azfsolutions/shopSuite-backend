import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { ShippingService } from '@/modules/shipping/shipping.service';
import { Public } from '@/core/decorators';
import { IsString, IsNumber, Min } from 'class-validator';
import { FeaturedProductsService } from '../features/featured-products/featured-products.service';

class ValidateCouponDto {
    @IsString()
    code: string;

    @IsNumber()
    @Min(0)
    cartTotal: number;
}

@ApiTags('storefront')
@Controller('storefront/:storeSlug')
@Public()
export class StorefrontController {
    constructor(
        private readonly storefrontService: StorefrontService,
        private readonly couponsService: CouponsService,
        private readonly shippingService: ShippingService,
        private readonly featuredProductsService: FeaturedProductsService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get store info by slug' })
    async getStore(@Param('storeSlug') storeSlug: string) {
        return this.storefrontService.getStoreBySlug(storeSlug);
    }

    @Get('categories')
    @ApiOperation({ summary: 'Get store categories' })
    async getCategories(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getCategories(store.id);
    }

    @Get('products')
    @ApiOperation({ summary: 'Get store products' })
    async getProducts(
        @Param('storeSlug') storeSlug: string,
        @Query('category') category?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getProducts(store.id, category, page, limit);
    }

    @Get('products/featured')
    @ApiOperation({ summary: 'Get featured products' })
    async getFeaturedProducts(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.featuredProductsService.getFeaturedProducts(store.id);
    }

    @Get('products/new-arrivals')
    @ApiOperation({ summary: 'Get new arrival products' })
    async getNewArrivals(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getNewArrivals(store.id);
    }

    @Get('products/trending')
    @ApiOperation({ summary: 'Get trending products (best sellers)' })
    async getTrendingProducts(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getTrendingProducts(store.id);
    }

    @Get('products/exclusive')
    @ApiOperation({ summary: 'Get exclusive/limited edition products' })
    async getExclusiveProducts(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getExclusiveProducts(store.id);
    }

    @Get('products/:productSlug')
    @ApiOperation({ summary: 'Get product by slug' })
    async getProduct(@Param('storeSlug') storeSlug: string, @Param('productSlug') productSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getProductBySlug(store.id, productSlug);
    }

    @Post('validate-coupon')
    @ApiOperation({ summary: 'Validate a coupon code' })
    async validateCoupon(
        @Param('storeSlug') storeSlug: string,
        @Body() dto: ValidateCouponDto,
    ) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.couponsService.validate(store.id, dto);
    }

    @Get('shipping-methods')
    @ApiOperation({ summary: 'Get available shipping methods' })
    async getShippingMethods(
        @Param('storeSlug') storeSlug: string,
        @Query('cartTotal') cartTotal?: string,
    ) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        const total = cartTotal ? parseFloat(cartTotal) : 0;
        return this.shippingService.getAvailableForCart(store.id, total);
    }

    // ============================================================
    // STOREFRONT FEATURES - PUBLIC ENDPOINTS
    // ============================================================

    @Get('benefits')
    @ApiOperation({ summary: 'Get active store benefits' })
    async getBenefits(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getActiveBenefits(store.id);
    }

    @Get('settings')
    @ApiOperation({ summary: 'Get public storefront settings' })
    async getStorefrontSettings(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getPublicSettings(store.id);
    }

    @Get('banners')
    @ApiOperation({ summary: 'Get active banners for hero slider' })
    async getBanners(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getActiveBanners(store.id);
    }

    @Get('flash-sales')
    @ApiOperation({ summary: 'Get active flash sales' })
    async getFlashSales(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getActiveFlashSales(store.id);
    }

    @Get('testimonials')
    @ApiOperation({ summary: 'Get featured testimonials' })
    async getTestimonials(@Param('storeSlug') storeSlug: string) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        return this.storefrontService.getFeaturedTestimonials(store.id);
    }
}

