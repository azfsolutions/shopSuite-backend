import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

export class AnalyticsQueryDto {
    @ApiPropertyOptional({ enum: ['today', 'week', 'month', 'year', 'custom'], default: 'month' })
    @IsOptional()
    @IsEnum(['today', 'week', 'month', 'year', 'custom'])
    period?: AnalyticsPeriod = 'month';

    @ApiPropertyOptional({ description: 'Start date for custom period' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for custom period' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 10;
}

export class AtRiskCustomersQueryDto {
    @ApiPropertyOptional({ description: 'Días sin comprar para considerar cliente en riesgo', default: 60 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    daysInactive?: number = 60;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
