import { IsString, IsInt, IsBoolean, IsOptional, Min, Max, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFeaturedConfigDto {
    @ApiProperty({ description: 'Minimum sales count for bestseller detection', minimum: 1, default: 100 })
    @IsOptional()
    @IsInt()
    @Min(1)
    minSalesForBestseller?: number;

    @ApiProperty({ description: 'Minimum rating for top-rated detection', minimum: 0, maximum: 5, default: 4.5 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(5)
    minRatingForTopRated?: number;

    @ApiProperty({ description: 'Minimum reviews count for top-rated detection', minimum: 1, default: 5 })
    @IsOptional()
    @IsInt()
    @Min(1)
    minReviewsForTopRated?: number;

    @ApiProperty({ description: 'Maximum stock for limited detection', minimum: 1, default: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxStockForLimited?: number;

    @ApiProperty({ description: 'Maximum featured products to display', minimum: 1, default: 12 })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxFeaturedProducts?: number;

    @ApiProperty({ description: 'Enable bestseller automatic detection', default: true })
    @IsOptional()
    @IsBoolean()
    enableBestseller?: boolean;

    @ApiProperty({ description: 'Enable top-rated automatic detection', default: true })
    @IsOptional()
    @IsBoolean()
    enableTopRated?: boolean;

    @ApiProperty({ description: 'Enable limited stock automatic detection', default: true })
    @IsOptional()
    @IsBoolean()
    enableLimited?: boolean;
}

export class AddManualFeaturedProductDto {
    @ApiProperty({ description: 'Product ID to feature' })
    @IsString()
    productId: string;

    @ApiProperty({ description: 'Reason for featuring', enum: ['curated', 'seasonal', 'special'], default: 'curated' })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiProperty({ description: 'Display position (lower = higher priority)', default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;

    @ApiProperty({ description: 'Pin product (always stays featured)', default: false })
    @IsOptional()
    @IsBoolean()
    isPinned?: boolean;
}

export class UpdateFeaturedProductPositionDto {
    @ApiProperty({ description: 'New position for the product' })
    @IsInt()
    @Min(0)
    position: number;
}
