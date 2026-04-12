import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { AuditFiltersDto } from './dto';
import { AuthGuard, GlobalRoleGuard, StoreAccessGuard } from '../../core/guards';
import { RequireGlobalRole } from '../../core/decorators';
import { CurrentStore } from '../../core/decorators/current-store.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(AuthGuard, GlobalRoleGuard, StoreAccessGuard)
@RequireGlobalRole('USER', 'SUPER_ADMIN')
@Controller('audit')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    @ApiOperation({ summary: 'Listar audit logs con filtros' })
    @ApiResponse({ status: 200, description: 'Lista paginada de logs' })
    getLogs(
        @CurrentStore('id') storeId: string,
        @Query() filters: AuditFiltersDto,
    ) {
        return this.auditService.getLogs(storeId, filters);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Estadísticas de actividad' })
    @ApiResponse({ status: 200, description: 'Estadísticas' })
    getStats(@CurrentStore('id') storeId: string) {
        return this.auditService.getStats(storeId);
    }

    @Get('entity/:entity/:entityId')
    @ApiOperation({ summary: 'Historial de cambios de una entidad' })
    @ApiResponse({ status: 200, description: 'Timeline de cambios' })
    getEntityHistory(
        @CurrentStore('id') storeId: string,
        @Param('entity') entity: string,
        @Param('entityId') entityId: string,
    ) {
        return this.auditService.getEntityHistory(storeId, entity, entityId);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Actividad de un usuario' })
    @ApiResponse({ status: 200, description: 'Últimas 100 acciones del usuario' })
    getUserActivity(
        @CurrentStore('id') storeId: string,
        @Param('userId') userId: string,
    ) {
        return this.auditService.getUserActivity(storeId, userId);
    }

    @Get('export')
    @ApiOperation({ summary: 'Exportar logs a CSV' })
    @ApiResponse({ status: 200, description: 'Archivo CSV' })
    async exportLogs(
        @CurrentStore('id') storeId: string,
        @Query() filters: AuditFiltersDto,
        @Res() res: Response,
    ) {
        const logs = await this.auditService.getForExport(storeId, filters);

        // Generar CSV
        const headers = ['Fecha', 'Usuario', 'Acción', 'Entidad', 'ID Entidad', 'IP'];
        const rows = logs.map((log) => [
            log.createdAt.toISOString(),
            log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema',
            log.action,
            log.entity,
            log.entityId,
            log.ipAddress || '',
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        res.send(csv);
    }
}
