import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { AuthGuard, StoreAccessGuard, GlobalRoleGuard } from '../../core/guards';
import { CurrentUser, RequireGlobalRole } from '../../core/decorators';

@ApiTags('orders')
@Controller('stores/:storeId/orders')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    async findAll(
        @Param('storeId') storeId: string,
        @Query('status') status?: string,
        @Query('page') page?: number
    ) {
        return this.ordersService.findAll(storeId, status, page);
    }

    @Get(':orderId')
    async findById(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string
    ) {
        return this.ordersService.findById(storeId, orderId);
    }

    @Patch(':orderId/status')
    async updateStatus(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @Body('status') status: string,
        @CurrentUser('id') userId: string,
    ) {
        return this.ordersService.updateStatus(storeId, orderId, status, userId);
    }
}
