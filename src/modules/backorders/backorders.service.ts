import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBackorderDto } from './dto/create-backorder.dto';
import { BackorderStatus } from '@prisma/client';

@Injectable()
export class BackordersService {
    private readonly logger = new Logger(BackordersService.name);

    constructor(private readonly prisma: PrismaService) {}

    async create(storeId: string, dto: CreateBackorderDto) {
        const order = await this.prisma.b2BOrder.findFirst({
            where: { id: dto.orderId, storeId },
            select: { id: true, customerId: true },
        });
        if (!order) throw new NotFoundException('Orden B2B no encontrada');
        if (order.customerId !== dto.customerId) {
            throw new BadRequestException('El cliente no coincide con la orden');
        }

        const backorder = await this.prisma.backorder.create({
            data: {
                storeId,
                orderId: dto.orderId,
                productId: dto.productId,
                customerId: dto.customerId,
                quantity: dto.quantity,
                estimatedDate: dto.estimatedDate ? new Date(dto.estimatedDate) : undefined,
            },
        });

        this.logger.log({ event: 'BACKORDER_CREATED', storeId, backorderId: backorder.id });
        return backorder;
    }

    async fulfill(storeId: string, backorderId: string, qty: number) {
        const backorder = await this.prisma.backorder.findFirst({
            where: { id: backorderId, storeId },
        });
        if (!backorder) throw new NotFoundException('Backorder no encontrado');
        if (backorder.status === BackorderStatus.FULFILLED || backorder.status === BackorderStatus.CANCELLED) {
            throw new BadRequestException('Backorder ya cerrado');
        }

        const newFulfilled = backorder.fulfilledQty + qty;
        if (newFulfilled > backorder.quantity) {
            throw new BadRequestException('Cantidad excede el pendiente');
        }

        const status =
            newFulfilled === backorder.quantity
                ? BackorderStatus.FULFILLED
                : BackorderStatus.PARTIAL_FULFILLED;

        return this.prisma.backorder.update({
            where: { id: backorderId },
            data: {
                fulfilledQty: newFulfilled,
                status,
                fulfilledAt: status === BackorderStatus.FULFILLED ? new Date() : null,
            },
        });
    }

    async cancel(storeId: string, backorderId: string) {
        const backorder = await this.prisma.backorder.findFirst({
            where: { id: backorderId, storeId },
        });
        if (!backorder) throw new NotFoundException('Backorder no encontrado');
        if (backorder.status === BackorderStatus.FULFILLED) {
            throw new BadRequestException('No se puede cancelar un backorder cumplido');
        }

        return this.prisma.backorder.update({
            where: { id: backorderId },
            data: { status: BackorderStatus.CANCELLED },
        });
    }

    async listForStore(storeId: string, status?: BackorderStatus) {
        return this.prisma.backorder.findMany({
            where: { storeId, ...(status && { status }) },
            orderBy: { createdAt: 'desc' },
            include: {
                product: { select: { id: true, name: true, slug: true } },
                customer: { select: { id: true, email: true, firstName: true, lastName: true } },
                order: { select: { id: true, number: true } },
            },
        });
    }
}
