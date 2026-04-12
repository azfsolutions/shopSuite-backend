import {
    IsBoolean,
    IsOptional,
    IsNumber,
    IsString,
    Min,
    MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO para actualizar configuraciones del storefront
 * Solo incluye configuraciones relacionadas con features visuales
 */
export class UpdateSettingsDto {
    // ============================================================
    // CHECKOUT & SHIPPING
    // ============================================================

    @ApiPropertyOptional({
        description: 'Requiere login antes de checkout',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    requireLoginForCheckout?: boolean;

    @ApiPropertyOptional({
        description: 'Umbral para envío gratis (USD)',
        example: 50.0,
    })
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    freeShippingThreshold?: number;

    // ============================================================
    // FEATURES TOGGLES
    // ============================================================

    @ApiPropertyOptional({
        description: 'Habilitar hero slider',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    enableHeroSlider?: boolean;

    @ApiPropertyOptional({
        description: 'Habilitar grid de categorías',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    enableCategoryGrid?: boolean;

    @ApiPropertyOptional({
        description: 'Habilitar flash sales',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    enableFlashSales?: boolean;

    @ApiPropertyOptional({
        description: 'Habilitar testimonios',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    enableTestimonials?: boolean;

    @ApiPropertyOptional({
        description: 'Habilitar newsletter',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    enableNewsletter?: boolean;

    @ApiPropertyOptional({
        description: 'Habilitar productos vistos recientemente',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    enableRecentlyViewed?: boolean;

    @ApiPropertyOptional({
        description: 'Habilitar wishlist',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    enableWishlist?: boolean;

    @ApiPropertyOptional({
        description: 'Habilitar nuevos lanzamientos',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    enableNewArrivals?: boolean;

    @ApiPropertyOptional({
        description: 'Habilitar productos mejor valorados',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    enableTopRated?: boolean;

    // ============================================================
    // STOREFRONT STYLE
    // ============================================================

    @ApiPropertyOptional({
        description: 'Estilo visual del storefront (style1 o style2)',
        example: 'style1',
    })
    @IsString()
    @IsOptional()
    storefrontStyle?: string;

    // ============================================================
    // CUSTOM COLORS
    // ============================================================

    @ApiPropertyOptional({
        description: 'Color primario en hexadecimal',
        example: '#000000',
    })
    @IsString()
    @MaxLength(7)
    @IsOptional()
    primaryColorCustom?: string;

    @ApiPropertyOptional({
        description: 'Color de acento en hexadecimal',
        example: '#3B82F6',
    })
    @IsString()
    @MaxLength(7)
    @IsOptional()
    accentColorCustom?: string;
}
