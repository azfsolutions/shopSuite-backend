import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { AuthGuard, StoreAccessGuard } from '../../core/guards';

@ApiTags('customers')
@Controller('stores/:storeId/customers')
@UseGuards(AuthGuard, StoreAccessGuard)
@ApiBearerAuth()
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Get()
    async findAll(@Param('storeId') storeId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
        return this.customersService.findAll(storeId, page, limit);
    }

    @Get(':customerId')
    async findById(@Param('storeId') storeId: string, @Param('customerId') customerId: string) {
        return this.customersService.findById(storeId, customerId);
    }
}
