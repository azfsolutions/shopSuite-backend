import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAuditLogDto, AuditFiltersDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
    constructor(private readonly prisma: PrismaService) { }

    // ============================================================
    // LOGGING
    // ============================================================

    async log(data: CreateAuditLogDto) {
        return this.prisma.auditLog.create({
            data: {
                storeId: data.storeId,
                userId: data.userId,
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                oldValues: data.oldValues as Prisma.InputJsonValue,
                newValues: data.newValues as Prisma.InputJsonValue,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        });
    }

    // ============================================================
    // QUERIES
    // ============================================================

    async getLogs(storeId: string, filters: AuditFiltersDto) {
        const {
            entity,
            action,
            userId,
            dateFrom,
            dateTo,
            search,
            page = 1,
            limit = 50,
        } = filters;

        const where: Prisma.AuditLogWhereInput = {
            storeId,
            ...(entity && { entity }),
            ...(action && { action }),
            ...(userId && { userId }),
            ...(search && { entityId: { contains: search } }),
            ...(dateFrom || dateTo
                ? {
                    createdAt: {
                        ...(dateFrom && { gte: new Date(dateFrom) }),
                        ...(dateTo && { lte: new Date(dateTo) }),
                    },
                }
                : {}),
        };

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getEntityHistory(storeId: string, entity: string, entityId: string) {
        return this.prisma.auditLog.findMany({
            where: { storeId, entity, entityId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getUserActivity(storeId: string, userId: string) {
        return this.prisma.auditLog.findMany({
            where: { storeId, userId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    async getStats(storeId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [todayCount, weekCount, byEntity, byAction] = await Promise.all([
            this.prisma.auditLog.count({
                where: { storeId, createdAt: { gte: today } },
            }),
            this.prisma.auditLog.count({
                where: { storeId, createdAt: { gte: weekAgo } },
            }),
            this.prisma.auditLog.groupBy({
                by: ['entity'],
                where: { storeId, createdAt: { gte: weekAgo } },
                _count: true,
            }),
            this.prisma.auditLog.groupBy({
                by: ['action'],
                where: { storeId, createdAt: { gte: weekAgo } },
                _count: true,
            }),
        ]);

        return {
            todayCount,
            weekCount,
            byEntity: byEntity.map((e) => ({ entity: e.entity, count: e._count })),
            byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
        };
    }

    async getForExport(storeId: string, filters: AuditFiltersDto) {
        const { entity, action, userId, dateFrom, dateTo } = filters;

        const where: Prisma.AuditLogWhereInput = {
            storeId,
            ...(entity && { entity }),
            ...(action && { action }),
            ...(userId && { userId }),
            ...(dateFrom || dateTo
                ? {
                    createdAt: {
                        ...(dateFrom && { gte: new Date(dateFrom) }),
                        ...(dateTo && { lte: new Date(dateTo) }),
                    },
                }
                : {}),
        };

        return this.prisma.auditLog.findMany({
            where,
            include: {
                user: { select: { firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10000, // Límite para exportación
        });
    }
}
