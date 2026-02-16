import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, MinLength, MaxLength, Matches, Min, IsInt, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CouponType {
    PERCENTAGE = 'PERCENTAGE',
    FIXED_AMOUNT = 'FIXED_AMOUNT',
    FREE_SHIPPING = 'FREE_SHIPPING',
}

export class CreateCouponDto {
    @ApiProperty({ example: 'VERANO2026', description: 'Código único del cupón' })
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    @Matches(/^[A-Z0-9\-_]+$/, { message: 'El código solo permite mayúsculas, números, guiones y guiones bajos' })
    code: string;

    @ApiProperty({ enum: CouponType, example: 'PERCENTAGE' })
    @IsEnum(CouponType)
    type: CouponType;

    @ApiProperty({ example: 10, description: 'Valor del descuento (porcentaje o monto fijo)' })
    @IsNumber()
    @IsPositive()
    value: number;

    @ApiPropertyOptional({ example: 50, description: 'Monto mínimo de compra para aplicar' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minPurchaseAmount?: number;

    @ApiPropertyOptional({ example: 20, description: 'Descuento máximo (solo para porcentuales)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxDiscountAmount?: number;

    @ApiPropertyOptional({ example: 100, description: 'Límite total de usos' })
    @IsOptional()
    @IsInt()
    @Min(1)
    usageLimit?: number;

    @ApiPropertyOptional({ example: 1, description: 'Límite de usos por cliente' })
    @IsOptional()
    @IsInt()
    @Min(1)
    usageLimitPerCustomer?: number;

    @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
    @IsOptional()
    @IsDateString()
    startsAt?: string;

    @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @ApiPropertyOptional({ example: true, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateCouponDto {
    @ApiPropertyOptional({ enum: CouponType })
    @IsOptional()
    @IsEnum(CouponType)
    type?: CouponType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @IsPositive()
    value?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    minPurchaseAmount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxDiscountAmount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    usageLimit?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    usageLimitPerCustomer?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startsAt?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class ValidateCouponDto {
    @ApiProperty({ example: 'VERANO2026' })
    @IsString()
    code: string;

    @ApiProperty({ example: 150.00 })
    @IsNumber()
    @Min(0)
    cartTotal: number;
}
