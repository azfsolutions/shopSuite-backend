import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { WholesaleThresholdUnit } from '@prisma/client';

export class UpdateWholesaleSettingsDto {
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @IsOptional()
    @IsEnum(WholesaleThresholdUnit)
    thresholdUnit?: WholesaleThresholdUnit;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100000)
    thresholdValue?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(90)
    reservationDays?: number;
}
