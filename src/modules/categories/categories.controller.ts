import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { AuthGuard, StoreAccessGuard } from '../../core/guards';

@ApiTags('categories')
@Controller('stores/:storeId/categories')
@UseGuards(AuthGuard, StoreAccessGuard)
@ApiBearerAuth()
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Get()
    async findAll(@Param('storeId') storeId: string) {
        return this.categoriesService.findAll(storeId);
    }

    @Get(':categoryId')
    async findById(@Param('storeId') storeId: string, @Param('categoryId') categoryId: string) {
        return this.categoriesService.findById(storeId, categoryId);
    }

    @Post()
    async create(@Param('storeId') storeId: string, @Body() data: { name: string; slug: string; description?: string }) {
        return this.categoriesService.create(storeId, data);
    }

    @Patch(':categoryId')
    async update(@Param('storeId') storeId: string, @Param('categoryId') categoryId: string, @Body() data: { name?: string }) {
        return this.categoriesService.update(storeId, categoryId, data);
    }

    @Delete(':categoryId')
    async delete(@Param('storeId') storeId: string, @Param('categoryId') categoryId: string) {
        return this.categoriesService.delete(storeId, categoryId);
    }
}
