import { IsString, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateAuditLogDto {
    storeId?: string;
    userId?: string;
    action: string;
    entity: string;
    entityId: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

export class AuditFiltersDto {
    @ApiPropertyOptional({ description: 'Filtrar por entidad (Product, Order, etc.)' })
    @IsOptional()
    @IsString()
    entity?: string;

    @ApiPropertyOptional({ description: 'Filtrar por acción (CREATE, UPDATE, DELETE)' })
    @IsOptional()
    @IsString()
    action?: string;

    @ApiPropertyOptional({ description: 'Filtrar por usuario' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'Fecha desde (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Fecha hasta (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;

    @ApiPropertyOptional({ description: 'Buscar en entityId' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 50 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 50;
}
