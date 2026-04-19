import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CustomerType } from '@prisma/client';

export class SetTierDto {
    @IsEnum(CustomerType)
    customerType: CustomerType;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    note?: string;
}
