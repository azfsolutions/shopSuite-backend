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
    Logger,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard, GlobalRoleGuard, StoreAccessGuard } from '../../../../core/guards';
import { RequireGlobalRole } from '../../../../core/decorators';
import { BannersService } from './banners.service';
import { CreateBannerDto, UpdateBannerDto } from './dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';

@ApiTags('Storefront - Banners')
@ApiBearerAuth()
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@Controller('dashboard/stores/:storeId/banners')
export class BannersController {
    private readonly logger = new Logger(BannersController.name);
    constructor(private readonly bannersService: BannersService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los banners de una tienda' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiQuery({
        name: 'activeOnly',
        required: false,
        type: Boolean,
        description: 'Filtrar solo banners activos',
    })
    @ApiResponse({
        status: 200,
        description: 'Lista de banners retornada exitosamente',
    })
    async findAll(
        @Param('storeId') storeId: string,
        @Query('activeOnly') activeOnly?: string,
    ) {
        this.logger.debug(`GET banners for store ${storeId} (activeOnly: ${activeOnly})`);
        const isActiveOnly = activeOnly === 'true';
        return this.bannersService.findAllByStore(storeId, isActiveOnly);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un banner específico' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del banner' })
    @ApiResponse({ status: 200, description: 'Banner encontrado' })
    @ApiResponse({ status: 404, description: 'Banner no encontrado' })
    async findOne(
        @Param('storeId') storeId: string,
        @Param('id') id: string,
    ) {
        return this.bannersService.findById(storeId, id);
    }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo banner' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiResponse({ status: 201, description: 'Banner creado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    async create(
        @Param('storeId') storeId: string,
        @Body() createBannerDto: CreateBannerDto,
    ) {
        return this.bannersService.create(storeId, createBannerDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un banner existente' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del banner' })
    @ApiResponse({ status: 200, description: 'Banner actualizado exitosamente' })
    @ApiResponse({ status: 404, description: 'Banner no encontrado' })
    async update(
        @Param('storeId') storeId: string,
        @Param('id') id: string,
        @Body() updateBannerDto: UpdateBannerDto,
    ) {
        return this.bannersService.update(storeId, id, updateBannerDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar un banner' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del banner' })
    @ApiResponse({ status: 204, description: 'Banner eliminado exitosamente' })
    @ApiResponse({ status: 404, description: 'Banner no encontrado' })
    async delete(
        @Param('storeId') storeId: string,
        @Param('id') id: string,
    ) {
        return this.bannersService.delete(storeId, id);
    }

    @Patch('reorder')
    @ApiOperation({ summary: 'Reordenar banners' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiResponse({
        status: 200,
        description: 'Banners reordenados exitosamente',
    })
    async reorder(
        @Param('storeId') storeId: string,
        @Body() dto: ReorderBannersDto,
    ) {
        return this.bannersService.reorder(storeId, dto.bannerOrders);
    }
}
