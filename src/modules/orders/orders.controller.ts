import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto';
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
    @ApiOperation({ summary: 'Get all orders for store' })
    async findAll(
        @Param('storeId') storeId: string,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const p = page ? parseInt(page, 10) : 1;
        const l = limit ? parseInt(limit, 10) : 20;
        return this.ordersService.findAll(storeId, status, p, l);
    }

    @Get(':orderId')
    @ApiOperation({ summary: 'Get order by ID' })
    async findById(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
    ) {
        return this.ordersService.findById(storeId, orderId);
    }

    @Patch(':orderId/status')
    @ApiOperation({ summary: 'Update order status' })
    async updateStatus(
        @Param('storeId') storeId: string,
        @Param('orderId') orderId: string,
        @Body() dto: UpdateOrderStatusDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.ordersService.updateStatus(storeId, orderId, dto.status, userId);
    }
}
