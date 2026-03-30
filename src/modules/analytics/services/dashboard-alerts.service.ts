import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class DashboardAlertsService {
    constructor(private readonly prisma: PrismaService) {}

    async getDashboardAlerts(storeId: string) {
        const urgentCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

        const [lowStock, urgentOrders] = await Promise.all([
            this.prisma.$queryRaw<Array<{
                id: string;
                name: string;
                stock: number;
                lowStockThreshold: number;
                sku: string | null;
            }>>(Prisma.sql`
                SELECT id, name, stock, "lowStockThreshold", sku
                FROM products
                WHERE "storeId" = ${storeId}
                  AND "trackInventory" = true
                  AND stock <= "lowStockThreshold"
                  AND "deletedAt" IS NULL
                ORDER BY stock ASC
                LIMIT 5
            `),
            this.prisma.order.findMany({
                where: {
                    storeId,
                    status: 'PENDING',
                    createdAt: { lt: urgentCutoff },
                },
                select: {
                    id: true,
                    orderNumber: true,
                    createdAt: true,
                    customerFirstName: true,
                    customerLastName: true,
                },
                orderBy: { createdAt: 'asc' },
                take: 10,
            }),
        ]);

        return {
            lowStock: lowStock.map(p => ({
                ...p,
                stock: Number(p.stock),
                lowStockThreshold: Number(p.lowStockThreshold),
            })),
            urgentOrders: urgentOrders.map(o => ({
                ...o,
                hoursWaiting: Math.floor((Date.now() - o.createdAt.getTime()) / (1000 * 60 * 60)),
            })),
        };
    }
}
