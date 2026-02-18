import {
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
    IsEmail,
    Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateStoreDto {
    @ApiProperty({ example: 'Mi Tienda Online' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    @Transform(({ value }) => value?.trim())
    name: string;

    @ApiProperty({ example: 'mi-tienda' })
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'El slug solo puede contener letras minúsculas, números y guiones',
    })
    @Transform(({ value }) => value?.toLowerCase().trim())
    slug: string;

    @ApiProperty({ example: 'Tu tienda de confianza', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({ example: 'store@example.com' })
    @IsEmail()
    @Transform(({ value }) => value?.toLowerCase().trim())
    email: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsOptional()
    @IsString()
    phone?: string;
}

export class SetCustomDomainDto {
    @ApiProperty({ example: 'shop.example.com' })
    @IsString()
    @MinLength(4)
    @MaxLength(253)
    @Matches(/^(?!-)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/, {
        message: 'Invalid domain format (e.g. shop.example.com)',
    })
    @Transform(({ value }) => value?.toLowerCase().trim())
    customDomain: string;
}

export class UpdateStoreDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    logo?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    primaryColor?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    secondaryColor?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    address?: string;
}
