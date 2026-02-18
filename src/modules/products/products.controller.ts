import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { AuthGuard, StoreAccessGuard, GlobalRoleGuard } from '../../core/guards';
import { RequireGlobalRole } from '../../core/decorators';

@ApiTags('products')
@Controller('stores/:storeId/products')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all products for store' })
    async findAll(
        @Param('storeId') storeId: string,
        @Query('categoryId') categoryId?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.productsService.findAll(storeId, { categoryId, status, search, page, limit });
    }

    @Get(':productId')
    @ApiOperation({ summary: 'Get product by ID' })
    async findById(@Param('storeId') storeId: string, @Param('productId') productId: string) {
        return this.productsService.findById(storeId, productId);
    }

    @Post()
    @ApiOperation({ summary: 'Create new product' })
    async create(
        @Param('storeId') storeId: string,
        @Body() data: { name: string; slug: string; price: number; stock?: number; status?: string }
    ) {
        return this.productsService.create(storeId, data);
    }

    @Patch(':productId')
    @ApiOperation({ summary: 'Update product' })
    async update(
        @Param('storeId') storeId: string,
        @Param('productId') productId: string,
        @Body() data: { name?: string; price?: number }
    ) {
        return this.productsService.update(storeId, productId, data);
    }

    @Delete(':productId')
    @ApiOperation({ summary: 'Delete product' })
    async delete(@Param('storeId') storeId: string, @Param('productId') productId: string) {
        return this.productsService.delete(storeId, productId);
    }

    @Post(':productId/images')
    @ApiOperation({ summary: 'Add image to product' })
    async addImage(@Param('productId') productId: string, @Body() data: { url: string; position?: number }) {
        return this.productsService.addImage(productId, data.url, data.position);
    }

    @Delete(':productId/images/:imageId')
    @ApiOperation({ summary: 'Delete product image' })
    async deleteImage(@Param('imageId') imageId: string) {
        return this.productsService.deleteImage(imageId);
    }

    @Patch(':productId/exclusive')
    @ApiOperation({ summary: 'Toggle exclusive status' })
    async updateExclusive(
        @Param('storeId') storeId: string,
        @Param('productId') productId: string,
        @Body() data: { isExclusive: boolean }
    ) {
        return this.productsService.updateExclusiveStatus(storeId, productId, data.isExclusive);
    }
}
