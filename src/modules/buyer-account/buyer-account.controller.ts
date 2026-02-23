import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BuyerAccountService } from './buyer-account.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { UpdateBuyerProfileDto } from './dto/update-profile.dto';
import { BuyerAuthGuard } from '../../modules/buyer-auth/guards/buyer-auth.guard';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('buyer-account')
@Controller('storefront/:storeSlug/account')
@UseGuards(BuyerAuthGuard)
@ApiBearerAuth()
export class BuyerAccountController {
    constructor(
        private readonly accountService: BuyerAccountService,
        private readonly prisma: PrismaService,
    ) { }

    private async getStoreId(storeSlug: string): Promise<string> {
        const store = await this.prisma.store.findUnique({
            where: { slug: storeSlug },
            select: { id: true },
        });
        if (!store) throw new Error('Tienda no encontrada');
        return store.id;
    }

    // ============= PROFILE =============
    @Get('profile')
    @ApiOperation({ summary: 'Obtener perfil con datos de la tienda' })
    async getProfile(@Request() req: any, @Param('storeSlug') storeSlug: string) {
        const storeId = await this.getStoreId(storeSlug);
        return this.accountService.getProfileWithUser(req.buyerUser.id, storeId);
    }

    @Patch('profile')
    @ApiOperation({ summary: 'Actualizar perfil del comprador' })
    async updateProfile(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
        @Body() dto: UpdateBuyerProfileDto,
    ) {
        await this.getStoreId(storeSlug);
        return this.accountService.updateProfile(req.buyerUser.id, dto);
    }

    // ============= ADDRESSES =============
    @Get('addresses')
    @ApiOperation({ summary: 'Listar direcciones del comprador' })
    async getAddresses(@Request() req: any, @Param('storeSlug') storeSlug: string) {
        const storeId = await this.getStoreId(storeSlug);
        return this.accountService.getAddresses(req.buyerUser.id, storeId);
    }

    @Post('addresses')
    @ApiOperation({ summary: 'Agregar nueva dirección' })
    async createAddress(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
        @Body() dto: CreateAddressDto,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.accountService.createAddress(req.buyerUser.id, storeId, dto);
    }

    @Patch('addresses/:id')
    @ApiOperation({ summary: 'Actualizar dirección' })
    async updateAddress(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
        @Param('id') addressId: string,
        @Body() dto: UpdateAddressDto,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.accountService.updateAddress(req.buyerUser.id, storeId, addressId, dto);
    }

    @Delete('addresses/:id')
    @ApiOperation({ summary: 'Eliminar dirección' })
    async deleteAddress(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
        @Param('id') addressId: string,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.accountService.deleteAddress(req.buyerUser.id, storeId, addressId);
    }

    // ============= ORDERS =============
    @Get('orders')
    @ApiOperation({ summary: 'Historial de pedidos' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getOrders(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.accountService.getOrders(
            req.buyerUser.id,
            storeId,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 10,
        );
    }

    @Get('orders/:id')
    @ApiOperation({ summary: 'Detalle de pedido' })
    async getOrderDetail(
        @Request() req: any,
        @Param('storeSlug') storeSlug: string,
        @Param('id') orderId: string,
    ) {
        const storeId = await this.getStoreId(storeSlug);
        return this.accountService.getOrderDetail(req.buyerUser.id, storeId, orderId);
    }
}
