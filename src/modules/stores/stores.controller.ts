import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto, SetCustomDomainDto } from './dto/store.dto';
import { AuthGuard, StoreAccessGuard, GlobalRoleGuard } from '../../core/guards';
import { CurrentUser, Roles, RequireGlobalRole } from '../../core/decorators';

@ApiTags('stores')
@Controller('stores')
@UseGuards(AuthGuard, GlobalRoleGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class StoresController {
    constructor(private readonly storesService: StoresService) { }

    @Get()
    @ApiOperation({ summary: 'Get all stores for current user' })
    async findAll(@CurrentUser('id') userId: string) {
        return this.storesService.findAll(userId);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new store' })
    async create(
        @CurrentUser('id') userId: string,
        @Body() createStoreDto: CreateStoreDto,
    ) {
        return this.storesService.create(userId, createStoreDto);
    }

    @Get(':storeId')
    @UseGuards(StoreAccessGuard)
    @ApiOperation({ summary: 'Get store by ID' })
    async findById(@Param('storeId') storeId: string) {
        return this.storesService.findById(storeId);
    }

    @Patch(':storeId')
    @UseGuards(StoreAccessGuard)
    @Roles('OWNER', 'ADMIN')
    @ApiOperation({ summary: 'Update store' })
    async update(
        @Param('storeId') storeId: string,
        @Body() updateStoreDto: UpdateStoreDto,
    ) {
        return this.storesService.update(storeId, updateStoreDto);
    }

    @Delete(':storeId')
    @UseGuards(StoreAccessGuard)
    @Roles('OWNER')
    @ApiOperation({ summary: 'Delete store (soft delete)' })
    async delete(@Param('storeId') storeId: string) {
        return this.storesService.delete(storeId);
    }

    @Get(':storeId/dashboard')
    @UseGuards(StoreAccessGuard)
    @ApiOperation({ summary: 'Get store dashboard stats' })
    async getDashboard(@Param('storeId') storeId: string) {
        return this.storesService.getDashboardStats(storeId);
    }

    @Patch(':storeId/custom-domain')
    @UseGuards(StoreAccessGuard)
    @Roles('OWNER', 'ADMIN')
    @ApiOperation({ summary: 'Set custom domain for store' })
    async setCustomDomain(
        @Param('storeId') storeId: string,
        @Body() dto: SetCustomDomainDto,
    ) {
        return this.storesService.setCustomDomain(storeId, dto);
    }

    @Delete(':storeId/custom-domain')
    @UseGuards(StoreAccessGuard)
    @Roles('OWNER', 'ADMIN')
    @ApiOperation({ summary: 'Remove custom domain from store' })
    async removeCustomDomain(@Param('storeId') storeId: string) {
        return this.storesService.removeCustomDomain(storeId);
    }
}
