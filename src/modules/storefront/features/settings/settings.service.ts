import {
    Injectable,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UpdateSettingsDto } from './dto';

/**
 * Service para gestionar las configuraciones del storefront
 * Maneja los toggles de features, colores personalizados, etc.
 */
@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtener configuraciones de una tienda
     * @param storeId - ID de la tienda
     */
    async findByStore(storeId: string) {
        let settings = await this.prisma.storeSettings.findUnique({
            where: { storeId },
        });

        // Autocrear settings si no existen (útil para tiendas antiguas o recién migradas)
        if (!settings) {
            this.logger.log(`Auto-creating settings for store: ${storeId}`);
            settings = await this.prisma.storeSettings.create({
                data: { storeId },
            });
        }

        return settings;
    }

    /**
     * Actualizar configuraciones del storefront
     * @param storeId - ID de la tienda
     * @param updateSettingsDto - Configuraciones a actualizar
     */
    async updateStorefrontSettings(
        storeId: string,
        updateSettingsDto: UpdateSettingsDto,
    ) {
        // Asegurar que las configuraciones existan antes de actualizar
        await this.findByStore(storeId);

        // Validar formato de colores si se proporcionan
        if (updateSettingsDto.primaryColorCustom) {
            this.validateHexColor(updateSettingsDto.primaryColorCustom);
        }

        if (updateSettingsDto.accentColorCustom) {
            this.validateHexColor(updateSettingsDto.accentColorCustom);
        }

        // Actualizar settings
        const updatedSettings = await this.prisma.storeSettings.update({
            where: { storeId },
            data: updateSettingsDto,
        });

        return updatedSettings;
    }

    /**
     * Validar que un string sea un color hexadecimal válido
     * @param color - Color en formato hexadecimal
     */
    private validateHexColor(color: string): void {
        const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;

        if (!hexColorRegex.test(color)) {
            throw new BadRequestException(
                `Color inválido: ${color}. Debe ser un hexadecimal válido (ej: #000000)`,
            );
        }
    }

    /**
     * Resetear configuraciones a valores por defecto
     * @param storeId - ID de la tienda
     */
    async resetToDefaults(storeId: string) {
        // Asegurar que existen antes de resetear
        await this.findByStore(storeId);

        const defaultSettings: Partial<UpdateSettingsDto> = {
            requireLoginForCheckout: true,
            freeShippingThreshold: undefined,
            enableHeroSlider: true,
            enableCategoryGrid: true,
            enableFlashSales: true,
            enableTestimonials: true,
            enableNewsletter: true,
            enableRecentlyViewed: true,
            enableWishlist: true,
            enableNewArrivals: true,
            enableTopRated: true,
            primaryColorCustom: undefined,
            accentColorCustom: undefined,
        };

        const updatedSettings = await this.prisma.storeSettings.update({
            where: { storeId },
            data: defaultSettings,
        });

        return updatedSettings;
    }
}
