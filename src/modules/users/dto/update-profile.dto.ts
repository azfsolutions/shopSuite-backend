import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
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

    @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    avatar?: string;
}
