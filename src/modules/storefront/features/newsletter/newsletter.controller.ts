import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    Res,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard, GlobalRoleGuard, StoreAccessGuard } from '../../../../core/guards';
import { CurrentStore, RequireGlobalRole } from '../../../../core/decorators';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

/**
 * Controller para gestionar Newsletter
 */
@ApiTags('Storefront - Newsletter')
@Controller()
export class NewsletterController {
    constructor(private readonly newsletterService: NewsletterService) { }

    // ============================================================
    // ADMIN ENDPOINTS (Requieren autenticación)
    // ============================================================

    @Get('dashboard/stores/:storeId/newsletter')
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Obtener suscriptores con paginación' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @Param('storeId') storeId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 50;
        return this.newsletterService.findAllByStore(storeId, pageNum, limitNum);
    }

    @Get('dashboard/stores/:storeId/newsletter/stats')
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Obtener estadísticas de newsletter' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    async getStats(@Param('storeId') storeId: string) {
        return this.newsletterService.getStats(storeId);
    }

    @Get('dashboard/stores/:storeId/newsletter/export')
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Exportar suscriptores a CSV' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    async exportCsv(
        @Param('storeId') storeId: string,
        @Res() res: Response,
    ) {
        const csv = await this.newsletterService.exportToCsv(storeId);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=newsletter-subscribers.csv',
        );
        res.send(csv);
    }

    @Delete('dashboard/stores/:storeId/newsletter/:subscriberId')
    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar un suscriptor' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'subscriberId', description: 'ID del suscriptor' })
    async delete(@Param('subscriberId') subscriberId: string) {
        return this.newsletterService.delete(subscriberId);
    }

    @Post('dashboard/stores/:storeId/newsletter/broadcast')
    @ApiOperation({ summary: 'Enviar mensaje a todos los suscriptores' })
    @ApiBearerAuth()
    @UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
    @RequireGlobalRole('USER', 'SUPER_ADMIN')
    async broadcast(
        @CurrentStore('id') storeId: string,
        @Body() body: { subject: string; message: string },
    ) {
        return this.newsletterService.broadcast(storeId, body.subject, body.message);
    }

    // ============================================================
    // PUBLIC ENDPOINTS (No requieren autenticación)
    // ============================================================

    @Post('storefront/:storeSlug/newsletter/subscribe')
    @ApiOperation({ summary: 'Suscribirse al newsletter (público)' })
    @ApiParam({ name: 'storeSlug', description: 'Slug de la tienda' })
    async subscribe(
        @Param('storeSlug') storeSlug: string,
        @Body() subscribeDto: SubscribeNewsletterDto,
    ) {
        // Primero obtenemos el storeId del slug
        const { PrismaService } = await import('../../../../database/prisma.service');
        const prisma = new PrismaService();

        const store = await prisma.store.findUnique({
            where: { slug: storeSlug },
        });

        if (!store) {
            throw new Error('Tienda no encontrada');
        }

        return this.newsletterService.subscribe(store.id, subscribeDto);
    }
}
