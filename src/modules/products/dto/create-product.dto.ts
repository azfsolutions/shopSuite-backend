import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive, IsInt, Min, IsBoolean, IsEnum, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
}

export class CreateProductDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be kebab-case' })
    slug: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    description?: string;

    @ApiProperty()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    price: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    compareAtPrice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    sku?: string;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;
}
