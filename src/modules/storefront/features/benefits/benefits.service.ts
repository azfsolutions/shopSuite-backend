import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateBenefitDto, UpdateBenefitDto } from './dto';

/**
 * Service para gestionar los benefits/features de una tienda
 * Benefits son elementos visuales configurables (ej: 🚚 Envío Gratis)
 */
@Injectable()
export class BenefitsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtener todos los benefits de una tienda
     * @param storeId - ID de la tienda
     * @param activeOnly - Si true, solo retorna benefits activos
     */
    async findAllByStore(storeId: string, activeOnly = false) {
        const where = {
            storeId,
            ...(activeOnly && { isActive: true }),
        };

        const benefits = await this.prisma.storeBenefit.findMany({
            where,
            orderBy: { order: 'asc' },
        });

        return benefits;
    }

    /**
     * Obtener un benefit específico por ID
     * @param benefitId - ID del benefit
     */
    async findById(benefitId: string) {
        const benefit = await this.prisma.storeBenefit.findUnique({
            where: { id: benefitId },
        });

        if (!benefit) {
            throw new NotFoundException('Benefit no encontrado');
        }

        return benefit;
    }

    /**
     * Crear un nuevo benefit para una tienda
     * @param storeId - ID de la tienda
     * @param createBenefitDto - Datos del benefit a crear
     */
    async create(storeId: string, createBenefitDto: CreateBenefitDto) {
        // Verificar que la tienda existe
        const storeExists = await this.prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!storeExists) {
            throw new BadRequestException('Tienda no encontrada');
        }

        // Obtener el siguiente orden si no se especificó
        if (createBenefitDto.order === undefined) {
            const maxOrder = await this.prisma.storeBenefit.aggregate({
                where: { storeId },
                _max: { order: true },
            });

            createBenefitDto.order = (maxOrder._max.order ?? -1) + 1;
        }

        const benefit = await this.prisma.storeBenefit.create({
            data: {
                ...createBenefitDto,
                storeId,
            },
        });

        return benefit;
    }

    /**
     * Actualizar un benefit existente
     * @param benefitId - ID del benefit
     * @param updateBenefitDto - Datos a actualizar
     */
    async update(benefitId: string, updateBenefitDto: UpdateBenefitDto) {
        // Verificar que existe
        await this.findById(benefitId);

        const updatedBenefit = await this.prisma.storeBenefit.update({
            where: { id: benefitId },
            data: updateBenefitDto,
        });

        return updatedBenefit;
    }

    /**
     * Eliminar un benefit
     * @param benefitId - ID del benefit
     */
    async delete(benefitId: string) {
        // Verificar que existe
        await this.findById(benefitId);

        await this.prisma.storeBenefit.delete({
            where: { id: benefitId },
        });

        return { message: 'Benefit eliminado exitosamente' };
    }

    /**
     * Reordenar benefits
     * @param storeId - ID de la tienda
     * @param benefitOrders - Array de {id, order}
     */
    async reorder(storeId: string, benefitOrders: { id: string; order: number }[]) {
        // Verificar que todos los benefits pertenecen a la tienda
        const benefitIds = benefitOrders.map((b) => b.id);
        const benefits = await this.prisma.storeBenefit.findMany({
            where: { id: { in: benefitIds }, storeId },
        });

        if (benefits.length !== benefitIds.length) {
            throw new BadRequestException('Algunos benefits no pertenecen a esta tienda');
        }

        // Actualizar orden de cada benefit
        await this.prisma.$transaction(
            benefitOrders.map((item) =>
                this.prisma.storeBenefit.update({
                    where: { id: item.id },
                    data: { order: item.order },
                }),
            ),
        );

        return { message: 'Benefits reordenados exitosamente' };
    }
}
