import {
    Controller,
    Get,
    Put,
    Body,
    Param,
    UseGuards,
    Post,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../../core/guards';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

/**
 * Controller para gestionar configuraciones del storefront
 * Rutas:
 * - GET  /dashboard/stores/:storeId/settings/storefront
 * - PUT  /dashboard/stores/:storeId/settings/storefront
 * - POST /dashboard/stores/:storeId/settings/storefront/reset
 */
@ApiTags('Storefront - Settings')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard/stores/:storeId/settings/storefront')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener configuraciones de storefront' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiResponse({
        status: 200,
        description: 'Configuraciones retornadas exitosamente',
    })
    @ApiResponse({
        status: 404,
        description: 'Configuraciones no encontradas',
    })
    async getSettings(@Param('storeId') storeId: string) {
        return this.settingsService.findByStore(storeId);
    }

    @Put()
    @ApiOperation({ summary: 'Actualizar configuraciones de storefront' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiResponse({
        status: 200,
        description: 'Configuraciones actualizadas exitosamente',
    })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({
        status: 404,
        description: 'Configuraciones no encontradas',
    })
    async updateSettings(
        @Param('storeId') storeId: string,
        @Body() updateSettingsDto: UpdateSettingsDto,
    ) {
        return this.settingsService.updateStorefrontSettings(
            storeId,
            updateSettingsDto,
        );
    }

    @Post('reset')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Resetear configuraciones a valores por defecto',
    })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiResponse({
        status: 200,
        description: 'Configuraciones reseteadas exitosamente',
    })
    async resetSettings(@Param('storeId') storeId: string) {
        return this.settingsService.resetToDefaults(storeId);
    }
}
