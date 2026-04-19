import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { WholesaleRequestStatus } from '@prisma/client';

export class UpdateWholesaleRequestDto {
    @IsOptional()
    @IsEnum(WholesaleRequestStatus)
    status?: WholesaleRequestStatus;

    @IsOptional()
    @IsUUID()
    assignedToId?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    rejectionReason?: string;
}
