import {
    Controller,
    Get,
    Patch,
    Param,
    Query,
    UseGuards,
    Request,
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BuyerNotificationsService } from './buyer-notifications.service';
import { BuyerAuthGuard } from '../buyer-auth/guards/buyer-auth.guard';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('buyer-notifications')
@Controller('storefront/:storeSlug/account/notifications')
@UseGuards(BuyerAuthGuard)
@ApiBearerAuth()
export class BuyerNotificationsController {
    constructor(
        private readonly notificationsService: BuyerNotificationsService,
        private readonly prisma: PrismaService,
    ) {}

    private async getStoreId(storeSlug: string): Promise<string> {
        const store = await this.prisma.store.findUnique({
            where: { slug: storeSlug },
            select: { id: true },
        });
        if (!store) throw new NotFoundException('Tienda no encontrada');
        return store.id;
    }

    @Get()
    @ApiOperation({ summary: 'Listar notificaciones del comprador' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async findAll(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.notificationsService.findAll(
            req.buyerUser.id,
            storeId,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Obtener cantidad de notificaciones no leídas' })
    async getUnreadCount(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.notificationsService.getUnreadCount(req.buyerUser.id, storeId);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Marcar notificación como leída' })
    async markAsRead(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
        @Param('id') id: string,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.notificationsService.markAsRead(req.buyerUser.id, storeId, id);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
    async markAllAsRead(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.notificationsService.markAllAsRead(req.buyerUser.id, storeId);
    }
}
