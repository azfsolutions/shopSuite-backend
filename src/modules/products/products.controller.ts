import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, AddProductImageDto, UpdateExclusiveDto } from './dto';
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
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create new product' })
    @ApiResponse({ status: 201, description: 'Product created' })
    async create(@Param('storeId') storeId: string, @Body() dto: CreateProductDto) {
        return this.productsService.create(storeId, dto);
    }

    @Patch(':productId')
    @ApiOperation({ summary: 'Update product' })
    async update(
        @Param('storeId') storeId: string,
        @Param('productId') productId: string,
        @Body() dto: UpdateProductDto,
    ) {
        return this.productsService.update(storeId, productId, dto);
    }

    @Delete(':productId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete product' })
    @ApiResponse({ status: 204, description: 'Product deleted' })
    async delete(@Param('storeId') storeId: string, @Param('productId') productId: string) {
        return this.productsService.delete(storeId, productId);
    }

    @Post(':productId/images')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add image to product' })
    @ApiResponse({ status: 201, description: 'Image added' })
    async addImage(
        @Param('storeId') storeId: string,
        @Param('productId') productId: string,
        @Body() dto: AddProductImageDto,
    ) {
        return this.productsService.addImage(storeId, productId, dto.url, dto.position);
    }

    @Delete(':productId/images/:imageId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete product image' })
    @ApiResponse({ status: 204, description: 'Image deleted' })
    async deleteImage(
        @Param('storeId') storeId: string,
        @Param('productId') productId: string,
        @Param('imageId') imageId: string,
    ) {
        return this.productsService.deleteImage(storeId, productId, imageId);
    }

    @Patch(':productId/exclusive')
    @ApiOperation({ summary: 'Toggle exclusive status' })
    async updateExclusive(
        @Param('storeId') storeId: string,
        @Param('productId') productId: string,
        @Body() dto: UpdateExclusiveDto,
    ) {
        return this.productsService.updateExclusiveStatus(storeId, productId, dto.isExclusive);
    }
}
