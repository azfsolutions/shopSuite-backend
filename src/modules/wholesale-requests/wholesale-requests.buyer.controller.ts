import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { WholesaleRequestsService } from './wholesale-requests.service';
import { CreateWholesaleRequestDto } from './dto/create-wholesale-request.dto';
import { BuyerAuthGuard } from '../buyer-auth/guards/buyer-auth.guard';

@ApiTags('wholesale-requests-buyer')
@Controller('storefront/:slug/wholesale/requests')
@UseGuards(BuyerAuthGuard)
@ApiCookieAuth('buyer_token')
export class WholesaleRequestsBuyerController {
    constructor(private readonly service: WholesaleRequestsService) {}

    @Post()
    async create(
        @Param('slug') slug: string,
        @Body() dto: CreateWholesaleRequestDto,
        @Req() req: any,
    ) {
        const storeId = await this.service.resolveStoreIdBySlug(slug);
        return this.service.createFromBuyer(storeId, req.buyerUser.id, dto);
    }

    @Get()
    async listMine(@Req() req: any) {
        return this.service.listForBuyer(req.buyerUser.id);
    }

    @Get(':requestId')
    async getMine(@Param('requestId') requestId: string, @Req() req: any) {
        return this.service.getForBuyer(req.buyerUser.id, requestId);
    }
}
