import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StorefrontService } from '../../core/storefront.service';
import { AuthGuard } from '../../../../core/guards';
import { UpdateFeaturedConfigDto, AddManualFeaturedProductDto, UpdateFeaturedProductPositionDto } from './dto/featured-products.dto';
import { FeaturedProductsService } from './featured-products.service';

@ApiTags('admin/featured-products')
@Controller('admin/stores/:slug/featured-products')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AdminFeaturedProductsController {
    constructor(
        private readonly storefrontService: StorefrontService,
        private readonly featuredProductsService: FeaturedProductsService
    ) { }

    // ===========================================================================
    // CONFIG MANAGEMENT
    // ===========================================================================

    @Get('config')
    @ApiOperation({ summary: 'Get featured products configuration' })
    async getConfig(@Param('slug') slug: string) {
        const store = await this.storefrontService.getStoreBySlug(slug);
        return this.featuredProductsService.getFeaturedConfig(store.id);
    }

    @Put('config')
    @ApiOperation({ summary: 'Update featured products configuration' })
    async updateConfig(
        @Param('slug') slug: string,
        @Body() dto: UpdateFeaturedConfigDto
    ) {
        const store = await this.storefrontService.getStoreBySlug(slug);
        return this.featuredProductsService.updateFeaturedConfig(store.id, dto);
    }

    // ===========================================================================
    // MANUAL FEATURED PRODUCTS MANAGEMENT
    // ===========================================================================

    @Get('manual')
    @ApiOperation({ summary: 'Get all manually featured products' })
    async getManualFeatured(@Param('slug') slug: string) {
        const store = await this.storefrontService.getStoreBySlug(slug);
        return this.featuredProductsService.getManualFeaturedProducts(store.id);
    }

    @Post('manual')
    @ApiOperation({ summary: 'Add a product to manual featured' })
    async addManualFeatured(
        @Param('slug') slug: string,
        @Body() dto: AddManualFeaturedProductDto
    ) {
        const store = await this.storefrontService.getStoreBySlug(slug);
        return this.featuredProductsService.addManualFeaturedProduct(store.id, dto);
    }

    @Delete('manual/:productId')
    @ApiOperation({ summary: 'Remove a product from manual featured' })
    async removeManualFeatured(
        @Param('slug') slug: string,
        @Param('productId') productId: string
    ) {
        const store = await this.storefrontService.getStoreBySlug(slug);
        return this.featuredProductsService.removeManualFeaturedProduct(store.id, productId);
    }

    @Put('manual/:productId/position')
    @ApiOperation({ summary: 'Update position of a manually featured product' })
    async updatePosition(
        @Param('slug') slug: string,
        @Param('productId') productId: string,
        @Body() dto: UpdateFeaturedProductPositionDto
    ) {
        const store = await this.storefrontService.getStoreBySlug(slug);
        return this.featuredProductsService.updateFeaturedProductPosition(store.id, productId, dto.position);
    }

    // ===========================================================================
    // PREVIEW - Get all featured products (manual + automatic)
    // ===========================================================================

    @Get('preview')
    @ApiOperation({ summary: 'Preview all featured products (manual + automatic)' })
    async previewFeatured(@Param('slug') slug: string) {
        const store = await this.storefrontService.getStoreBySlug(slug);
        return this.featuredProductsService.getFeaturedProducts(store.id);
    }
}
