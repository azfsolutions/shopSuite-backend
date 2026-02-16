import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CreateShippingMethodDto, UpdateShippingMethodDto, ReorderShippingMethodsDto } from './dto/shipping-method.dto';
import { AuthGuard } from '../../core/guards';
import { StoreAccessGuard } from '../../core/guards/store-access.guard';
import { CurrentStore } from '../../core/decorators';

@ApiTags('shipping')
@Controller('shipping')
@UseGuards(AuthGuard, StoreAccessGuard)
@ApiBearerAuth()
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    @Post()
    @ApiOperation({ summary: 'Crear método de envío' })
    async create(@CurrentStore() store: any, @Body() dto: CreateShippingMethodDto) {
        return this.shippingService.create(store.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar métodos de envío' })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
    async findAll(
        @CurrentStore() store: any,
        @Query('includeInactive') includeInactive?: string,
    ) {
        return this.shippingService.findAll(store.id, includeInactive === 'true');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener método de envío por ID' })
    async findOne(@CurrentStore() store: any, @Param('id') id: string) {
        return this.shippingService.findOne(store.id, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar método de envío' })
    async update(
        @CurrentStore() store: any,
        @Param('id') id: string,
        @Body() dto: UpdateShippingMethodDto,
    ) {
        return this.shippingService.update(store.id, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar método de envío' })
    async delete(@CurrentStore() store: any, @Param('id') id: string) {
        return this.shippingService.delete(store.id, id);
    }

    @Post('reorder')
    @ApiOperation({ summary: 'Reordenar métodos de envío' })
    async reorder(@CurrentStore() store: any, @Body() dto: ReorderShippingMethodsDto) {
        return this.shippingService.reorder(store.id, dto.ids);
    }
}
