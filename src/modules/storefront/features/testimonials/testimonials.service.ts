import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

/**
 * Service para gestionar Testimonials
 */
@Injectable()
export class TestimonialsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtener todos los testimonios de una tienda
     */
    async findAllByStore(
        storeId: string,
        filters?: { isFeatured?: boolean; isApproved?: boolean },
    ) {
        const where: any = { storeId };

        if (filters?.isFeatured !== undefined) {
            where.isFeatured = filters.isFeatured;
        }
        if (filters?.isApproved !== undefined) {
            where.isApproved = filters.isApproved;
        }

        const testimonials = await this.prisma.testimonial.findMany({
            where,
            include: {
                product: {
                    select: { id: true, name: true, slug: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return testimonials;
    }

    /**
     * Obtener un testimonial por ID (scoped al storeId)
     */
    async findById(storeId: string, testimonialId: string) {
        const testimonial = await this.prisma.testimonial.findFirst({
            where: { id: testimonialId, storeId },
            include: {
                product: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        if (!testimonial) {
            throw new NotFoundException('Testimonio no encontrado');
        }

        return testimonial;
    }

    /**
     * Crear un nuevo testimonial
     */
    async create(storeId: string, createDto: CreateTestimonialDto) {
        // Verificar que la tienda existe
        const storeExists = await this.prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!storeExists) {
            throw new BadRequestException('Tienda no encontrada');
        }

        // Si hay productId, verificar que existe y pertenece a la tienda
        if (createDto.productId) {
            const product = await this.prisma.product.findFirst({
                where: { id: createDto.productId, storeId },
            });

            if (!product) {
                throw new BadRequestException(
                    'Producto no encontrado en esta tienda',
                );
            }
        }

        const testimonial = await this.prisma.testimonial.create({
            data: {
                ...createDto,
                storeId,
            },
            include: {
                product: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        return testimonial;
    }

    /**
     * Actualizar un testimonial (scoped al storeId)
     */
    async update(storeId: string, testimonialId: string, updateDto: UpdateTestimonialDto) {
        await this.findById(storeId, testimonialId);

        if (updateDto.productId) {
            const product = await this.prisma.product.findFirst({
                where: { id: updateDto.productId, storeId },
            });

            if (!product) {
                throw new BadRequestException(
                    'Producto no encontrado en esta tienda',
                );
            }
        }

        const updated = await this.prisma.testimonial.update({
            where: { id: testimonialId },
            data: updateDto,
            include: {
                product: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        return updated;
    }

    /**
     * Eliminar un testimonial (scoped al storeId)
     */
    async delete(storeId: string, testimonialId: string) {
        await this.findById(storeId, testimonialId);

        await this.prisma.testimonial.delete({
            where: { id: testimonialId },
        });

        return { message: 'Testimonio eliminado exitosamente' };
    }

    /**
     * Toggle featured status (scoped al storeId)
     */
    async toggleFeatured(storeId: string, testimonialId: string) {
        const testimonial = await this.findById(storeId, testimonialId);

        const updated = await this.prisma.testimonial.update({
            where: { id: testimonialId },
            data: { isFeatured: !testimonial.isFeatured },
        });

        return updated;
    }

    /**
     * Toggle approved status (scoped al storeId)
     */
    async toggleApproved(storeId: string, testimonialId: string) {
        const testimonial = await this.findById(storeId, testimonialId);

        const updated = await this.prisma.testimonial.update({
            where: { id: testimonialId },
            data: { isApproved: !testimonial.isApproved },
        });

        return updated;
    }
}
