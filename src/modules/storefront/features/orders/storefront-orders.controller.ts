import {
    Controller,
    Post,
    Body,
    Param,
    Req,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { StorefrontOrdersService } from './storefront-orders.service';
import { CreateStorefrontOrderDto } from './dto/create-storefront-order.dto';
import { StorefrontService } from '../../core/storefront.service';
import { OptionalAuthGuard } from '../../../better-auth/guards/optional-auth.guard';

@UseGuards(OptionalAuthGuard)
@Controller('storefront/:storeSlug/orders')
export class StorefrontOrdersController {
    constructor(
        private readonly ordersService: StorefrontOrdersService,
        private readonly storefrontService: StorefrontService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createOrder(
        @Param('storeSlug') storeSlug: string,
        @Body() dto: CreateStorefrontOrderDto,
        @Req() req: Request & { user?: { id: string } },
    ) {
        const store = await this.storefrontService.getStoreBySlug(storeSlug);
        const userId = req.user?.id ?? undefined;
        return this.ordersService.createOrder(store.id, dto, userId);
    }
}
