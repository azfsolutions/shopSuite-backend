import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findAll(storeId: string, status?: string, page = 1, limit = 20) {
        const where: any = { storeId };
        if (status) {
            where.status = status;
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.order.count({ where }),
        ]);

        this.logger.debug(`findAll(${storeId}): found ${orders.length} of ${total}`);

        return {
            data: orders,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(storeId: string, orderId: string) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, storeId },
        });

        if (!order) {
            throw new NotFoundException('Pedido no encontrado');
        }

        return order;
    }

    async updateStatus(storeId: string, orderId: string, status: string, userId?: string) {
        // Verify order exists
        await this.findById(storeId, orderId);

        const updated = await this.prisma.order.update({
            where: { id: orderId },
            data: { status: status as any },
        });

        this.logger.log(`Order ${orderId} status updated to ${status} by user ${userId}`);

        return updated;
    }
}
