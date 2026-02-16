import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../../core/guards';
import { BenefitsService } from './benefits.service';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';

/**
 * Controller para gestionar benefits/features de las tiendas
 * Rutas:
 * - GET    /dashboard/stores/:storeId/benefits
 * - POST   /dashboard/stores/:storeId/benefits
 * - PUT    /dashboard/stores/:storeId/benefits/:id
 * - DELETE /dashboard/stores/:storeId/benefits/:id
 * - PATCH  /dashboard/stores/:storeId/benefits/reorder
 */
@ApiTags('Storefront - Benefits')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard/stores/:storeId/benefits')
export class BenefitsController {
    constructor(private readonly benefitsService: BenefitsService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los benefits de una tienda' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiQuery({
        name: 'activeOnly',
        required: false,
        type: Boolean,
        description: 'Filtrar solo benefits activos',
    })
    @ApiResponse({
        status: 200,
        description: 'Lista de benefits retornada exitosamente',
    })
    async findAll(
        @Param('storeId') storeId: string,
        @Query('activeOnly') activeOnly?: string,
    ) {
        const isActiveOnly = activeOnly === 'true';
        return this.benefitsService.findAllByStore(storeId, isActiveOnly);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un benefit específico' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del benefit' })
    @ApiResponse({ status: 200, description: 'Benefit encontrado' })
    @ApiResponse({ status: 404, description: 'Benefit no encontrado' })
    async findOne(@Param('id') id: string) {
        return this.benefitsService.findById(id);
    }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo benefit' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiResponse({ status: 201, description: 'Benefit creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    async create(
        @Param('storeId') storeId: string,
        @Body() createBenefitDto: CreateBenefitDto,
    ) {
        return this.benefitsService.create(storeId, createBenefitDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un benefit existente' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del benefit' })
    @ApiResponse({ status: 200, description: 'Benefit actualizado exitosamente' })
    @ApiResponse({ status: 404, description: 'Benefit no encontrado' })
    async update(
        @Param('id') id: string,
        @Body() updateBenefitDto: UpdateBenefitDto,
    ) {
        return this.benefitsService.update(id, updateBenefitDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar un benefit' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del benefit' })
    @ApiResponse({ status: 204, description: 'Benefit eliminado exitosamente' })
    @ApiResponse({ status: 404, description: 'Benefit no encontrado' })
    async delete(@Param('id') id: string) {
        return this.benefitsService.delete(id);
    }

    @Patch('reorder')
    @ApiOperation({ summary: 'Reordenar benefits' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiResponse({
        status: 200,
        description: 'Benefits reordenados exitosamente',
    })
    async reorder(
        @Param('storeId') storeId: string,
        @Body() benefitOrders: { id: string; order: number }[],
    ) {
        return this.benefitsService.reorder(storeId, benefitOrders);
    }
}
