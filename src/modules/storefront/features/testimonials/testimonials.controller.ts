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
import { AuthGuard, GlobalRoleGuard, StoreAccessGuard } from '../../../../core/guards';
import { RequireGlobalRole } from '../../../../core/decorators';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@ApiTags('Storefront - Testimonials')
@ApiBearerAuth()
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
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
    async findOne(
        @Param('storeId') storeId: string,
        @Param('id') id: string,
    ) {
        return this.testimonialsService.findById(storeId, id);
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
        @Param('storeId') storeId: string,
        @Param('id') id: string,
        @Body() updateDto: UpdateTestimonialDto,
    ) {
        return this.testimonialsService.update(storeId, id, updateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar un testimonio' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del testimonio' })
    async delete(
        @Param('storeId') storeId: string,
        @Param('id') id: string,
    ) {
        return this.testimonialsService.delete(storeId, id);
    }

    @Patch(':id/toggle-featured')
    @ApiOperation({ summary: 'Toggle estado destacado' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del testimonio' })
    async toggleFeatured(
        @Param('storeId') storeId: string,
        @Param('id') id: string,
    ) {
        return this.testimonialsService.toggleFeatured(storeId, id);
    }

    @Patch(':id/toggle-approved')
    @ApiOperation({ summary: 'Toggle estado aprobado' })
    @ApiParam({ name: 'storeId', description: 'ID de la tienda' })
    @ApiParam({ name: 'id', description: 'ID del testimonio' })
    async toggleApproved(
        @Param('storeId') storeId: string,
        @Param('id') id: string,
    ) {
        return this.testimonialsService.toggleApproved(storeId, id);
    }
}
