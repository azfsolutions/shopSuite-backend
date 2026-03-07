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
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../../core/guards';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
/**
 * Controller para gestionar Testimonials
 */
@ApiTags('Storefront - Testimonials')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard/stores/:storeId/testimonials')
export class TestimonialsController {
    constructor(private readonly testimonialsService: TestimonialsService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los testimonios de una tienda' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
    @ApiQuery({ name: 'isApproved', required: false, type: Boolean })
    async findAll(
        @Param('storeId') storeId: string,
        @Query('isFeatured') isFeatured?: string,
        @Query('isApproved') isApproved?: string,
    ) {
        const filters: { isFeatured?: boolean; isApproved?: boolean } = {};

        if (isFeatured !== undefined) {
            filters.isFeatured = isFeatured === 'true';
        }
        if (isApproved !== undefined) {
            filters.isApproved = isApproved === 'true';
        }

        return this.testimonialsService.findAllByStore(storeId, filters);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un testimonio por ID' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del testimonio' })
    async findOne(@Param('id') id: string) {
        return this.testimonialsService.findById(id);
    }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo testimonio' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    async create(
        @Param('storeId') storeId: string,
        @Body() createDto: CreateTestimonialDto,
    ) {
        return this.testimonialsService.create(storeId, createDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Actualizar un testimonio' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del testimonio' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateTestimonialDto,
    ) {
        return this.testimonialsService.update(id, updateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar un testimonio' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del testimonio' })
    async delete(@Param('id') id: string) {
        return this.testimonialsService.delete(id);
    }

    @Patch(':id/toggle-featured')
    @ApiOperation({ summary: 'Toggle estado destacado' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del testimonio' })
    async toggleFeatured(@Param('id') id: string) {
        return this.testimonialsService.toggleFeatured(id);
    }

    @Patch(':id/toggle-approved')
    @ApiOperation({ summary: 'Toggle estado aprobado' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del testimonio' })
    async toggleApproved(@Param('id') id: string) {
        return this.testimonialsService.toggleApproved(id);
    }
}
