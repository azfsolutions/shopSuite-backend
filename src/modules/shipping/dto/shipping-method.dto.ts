import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShippingMethodDto {
    @ApiProperty({ example: 'Envío Estándar', description: 'Nombre del método de envío' })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ example: 'Entrega en 3-5 días hábiles' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;

    @ApiProperty({ example: 5.99, description: 'Precio del envío' })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({ example: 50, description: 'Envío gratis en compras superiores a este monto' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    freeAbove?: number;

    @ApiPropertyOptional({ example: 3, description: 'Días mínimos de entrega' })
    @IsOptional()
    @IsInt()
    @Min(1)
    minDays?: number;

    @ApiPropertyOptional({ example: 5, description: 'Días máximos de entrega' })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxDays?: number;

    @ApiPropertyOptional({ example: true, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateShippingMethodDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    freeAbove?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    minDays?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    maxDays?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;
}

export class ReorderShippingMethodsDto {
    @ApiProperty({ example: ['uuid1', 'uuid2', 'uuid3'], description: 'IDs en orden deseado' })
    @IsString({ each: true })
    ids: string[];
}
