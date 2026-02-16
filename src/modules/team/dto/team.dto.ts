import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, IsNotIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Usando el enum del schema Prisma
export enum StoreRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    EDITOR = 'EDITOR',
    SUPPORT = 'SUPPORT',
    VIEWER = 'VIEWER',
}

export class InviteMemberDto {
    @ApiProperty({ example: 'colaborador@email.com' })
    @IsEmail({}, { message: 'Email inválido' })
    @Transform(({ value }) => value.toLowerCase().trim())
    email: string;

    @ApiProperty({ enum: StoreRole, example: 'ADMIN' })
    @IsEnum(StoreRole)
    @IsNotIn(['OWNER'], { message: 'No se puede invitar como OWNER' })
    role: StoreRole;

    @ApiPropertyOptional({ example: 'Te invito a gestionar nuestra tienda' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;
}

export class UpdateMemberRoleDto {
    @ApiProperty({ enum: StoreRole, example: 'EDITOR' })
    @IsEnum(StoreRole)
    @IsNotIn(['OWNER'], { message: 'No se puede asignar rol OWNER' })
    role: StoreRole;
}

export class RespondInvitationDto {
    @ApiProperty({ enum: ['accept', 'reject'], example: 'accept' })
    @IsString()
    action: 'accept' | 'reject';
}
