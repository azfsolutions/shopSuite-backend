import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StockReservationsService } from './stock-reservations.service';
import { AuthGuard, GlobalRoleGuard, RolesGuard, StoreAccessGuard } from '../../core/guards';
import { RequireGlobalRole, Roles } from '../../core/decorators';
import { StoreRole } from '@prisma/client';

@ApiTags('stock-reservations')
@Controller('stores/:storeId/products/:productId/stock')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard, RolesGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class StockReservationsController {
    constructor(private readonly service: StockReservationsService) {}

    @Get('available')
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async getAvailable(
        @Param('storeId') storeId: string,
        @Param('productId') productId: string,
        @Query('customerId') customerId?: string,
    ) {
        return this.service.getAvailable(storeId, productId, customerId);
    }
}
