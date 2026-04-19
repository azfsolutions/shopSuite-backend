import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CustomerType, WholesaleThresholdUnit } from '@prisma/client';

@Injectable()
export class CustomerTiersService {
    private readonly logger = new Logger(CustomerTiersService.name);

    constructor(private readonly prisma: PrismaService) {}

    async evaluateAndPromote(storeId: string, customerId: string): Promise<void> {
        const settings = await this.prisma.wholesaleSettings.findUnique({
            where: { storeId },
        });
        if (!settings || !settings.enabled) return;

        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, storeId, deletedAt: null },
            select: { id: true, customerType: true, ordersCount: true },
        });
        if (!customer || customer.customerType !== CustomerType.RETAIL) return;

        const meetsThreshold = await this.meetsThreshold(
            storeId,
            customerId,
            customer.ordersCount,
            settings.thresholdUnit,
            settings.thresholdValue,
        );
        if (!meetsThreshold) return;

        await this.prisma.customer.update({
            where: { id: customerId },
            data: { customerType: CustomerType.WHOLESALE },
        });

        this.logger.log({
            event: 'TIER_AUTO_PROMOTED',
            storeId,
            customerId,
            from: CustomerType.RETAIL,
            to: CustomerType.WHOLESALE,
            unit: settings.thresholdUnit,
            value: settings.thresholdValue,
        });
    }

    async setTier(
        storeId: string,
        customerId: string,
        nextType: CustomerType,
        approvedByUserId?: string,
    ) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, storeId, deletedAt: null },
        });
        if (!customer) throw new NotFoundException('Cliente no encontrado');

        if (nextType === CustomerType.B2B_VIP && !approvedByUserId) {
            throw new ForbiddenException('Promoción a B2B_VIP requiere usuario aprobador');
        }

        const updated = await this.prisma.customer.update({
            where: { id: customerId },
            data: {
                customerType: nextType,
                b2bApprovedAt: nextType === CustomerType.B2B_VIP ? new Date() : null,
                b2bApprovedById: nextType === CustomerType.B2B_VIP ? approvedByUserId ?? null : null,
            },
        });

        this.logger.log({
            event: 'TIER_CHANGED',
            storeId,
            customerId,
            from: customer.customerType,
            to: nextType,
            by: approvedByUserId ?? 'system',
        });

        return updated;
    }

    private async meetsThreshold(
        storeId: string,
        customerId: string,
        ordersCount: number,
        unit: WholesaleThresholdUnit,
        value: number,
    ): Promise<boolean> {
        if (unit === WholesaleThresholdUnit.ORDER_COUNT) {
            return ordersCount >= value;
        }

        if (unit === WholesaleThresholdUnit.UNITS_PER_ORDER) {
            const lastOrder = await this.prisma.order.findFirst({
                where: { storeId, customerId },
                orderBy: { createdAt: 'desc' },
                select: { items: { select: { quantity: true } } },
            });
            if (!lastOrder) return false;
            const totalUnits = lastOrder.items.reduce((sum, i) => sum + i.quantity, 0);
            return totalUnits >= value;
        }

        const agg = await this.prisma.orderItem.aggregate({
            where: { order: { storeId, customerId } },
            _sum: { quantity: true },
        });
        return (agg._sum.quantity ?? 0) >= value;
    }
}
