import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBuyerProfileDto {
    @ApiPropertyOptional({ example: 'Juan' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    firstName?: string;

    @ApiPropertyOptional({ example: 'Pérez' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    lastName?: string;

    @ApiPropertyOptional({ example: '+595991234567' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;
}
