import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard, GlobalRoleGuard } from '../../core/guards';
import { RequireGlobalRole } from '../../core/decorators';
import { VariantsService } from './variants.service';
import {
    CreateOptionDto,
    UpdateOptionDto,
    AddOptionValueDto,
    CreateVariantDto,
    UpdateVariantDto,
    BulkUpdateVariantsDto,
    GenerateVariantsDto,
} from './dto';

@ApiTags('Product Variants')
@ApiBearerAuth()
@UseGuards(AuthGuard, GlobalRoleGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@Controller('products/:productId')
export class VariantsController {
    constructor(private readonly variantsService: VariantsService) { }

    // ============================================================
    // OPTIONS ENDPOINTS
    // ============================================================

    @Get('options')
    @ApiOperation({ summary: 'Listar opciones del producto' })
    @ApiResponse({ status: 200, description: 'Lista de opciones' })
    findOptions(@Param('productId') productId: string) {
        return this.variantsService.findOptions(productId);
    }

    @Post('options')
    @ApiOperation({ summary: 'Crear una nueva opción (ej: Size, Color)' })
    @ApiResponse({ status: 201, description: 'Opción creada' })
    createOption(
        @Param('productId') productId: string,
        @Body() dto: CreateOptionDto,
    ) {
        return this.variantsService.createOption(productId, dto);
    }

    @Put('options/:optionId')
    @ApiOperation({ summary: 'Actualizar una opción' })
    @ApiResponse({ status: 200, description: 'Opción actualizada' })
    updateOption(
        @Param('optionId') optionId: string,
        @Body() dto: UpdateOptionDto,
    ) {
        return this.variantsService.updateOption(optionId, dto);
    }

    @Delete('options/:optionId')
    @ApiOperation({ summary: 'Eliminar una opción y todos sus valores' })
    @ApiResponse({ status: 200, description: 'Opción eliminada' })
    deleteOption(@Param('optionId') optionId: string) {
        return this.variantsService.deleteOption(optionId);
    }

    @Post('options/:optionId/values')
    @ApiOperation({ summary: 'Agregar un valor a una opción (ej: "M" a Size)' })
    @ApiResponse({ status: 201, description: 'Valor agregado' })
    addOptionValue(
        @Param('optionId') optionId: string,
        @Body() dto: AddOptionValueDto,
    ) {
        return this.variantsService.addOptionValue(optionId, dto);
    }

    @Delete('options/:optionId/values/:valueId')
    @ApiOperation({ summary: 'Eliminar un valor de una opción' })
    @ApiResponse({ status: 200, description: 'Valor eliminado' })
    deleteOptionValue(@Param('valueId') valueId: string) {
        return this.variantsService.deleteOptionValue(valueId);
    }

    // ============================================================
    // VARIANTS ENDPOINTS
    // ============================================================

    @Get('variants')
    @ApiOperation({ summary: 'Listar variantes del producto' })
    @ApiResponse({ status: 200, description: 'Lista de variantes' })
    findVariants(@Param('productId') productId: string) {
        return this.variantsService.findVariants(productId);
    }

    @Post('variants')
    @ApiOperation({ summary: 'Crear una variante manualmente' })
    @ApiResponse({ status: 201, description: 'Variante creada' })
    createVariant(
        @Param('productId') productId: string,
        @Body() dto: CreateVariantDto,
    ) {
        return this.variantsService.createVariant(productId, dto);
    }

    @Post('variants/generate')
    @ApiOperation({ summary: 'Generar variantes automáticamente desde opciones' })
    @ApiResponse({ status: 201, description: 'Variantes generadas' })
    generateVariants(
        @Param('productId') productId: string,
        @Body() dto: GenerateVariantsDto,
    ) {
        return this.variantsService.generateVariants(productId, dto);
    }

    @Put('variants/:variantId')
    @ApiOperation({ summary: 'Actualizar una variante' })
    @ApiResponse({ status: 200, description: 'Variante actualizada' })
    updateVariant(
        @Param('variantId') variantId: string,
        @Body() dto: UpdateVariantDto,
    ) {
        return this.variantsService.updateVariant(variantId, dto);
    }

    @Delete('variants/:variantId')
    @ApiOperation({ summary: 'Eliminar una variante' })
    @ApiResponse({ status: 200, description: 'Variante eliminada' })
    deleteVariant(@Param('variantId') variantId: string) {
        return this.variantsService.deleteVariant(variantId);
    }

    @Patch('variants/bulk')
    @ApiOperation({ summary: 'Actualizar múltiples variantes (precio, stock, sku)' })
    @ApiResponse({ status: 200, description: 'Variantes actualizadas' })
    bulkUpdateVariants(
        @Param('productId') productId: string,
        @Body() dto: BulkUpdateVariantsDto,
    ) {
        return this.variantsService.bulkUpdateVariants(productId, dto);
    }

    @Get('variants/stock-summary')
    @ApiOperation({ summary: 'Obtener resumen de stock de variantes' })
    @ApiResponse({ status: 200, description: 'Resumen de stock' })
    getStockSummary(@Param('productId') productId: string) {
        return this.variantsService.getStockSummary(productId);
    }

    @Get('variants/:variantId')
    @ApiOperation({ summary: 'Obtener una variante por ID' })
    @ApiResponse({ status: 200, description: 'Variante encontrada' })
    findVariantById(@Param('variantId') variantId: string) {
        return this.variantsService.findVariantById(variantId);
    }
}
