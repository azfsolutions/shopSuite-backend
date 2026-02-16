import {
    IsString,
    IsNotEmpty,
    IsBoolean,
    IsOptional,
    IsInt,
    Min,
    Max,
    MaxLength,
    IsEmail,
    IsUUID,
    IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para crear un nuevo testimonial
 */
export class CreateTestimonialDto {
    @ApiProperty({
        description: 'Nombre del cliente',
        example: 'María García',
    })
    @IsString()
    @IsNotEmpty({ message: 'El nombre es requerido' })
    @MaxLength(100)
    customerName: string;

    @ApiPropertyOptional({
        description: 'Email del cliente',
        example: 'maria@example.com',
    })
    @IsEmail()
    @IsOptional()
    customerEmail?: string;

    @ApiPropertyOptional({
        description: 'URL del avatar del cliente',
        example: 'https://example.com/avatar.jpg',
    })
    @IsString()
    @IsOptional()
    customerAvatar?: string;

    @ApiProperty({
        description: 'Calificación del 1 al 5',
        minimum: 1,
        maximum: 5,
        example: 5,
    })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiProperty({
        description: 'Comentario del cliente',
        example: 'Excelente producto, lo recomiendo totalmente.',
    })
    @IsString()
    @IsNotEmpty({ message: 'El comentario es requerido' })
    @MaxLength(500)
    comment: string;

    @ApiPropertyOptional({
        description: 'ID del producto relacionado',
    })
    @IsUUID()
    @IsOptional()
    productId?: string;

    @ApiPropertyOptional({
        description: 'Si el testimonio está destacado',
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;

    @ApiPropertyOptional({
        description: 'Si el testimonio está aprobado',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isApproved?: boolean;
}
