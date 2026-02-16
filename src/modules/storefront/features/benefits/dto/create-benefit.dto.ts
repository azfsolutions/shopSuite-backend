import {
    IsString,
    IsNotEmpty,
    IsBoolean,
    IsOptional,
    IsInt,
    Min,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear un nuevo benefit/feature de la tienda
 * Ejemplo: 🚚 Envío Gratis, 🛡️ Garantía Extendida, 💬 Soporte 24/7
 */
export class CreateBenefitDto {
    @ApiProperty({
        description: 'Emoji o URL de ícono',
        example: '🚚',
    })
    @IsString()
    @IsNotEmpty({ message: 'El ícono es requerido' })
    @MaxLength(255)
    icon: string;

    @ApiProperty({
        description: 'Título del benefit',
        example: 'Envío Gratis',
    })
    @IsString()
    @IsNotEmpty({ message: 'El título es requerido' })
    @MaxLength(100)
    title: string;

    @ApiProperty({
        description: 'Descripción del benefit',
        example: 'En pedidos mayores a $50',
    })
    @IsString()
    @IsNotEmpty({ message: 'La descripción es requerida' })
    @MaxLength(255)
    description: string;

    @ApiPropertyOptional({
        description: 'Si el benefit está activo',
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
