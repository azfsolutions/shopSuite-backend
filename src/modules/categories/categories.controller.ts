import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { AuthGuard, StoreAccessGuard, GlobalRoleGuard } from '../../core/guards';
import { RequireGlobalRole } from '../../core/decorators';

@ApiTags('categories')
@Controller('stores/:storeId/categories')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all categories for store' })
    async findAll(@Param('storeId') storeId: string) {
        return this.categoriesService.findAll(storeId);
    }

    @Get(':categoryId')
    @ApiOperation({ summary: 'Get category by ID' })
    async findById(@Param('storeId') storeId: string, @Param('categoryId') categoryId: string) {
        return this.categoriesService.findById(storeId, categoryId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create new category' })
    @ApiResponse({ status: 201, description: 'Category created' })
    async create(@Param('storeId') storeId: string, @Body() dto: CreateCategoryDto) {
        return this.categoriesService.create(storeId, dto);
    }

    @Patch(':categoryId')
    @ApiOperation({ summary: 'Update category' })
    async update(
        @Param('storeId') storeId: string,
        @Param('categoryId') categoryId: string,
        @Body() dto: UpdateCategoryDto,
    ) {
        return this.categoriesService.update(storeId, categoryId, dto);
    }

    @Delete(':categoryId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete category' })
    @ApiResponse({ status: 204, description: 'Category deleted' })
    async delete(@Param('storeId') storeId: string, @Param('categoryId') categoryId: string) {
        return this.categoriesService.delete(storeId, categoryId);
    }
}
