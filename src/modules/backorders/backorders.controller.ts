import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BackordersService } from './backorders.service';
import { CreateBackorderDto } from './dto/create-backorder.dto';
import { FulfillBackorderDto } from './dto/fulfill-backorder.dto';
import { AuthGuard, GlobalRoleGuard, RolesGuard, StoreAccessGuard } from '../../core/guards';
import { RequireGlobalRole, Roles } from '../../core/decorators';
import { BackorderStatus, StoreRole } from '@prisma/client';

@ApiTags('backorders')
@Controller('stores/:storeId/backorders')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard, RolesGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class BackordersController {
    constructor(private readonly service: BackordersService) {}

    @Get()
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async list(
        @Param('storeId') storeId: string,
        @Query('status') status?: BackorderStatus,
    ) {
        return this.service.listForStore(storeId, status);
    }

    @Post()
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async create(
        @Param('storeId') storeId: string,
        @Body() dto: CreateBackorderDto,
    ) {
        return this.service.create(storeId, dto);
    }

    @Patch(':backorderId/fulfill')
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async fulfill(
        @Param('storeId') storeId: string,
        @Param('backorderId') backorderId: string,
        @Body() dto: FulfillBackorderDto,
    ) {
        return this.service.fulfill(storeId, backorderId, dto.quantity);
    }

    @Patch(':backorderId/cancel')
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async cancel(
        @Param('storeId') storeId: string,
        @Param('backorderId') backorderId: string,
    ) {
        return this.service.cancel(storeId, backorderId);
    }
}
