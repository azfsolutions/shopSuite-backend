import {
    IsString,
    IsNotEmpty,
    IsBoolean,
    IsOptional,
    IsDateString,
    IsArray,
    ValidateNested,
    IsUUID,
    IsNumber,
    Min,
    Max,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para un item de flash sale (producto con descuento)
 */
export class FlashSaleItemDto {
    @ApiProperty({ description: 'ID del producto' })
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({
        description: 'Porcentaje de descuento',
        minimum: 1,
        maximum: 99,
        example: 30,
    })
    @IsNumber()
    @Min(1)
    @Max(99)
    discountPercentage: number;

    @ApiPropertyOptional({
        description: 'Límite de stock para esta oferta',
        example: 50,
    })
    @IsNumber()
    @Min(1)
    @IsOptional()
    stockLimit?: number;
}

/**
 * DTO para crear una nueva flash sale
 */
export class CreateFlashSaleDto {
    @ApiProperty({
        description: 'Nombre de la campaña',
        example: 'Black Friday 2026',
    })
    @IsString()
    @IsNotEmpty({ message: 'El nombre es requerido' })
    @MaxLength(100)
    name: string;

    @ApiProperty({
        description: 'Fecha y hora de inicio',
        example: '2026-11-29T00:00:00Z',
    })
    @IsDateString()
    @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
    startDate: string;

    @ApiProperty({
        description: 'Fecha y hora de fin',
        example: '2026-11-30T23:59:59Z',
    })
    @IsDateString()
    @IsNotEmpty({ message: 'La fecha de fin es requerida' })
    endDate: string;

    @ApiPropertyOptional({
        description: 'Si la flash sale está activa',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiProperty({
        description: 'Lista de productos con descuento',
        type: [FlashSaleItemDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FlashSaleItemDto)
    items: FlashSaleItemDto[];
}
