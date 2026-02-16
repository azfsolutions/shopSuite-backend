import {
    IsString,
    IsNotEmpty,
    IsBoolean,
    IsOptional,
    IsInt,
    IsNumber,
    Min,
    Max,
    MaxLength,
    IsIn,
    IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear un nuevo banner
 */
export class CreateBannerDto {
    @ApiPropertyOptional({
        description: 'Título del banner',
        example: 'Nueva Colección 2026',
    })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    title?: string;

    @ApiPropertyOptional({
        description: 'Subtítulo del banner',
        example: 'Descubre lo último en tecnología',
    })
    @IsString()
    @IsOptional()
    @MaxLength(200)
    subtitle?: string;

    @ApiPropertyOptional({
        description: 'Descripción del banner',
        example: 'Teclados mecánicos y mouse gaming de las mejores marcas.',
    })
    @IsString()
    @IsOptional()
    @MaxLength(300)
    description?: string;

    // ⭐ Configuración de fondo
    @ApiPropertyOptional({
        description: 'Tipo de fondo',
        enum: ['solid', 'gradient', 'image', 'video'],
        default: 'gradient',
    })
    @IsString()
    @IsOptional()
    @IsIn(['solid', 'gradient', 'image', 'video'])
    backgroundType?: string;

    // Color Sólido
    @ApiPropertyOptional({ description: 'Color de fondo (hex)', example: '#3B82F6' })
    @IsString()
    @IsOptional()
    backgroundColor?: string;

    // Gradiente
    @ApiPropertyOptional({ description: 'Primer color del gradiente', example: '#8A2BE2' })
    @IsString()
    @IsOptional()
    gradientColor1?: string;

    @ApiPropertyOptional({ description: 'Segundo color del gradiente', example: '#FF69B4' })
    @IsString()
    @IsOptional()
    gradientColor2?: string;

    @ApiPropertyOptional({ description: 'Ángulo del gradiente (0-360)', example: 135 })
    @IsInt()
    @IsOptional()
    @Min(0)
    @Max(360)
    gradientAngle?: number;

    @ApiPropertyOptional({ description: 'Tipo de gradiente', enum: ['linear', 'radial'] })
    @IsString()
    @IsOptional()
    @IsIn(['linear', 'radial'])
    gradientType?: string;

    // Imagen de Fondo
    @ApiPropertyOptional({ description: 'URL de imagen de fondo' })
    @IsString()
    @IsOptional()
    backgroundImage?: string;

    @ApiPropertyOptional({ description: 'Opacidad de la imagen (0-1)', example: 0.8 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(1)
    backgroundOpacity?: number;

    @ApiPropertyOptional({ description: 'Color de overlay para imagen (hex)', example: '#000000' })
    @IsString()
    @IsOptional()
    backgroundOverlay?: string;

    // ⭐ Video de Fondo
    @ApiPropertyOptional({ description: 'URL del video de fondo' })
    @IsString()
    @IsOptional()
    videoUrl?: string;

    @ApiPropertyOptional({ description: 'Opacidad del video (0-1)', example: 0.5 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(1)
    videoOpacity?: number;

    @ApiPropertyOptional({ description: 'Color de overlay para video (hex)' })
    @IsString()
    @IsOptional()
    videoOverlay?: string;

    // Fallback
    @ApiPropertyOptional({ description: 'Color de respaldo', example: '#10B981' })
    @IsString()
    @IsOptional()
    fallbackColor?: string;

    @ApiPropertyOptional({
        description: 'URL de imagen para desktop',
        example: 'https://example.com/banner-desktop.jpg',
    })
    @IsString()
    @IsOptional()
    imageDesktop?: string;

    @ApiPropertyOptional({
        description: 'URL de imagen para mobile',
        example: 'https://example.com/banner-mobile.jpg',
    })
    @IsString()
    @IsOptional()
    imageMobile?: string;

    @ApiPropertyOptional({
        description: 'Texto del botón CTA',
        example: 'Ver Colección',
    })
    @IsString()
    @IsOptional()
    @MaxLength(50)
    ctaText?: string;

    @ApiPropertyOptional({
        description: 'Link del botón CTA',
        example: '/products?category=new',
    })
    @IsString()
    @IsOptional()
    ctaLink?: string;

    @ApiPropertyOptional({
        description: 'Si el banner está activo',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Orden de visualización',
        default: 0,
    })
    @IsInt()
    @Min(0)
    @IsOptional()
    order?: number;
}
