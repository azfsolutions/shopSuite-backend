import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlanType } from '@prisma/client';

export class ActivateSubscriptionDto {
    @ApiProperty({ enum: PlanType })
    @IsEnum(PlanType)
    @IsNotEmpty()
    planType: PlanType;
}
