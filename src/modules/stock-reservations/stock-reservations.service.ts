import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CustomerType, Prisma, StockReservationReason } from '@prisma/client';

export interface AvailableStock {
    physical: number;
    reservedForOthers: number;
    retailReserved: number;
    availableForRetail: number;
    availableForVip: number;
}

@Injectable()
export class StockReservationsService {
    private readonly logger = new Logger(StockReservationsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getAvailable(
        storeId: string,
        productId: string,
        forCustomerId?: string,
    ): Promise<AvailableStock> {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, storeId, deletedAt: null },
            select: { stock: true, retailReserveQty: true, trackInventory: true },
        });
        if (!product) throw new BadRequestException('Producto no encontrado');

        const physical = product.trackInventory ? product.stock : Number.MAX_SAFE_INTEGER;
        const retailReserved = product.retailReserveQty;

        const activeReservations = await this.prisma.stockReservation.findMany({
            where: {
                productId,
                storeId,
                releasedAt: null,
                expiresAt: { gt: new Date() },
            },
            select: { quantity: true, customerId: true },
        });

        const reservedForOthers = activeReservations
            .filter((r) => r.customerId !== forCustomerId)
            .reduce((sum, r) => sum + r.quantity, 0);

        const availableForVip = Math.max(0, physical - reservedForOthers);
        const availableForRetail = Math.max(0, availableForVip - retailReserved);

        return { physical, reservedForOthers, retailReserved, availableForRetail, availableForVip };
    }

    async reserveForVip(params: {
        storeId: string;
        customerId: string;
        productId: string;
        quantity: number;
        reason: StockReservationReason;
        sourceId?: string;
        ttlDays: number;
        tx?: Prisma.TransactionClient;
    }) {
        const client = params.tx ?? this.prisma;
        const expiresAt = new Date(Date.now() + params.ttlDays * 24 * 60 * 60 * 1000);

        const customer = await client.customer.findFirst({
            where: { id: params.customerId, storeId: params.storeId, deletedAt: null },
            select: { customerType: true },
        });
        if (!customer || customer.customerType !== CustomerType.B2B_VIP) {
            throw new BadRequestException('Solo clientes B2B_VIP pueden reservar stock');
        }

        return client.stockReservation.create({
            data: {
                storeId: params.storeId,
                customerId: params.customerId,
                productId: params.productId,
                quantity: params.quantity,
                reason: params.reason,
                sourceId: params.sourceId,
                expiresAt,
            },
        });
    }

    async release(reservationId: string, tx?: Prisma.TransactionClient) {
        const client = tx ?? this.prisma;
        return client.stockReservation.update({
            where: { id: reservationId },
            data: { releasedAt: new Date() },
        });
    }

    async releaseBySource(sourceId: string, tx?: Prisma.TransactionClient) {
        const client = tx ?? this.prisma;
        return client.stockReservation.updateMany({
            where: { sourceId, releasedAt: null },
            data: { releasedAt: new Date() },
        });
    }

    async expireOverdue(): Promise<number> {
        const result = await this.prisma.stockReservation.updateMany({
            where: { releasedAt: null, expiresAt: { lt: new Date() } },
            data: { releasedAt: new Date() },
        });
        if (result.count > 0) {
            this.logger.log({ event: 'STOCK_RESERVATIONS_EXPIRED', count: result.count });
        }
        return result.count;
    }
}
