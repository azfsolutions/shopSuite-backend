import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateBannerDto, UpdateBannerDto } from './dto';
/**
 * Service para gestionar los banners del hero slider
 * Cada tienda puede tener múltiples banners ordenados
 */
@Injectable()
export class BannersService {
    private readonly logger = new Logger(BannersService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtener todos los banners de una tienda
     * @param storeId - ID de la tienda
     * @param activeOnly - Si true, solo retorna banners activos
     */
    async findAllByStore(storeId: string, activeOnly = false) {
        try {
            this.logger.debug(`Fetching banners for store ${storeId} (activeOnly: ${activeOnly})`);

            const where = {
                storeId,
                ...(activeOnly && { isActive: true }),
            };

            const banners = await this.prisma.banner.findMany({
                where,
                orderBy: { order: 'asc' },
            });

            this.logger.debug(`Found ${banners.length} banners`);
            return banners;
        } catch (error) {
            this.logger.error(`Error fetching banners: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Obtener un banner específico por ID (scoped al storeId)
     */
    async findById(storeId: string, bannerId: string) {
        const banner = await this.prisma.banner.findFirst({
            where: { id: bannerId, storeId },
        });

        if (!banner) {
            throw new NotFoundException('Banner no encontrado');
        }

        return banner;
    }

    /**
     * Crear un nuevo banner para una tienda
     * @param storeId - ID de la tienda
     * @param createBannerDto - Datos del banner a crear
     */
    async create(storeId: string, createBannerDto: CreateBannerDto) {
        // Verificar que la tienda existe
        const storeExists = await this.prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!storeExists) {
            throw new BadRequestException('Tienda no encontrada');
        }

        // Obtener el siguiente orden si no se especificó
        if (createBannerDto.order === undefined) {
            const maxOrder = await this.prisma.banner.aggregate({
                where: { storeId },
                _max: { order: true },
            });

            createBannerDto.order = (maxOrder._max.order ?? -1) + 1;
        }

        const banner = await this.prisma.banner.create({
            data: {
                ...createBannerDto,
                storeId,
            },
        });

        return banner;
    }

    /**
     * Actualizar un banner existente (scoped al storeId)
     */
    async update(storeId: string, bannerId: string, updateBannerDto: UpdateBannerDto) {
        await this.findById(storeId, bannerId);

        const updatedBanner = await this.prisma.banner.update({
            where: { id: bannerId },
            data: updateBannerDto,
        });

        return updatedBanner;
    }

    /**
     * Eliminar un banner (scoped al storeId)
     */
    async delete(storeId: string, bannerId: string) {
        await this.findById(storeId, bannerId);

        await this.prisma.banner.delete({
            where: { id: bannerId },
        });

        return { message: 'Banner eliminado exitosamente' };
    }

    /**
     * Reordenar banners
     * @param storeId - ID de la tienda
     * @param bannerOrders - Array de {id, order}
     */
    async reorder(storeId: string, bannerOrders: { id: string; order: number }[]) {
        // Verificar que todos los banners pertenecen a la tienda
        const bannerIds = bannerOrders.map((b) => b.id);
        const banners = await this.prisma.banner.findMany({
            where: { id: { in: bannerIds }, storeId },
        });

        if (banners.length !== bannerIds.length) {
            throw new BadRequestException('Algunos banners no pertenecen a esta tienda');
        }

        // Actualizar orden de cada banner
        await this.prisma.$transaction(
            bannerOrders.map((item) =>
                this.prisma.banner.update({
                    where: { id: item.id },
                    data: { order: item.order },
                }),
            ),
        );

        return { message: 'Banners reordenados exitosamente' };
    }
}
