import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
    @ApiProperty({ example: 'Juan' })
    @IsString()
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ example: 'Pérez' })
    @IsString()
    @MaxLength(100)
    lastName: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    company?: string;

    @ApiProperty({ example: 'Av. España 1234' })
    @IsString()
    @MaxLength(255)
    address1: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    address2?: string;

    @ApiProperty({ example: 'Asunción' })
    @IsString()
    @MaxLength(100)
    city: string;

    @ApiProperty({ example: 'Central' })
    @IsString()
    @MaxLength(100)
    state: string;

    @ApiProperty({ example: '1234' })
    @IsString()
    @MaxLength(20)
    postalCode: string;

    @ApiProperty({ example: 'Paraguay' })
    @IsString()
    @MaxLength(100)
    country: string;

    @ApiPropertyOptional({ example: '+595991234567' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}

export class UpdateAddressDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    company?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    address1?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(255)
    address2?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    postalCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
