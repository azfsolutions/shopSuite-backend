import { Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { B2BQuotesService } from './b2b-quotes.service';
import { BuyerAuthGuard } from '../buyer-auth/guards/buyer-auth.guard';
import { WholesaleRequestsService } from '../wholesale-requests/wholesale-requests.service';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('b2b-quotes-buyer')
@Controller('storefront/:slug/vip/quotes')
@UseGuards(BuyerAuthGuard)
@ApiCookieAuth('buyer_token')
export class B2BQuotesBuyerController {
    constructor(
        private readonly service: B2BQuotesService,
        private readonly requests: WholesaleRequestsService,
        private readonly prisma: PrismaService,
    ) {}

    @Get()
    async list(@Param('slug') slug: string, @Req() req: any) {
        const { storeId, customerId } = await this.resolveBuyer(slug, req.buyerUser.id);
        return this.service.listForBuyer(storeId, customerId);
    }

    @Get(':quoteId')
    async get(
        @Param('slug') slug: string,
        @Param('quoteId') quoteId: string,
        @Req() req: any,
    ) {
        const { storeId, customerId } = await this.resolveBuyer(slug, req.buyerUser.id);
        await this.service.markViewed(storeId, customerId, quoteId);
        return this.service.getForStore(storeId, quoteId);
    }

    @Post(':quoteId/accept')
    async accept(
        @Param('slug') slug: string,
        @Param('quoteId') quoteId: string,
        @Req() req: any,
    ) {
        const { storeId, customerId } = await this.resolveBuyer(slug, req.buyerUser.id);
        return this.service.accept(storeId, customerId, quoteId);
    }

    @Post(':quoteId/reject')
    async reject(
        @Param('slug') slug: string,
        @Param('quoteId') quoteId: string,
        @Req() req: any,
    ) {
        const { storeId, customerId } = await this.resolveBuyer(slug, req.buyerUser.id);
        return this.service.reject(storeId, customerId, quoteId);
    }

    @Get(':quoteId/pdf')
    async pdf(
        @Param('slug') slug: string,
        @Param('quoteId') quoteId: string,
        @Req() req: any,
        @Res() res: Response,
    ) {
        const { storeId } = await this.resolveBuyer(slug, req.buyerUser.id);
        const buffer = await this.service.renderPdf(storeId, quoteId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="quote-${quoteId}.pdf"`);
        res.send(buffer);
    }

    private async resolveBuyer(slug: string, buyerUserId: string) {
        const storeId = await this.requests.resolveStoreIdBySlug(slug);
        const customer = await this.prisma.customer.findFirst({
            where: { storeId, buyerUserId, deletedAt: null, customerType: 'B2B_VIP' },
            select: { id: true },
        });
        if (!customer) {
            throw new Error('Cliente VIP no encontrado');
        }
        return { storeId, customerId: customer.id };
    }
}
