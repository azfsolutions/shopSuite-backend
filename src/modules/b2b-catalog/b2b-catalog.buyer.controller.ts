import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { B2BCatalogService } from './b2b-catalog.service';
import { BuyerAuthGuard } from '../buyer-auth/guards/buyer-auth.guard';
import { WholesaleRequestsService } from '../wholesale-requests/wholesale-requests.service';

@ApiTags('b2b-catalog-buyer')
@Controller('storefront/:slug/vip/catalog')
@UseGuards(BuyerAuthGuard)
@ApiCookieAuth('buyer_token')
export class B2BCatalogBuyerController {
    constructor(
        private readonly service: B2BCatalogService,
        private readonly requests: WholesaleRequestsService,
    ) {}

    @Get()
    async getMyCatalog(@Param('slug') slug: string, @Req() req: any) {
        const storeId = await this.requests.resolveStoreIdBySlug(slug);
        return this.service.getForBuyer(storeId, req.buyerUser.id);
    }
}
