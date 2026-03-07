import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean, IsNumber, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================
// PRODUCT OPTIONS DTOs
// ============================================================

export class CreateOptionValueDto {
    @ApiProperty({ example: 'M' })
    @IsString()
    @IsNotEmpty()
    value: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;
}

export class CreateOptionDto {
    @ApiProperty({ example: 'Size' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;

    @ApiPropertyOptional({ type: [CreateOptionValueDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOptionValueDto)
    values?: CreateOptionValueDto[];
}

export class UpdateOptionDto {
    @ApiPropertyOptional({ example: 'Color' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;
}

export class AddOptionValueDto {
    @ApiProperty({ example: 'XL' })
    @IsString()
    @IsNotEmpty()
    value: string;

    @ApiPropertyOptional({ example: 3 })
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;
}

// ============================================================
// PRODUCT VARIANTS DTOs
// ============================================================

export class CreateVariantDto {
    @ApiProperty({ example: 'M / Red' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'SKU-001-M-RED' })
    @IsOptional()
    @IsString()
    sku?: string;

    @ApiPropertyOptional({ example: '1234567890123' })
    @IsOptional()
    @IsString()
    barcode?: string;

    @ApiProperty({ example: 99.99 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price: number;

    @ApiPropertyOptional({ example: 129.99 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    compareAtPrice?: number;

    @ApiPropertyOptional({ example: 50.00 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    costPerItem?: number;

    @ApiPropertyOptional({ example: 100 })
    @IsOptional()
    @IsInt()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    trackInventory?: boolean;

    @ApiProperty({ example: { Size: 'M', Color: 'Red' } })
    options: Record<string, string>;

    @ApiPropertyOptional({ example: 0.5 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    weight?: number;

    @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateVariantDto {
    @ApiPropertyOptional({ example: 'M / Blue' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'SKU-001-M-BLU' })
    @IsOptional()
    @IsString()
    sku?: string;

    @ApiPropertyOptional({ example: '1234567890124' })
    @IsOptional()
    @IsString()
    barcode?: string;

    @ApiPropertyOptional({ example: 109.99 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price?: number;

    @ApiPropertyOptional({ example: 139.99 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    compareAtPrice?: number;

    @ApiPropertyOptional({ example: 55.00 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    costPerItem?: number;

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @IsInt()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    trackInventory?: boolean;

    @ApiPropertyOptional({ example: 0.6 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    weight?: number;

    @ApiPropertyOptional({ example: 'https://example.com/new-image.jpg' })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class BulkUpdateVariantDto {
    @ApiProperty({ example: 'uuid-variant-id' })
    @IsUUID()
    id: string;

    @ApiPropertyOptional({ example: 99.99 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price?: number;

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @IsInt()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ example: 'SKU-NEW' })
    @IsOptional()
    @IsString()
    sku?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class BulkUpdateVariantsDto {
    @ApiProperty({ type: [BulkUpdateVariantDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkUpdateVariantDto)
    variants: BulkUpdateVariantDto[];
}

export class GenerateVariantsDto {
    @ApiPropertyOptional({ example: 99.99, description: 'Base price for all generated variants' })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    basePrice?: number;

    @ApiPropertyOptional({ example: 0, description: 'Initial stock for all generated variants' })
    @IsOptional()
    @IsInt()
    @Min(0)
    initialStock?: number;
}
