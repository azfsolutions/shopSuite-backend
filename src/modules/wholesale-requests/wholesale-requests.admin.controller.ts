import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WholesaleRequestsService } from './wholesale-requests.service';
import { UpdateWholesaleRequestDto } from './dto/update-wholesale-request.dto';
import { AuthGuard, GlobalRoleGuard, RolesGuard, StoreAccessGuard } from '../../core/guards';
import { CurrentUser, RequireGlobalRole, Roles } from '../../core/decorators';
import { StoreRole, WholesaleRequestStatus } from '@prisma/client';

@ApiTags('wholesale-requests-admin')
@Controller('stores/:storeId/wholesale/requests')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard, RolesGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class WholesaleRequestsAdminController {
    constructor(private readonly service: WholesaleRequestsService) {}

    @Get()
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async list(
        @Param('storeId') storeId: string,
        @Query('status') status?: WholesaleRequestStatus,
    ) {
        return this.service.listForStore(storeId, status);
    }

    @Get(':requestId')
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async get(
        @Param('storeId') storeId: string,
        @Param('requestId') requestId: string,
    ) {
        return this.service.getForStore(storeId, requestId);
    }

    @Patch(':requestId')
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async update(
        @Param('storeId') storeId: string,
        @Param('requestId') requestId: string,
        @Body() dto: UpdateWholesaleRequestDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.service.updateForStore(storeId, requestId, dto, userId);
    }
}
