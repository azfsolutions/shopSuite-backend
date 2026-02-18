import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupon.dto';
import { AuthGuard, GlobalRoleGuard } from '../../core/guards';
import { StoreAccessGuard } from '../../core/guards/store-access.guard';
import { CurrentStore, RequireGlobalRole } from '../../core/decorators';

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@ApiBearerAuth()
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) { }

    @Post()
    @ApiOperation({ summary: 'Crear cupón' })
    async create(@CurrentStore() store: any, @Body() dto: CreateCouponDto) {
        return this.couponsService.create(store.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar cupones' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'search', required: false, type: String })
    async findAll(
        @CurrentStore() store: any,
        @Query('isActive') isActive?: string,
        @Query('search') search?: string,
    ) {
        const filters = {
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            search,
        };
        return this.couponsService.findAll(store.id, filters);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener cupón por ID' })
    async findOne(@CurrentStore() store: any, @Param('id') id: string) {
        return this.couponsService.findOne(store.id, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar cupón' })
    async update(
        @CurrentStore() store: any,
        @Param('id') id: string,
        @Body() dto: UpdateCouponDto,
    ) {
        return this.couponsService.update(store.id, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar cupón' })
    async delete(@CurrentStore() store: any, @Param('id') id: string) {
        return this.couponsService.delete(store.id, id);
    }

    @Post('validate')
    @ApiOperation({ summary: 'Validar cupón' })
    async validate(@CurrentStore() store: any, @Body() dto: ValidateCouponDto) {
        return this.couponsService.validate(store.id, dto);
    }
}
