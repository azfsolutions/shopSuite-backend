import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../../core/guards';
import { FlashSalesService } from './flash-sales.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { FlashSaleItemDto } from './dto/create-flash-sale.dto';


/**
 * Controller para gestionar Flash Sales
 */
@ApiTags('Storefront - Flash Sales')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard/stores/:storeId/flash-sales')
export class FlashSalesController {
    constructor(private readonly flashSalesService: FlashSalesService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener todas las flash sales de una tienda' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    async findAll(@Param('storeId') storeId: string) {
        return this.flashSalesService.findAllByStore(storeId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener una flash sale por ID' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID de la flash sale' })
    async findOne(@Param('id') id: string) {
        return this.flashSalesService.findById(id);
    }

    @Post()
    @ApiOperation({ summary: 'Crear una nueva flash sale' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    async create(
        @Param('storeId') storeId: string,
        @Body() createDto: CreateFlashSaleDto,
    ) {
        return this.flashSalesService.create(storeId, createDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar una flash sale' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID de la flash sale' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateFlashSaleDto,
    ) {
        return this.flashSalesService.update(id, updateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar una flash sale' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID de la flash sale' })
    async delete(@Param('id') id: string) {
        return this.flashSalesService.delete(id);
    }

    @Post(':id/items')
    @ApiOperation({ summary: 'Agregar un producto a la flash sale' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID de la flash sale' })
    async addItem(
        @Param('id') id: string,
        @Body() item: FlashSaleItemDto,
    ) {
        return this.flashSalesService.addItem(id, item);
    }

    @Delete(':id/items/:itemId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar un producto de la flash sale' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID de la flash sale' })
    @ApiParam({ name: 'itemId', description: 'ID del item' })
    async removeItem(
        @Param('id') id: string,
        @Param('itemId') itemId: string,
    ) {
        return this.flashSalesService.removeItem(id, itemId);
    }
}
