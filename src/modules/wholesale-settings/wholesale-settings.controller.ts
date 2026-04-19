import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WholesaleSettingsService } from './wholesale-settings.service';
import { UpdateWholesaleSettingsDto } from './dto/update-wholesale-settings.dto';
import { AuthGuard, GlobalRoleGuard, RolesGuard, StoreAccessGuard } from '../../core/guards';
import { RequireGlobalRole, Roles } from '../../core/decorators';
import { StoreRole } from '@prisma/client';

@ApiTags('wholesale-settings')
@Controller('stores/:storeId/wholesale/settings')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard, RolesGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class WholesaleSettingsController {
    constructor(private readonly service: WholesaleSettingsService) {}

    @Get()
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async get(@Param('storeId') storeId: string) {
        return this.service.getOrCreate(storeId);
    }

    @Put()
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async update(@Param('storeId') storeId: string, @Body() dto: UpdateWholesaleSettingsDto) {
        return this.service.update(storeId, dto);
    }
}
