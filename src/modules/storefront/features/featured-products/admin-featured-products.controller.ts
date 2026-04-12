import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard, GlobalRoleGuard } from '../../../../core/guards';
import { RequireGlobalRole, CurrentUser } from '../../../../core/decorators';
import { PrismaService } from '../../../../database/prisma.service';
import {
    UpdateFeaturedConfigDto,
    AddManualFeaturedProductDto,
    UpdateFeaturedProductPositionDto,
} from './dto/featured-products.dto';
import { FeaturedProductsService } from './featured-products.service';

@ApiTags('admin/featured-products')
@Controller('admin/stores/:slug/featured-products')
@UseGuards(AuthGuard, GlobalRoleGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminFeaturedProductsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly featuredProductsService: FeaturedProductsService,
    ) { }

    /**
     * Resuelve slug → storeId y valida que el usuario sea owner/member.
     * Atomic: evita TOCTOU usando una sola query con OR.
     */
    private async resolveStoreBySlug(userId: string, slug: string): Promise<string> {
        const store = await this.prisma.store.findFirst({
            where: {
                slug,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true },
        });

        if (!store) {
            // Distinguir entre "no existe" y "no tienes acceso"
            const exists = await this.prisma.store.findUnique({
                where: { slug },
                select: { id: true },
            });
            if (!exists) {
                throw new NotFoundException('Tienda no encontrada');
            }
            throw new ForbiddenException('No tienes acceso a esta tienda');
        }

        return store.id;
    }

    // ===========================================================================
    // CONFIG MANAGEMENT
    // ===========================================================================

    @Get('config')
    @ApiOperation({ summary: 'Get featured products configuration' })
    async getConfig(
        @CurrentUser('id') userId: string,
        @Param('slug') slug: string,
    ) {
        const storeId = await this.resolveStoreBySlug(userId, slug);
        return this.featuredProductsService.getFeaturedConfig(storeId);
    }

    @Put('config')
    @ApiOperation({ summary: 'Update featured products configuration' })
    async updateConfig(
        @CurrentUser('id') userId: string,
        @Param('slug') slug: string,
        @Body() dto: UpdateFeaturedConfigDto,
    ) {
        const storeId = await this.resolveStoreBySlug(userId, slug);
        return this.featuredProductsService.updateFeaturedConfig(storeId, dto);
    }

    // ===========================================================================
    // MANUAL FEATURED PRODUCTS MANAGEMENT
    // ===========================================================================

    @Get('manual')
    @ApiOperation({ summary: 'Get all manually featured products' })
    async getManualFeatured(
        @CurrentUser('id') userId: string,
        @Param('slug') slug: string,
    ) {
        const storeId = await this.resolveStoreBySlug(userId, slug);
        return this.featuredProductsService.getManualFeaturedProducts(storeId);
    }

    @Post('manual')
    @ApiOperation({ summary: 'Add a product to manual featured' })
    async addManualFeatured(
        @CurrentUser('id') userId: string,
        @Param('slug') slug: string,
        @Body() dto: AddManualFeaturedProductDto,
    ) {
        const storeId = await this.resolveStoreBySlug(userId, slug);
        return this.featuredProductsService.addManualFeaturedProduct(storeId, dto);
    }

    @Delete('manual/:productId')
    @ApiOperation({ summary: 'Remove a product from manual featured' })
    async removeManualFeatured(
        @CurrentUser('id') userId: string,
        @Param('slug') slug: string,
        @Param('productId') productId: string,
    ) {
        const storeId = await this.resolveStoreBySlug(userId, slug);
        return this.featuredProductsService.removeManualFeaturedProduct(storeId, productId);
    }

    @Put('manual/:productId/position')
    @ApiOperation({ summary: 'Update position of a manually featured product' })
    async updatePosition(
        @CurrentUser('id') userId: string,
        @Param('slug') slug: string,
        @Param('productId') productId: string,
        @Body() dto: UpdateFeaturedProductPositionDto,
    ) {
        const storeId = await this.resolveStoreBySlug(userId, slug);
        return this.featuredProductsService.updateFeaturedProductPosition(
            storeId,
            productId,
            dto.position,
        );
    }

    // ===========================================================================
    // PREVIEW - Get all featured products (manual + automatic)
    // ===========================================================================

    @Get('preview')
    @ApiOperation({ summary: 'Preview all featured products (manual + automatic)' })
    async previewFeatured(
        @CurrentUser('id') userId: string,
        @Param('slug') slug: string,
    ) {
        const storeId = await this.resolveStoreBySlug(userId, slug);
        return this.featuredProductsService.getFeaturedProducts(storeId);
    }
}
