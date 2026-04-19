import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CatalogItemDto {
    @IsUUID()
    productId: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;

    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}

export class UpsertCatalogDto {
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    minOrderAmount?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    minOrderQuantity?: number;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CatalogItemDto)
    items?: CatalogItemDto[];
}
