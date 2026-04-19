import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerTiersService } from './customer-tiers.service';
import { SetTierDto } from './dto/set-tier.dto';
import { AuthGuard, GlobalRoleGuard, RolesGuard, StoreAccessGuard } from '../../core/guards';
import { CurrentUser, RequireGlobalRole, Roles } from '../../core/decorators';
import { StoreRole } from '@prisma/client';

@ApiTags('customer-tiers')
@Controller('stores/:storeId/customers/:customerId/tier')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard, RolesGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class CustomerTiersController {
    constructor(private readonly service: CustomerTiersService) {}

    @Patch()
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async setTier(
        @Param('storeId') storeId: string,
        @Param('customerId') customerId: string,
        @Body() dto: SetTierDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.service.setTier(storeId, customerId, dto.customerType, userId);
    }
}
