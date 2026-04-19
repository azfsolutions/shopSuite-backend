import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { B2BQuotesService } from './b2b-quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { AuthGuard, GlobalRoleGuard, RolesGuard, StoreAccessGuard } from '../../core/guards';
import { RequireGlobalRole, Roles } from '../../core/decorators';
import { B2BQuoteStatus, StoreRole } from '@prisma/client';

@ApiTags('b2b-quotes-admin')
@Controller('stores/:storeId/b2b-quotes')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard, RolesGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class B2BQuotesAdminController {
    constructor(private readonly service: B2BQuotesService) {}

    @Get()
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async list(
        @Param('storeId') storeId: string,
        @Query('status') status?: B2BQuoteStatus,
    ) {
        return this.service.listForStore(storeId, status);
    }

    @Get(':quoteId')
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async get(
        @Param('storeId') storeId: string,
        @Param('quoteId') quoteId: string,
    ) {
        return this.service.getForStore(storeId, quoteId);
    }

    @Post()
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async create(
        @Param('storeId') storeId: string,
        @Body() dto: CreateQuoteDto,
    ) {
        return this.service.create(storeId, dto);
    }

    @Post(':quoteId/send')
    @Roles(StoreRole.MANAGER, StoreRole.ADMIN)
    async send(
        @Param('storeId') storeId: string,
        @Param('quoteId') quoteId: string,
    ) {
        return this.service.send(storeId, quoteId);
    }

    @Get(':quoteId/pdf')
    @Roles(StoreRole.SUPPORT, StoreRole.EDITOR, StoreRole.MANAGER, StoreRole.ADMIN)
    async pdf(
        @Param('storeId') storeId: string,
        @Param('quoteId') quoteId: string,
        @Res() res: Response,
    ) {
        const buffer = await this.service.renderPdf(storeId, quoteId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="quote-${quoteId}.pdf"`);
        res.send(buffer);
    }
}
