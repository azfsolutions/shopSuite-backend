import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShippingMethodDto, UpdateShippingMethodDto } from './dto/shipping-method.dto';

export interface ShippingMethodWithCost {
    id: string;
    name: string;
    description: string | null;
    price: number;
    freeAbove: number | null;
    minDays: number | null;
    maxDays: number | null;
    isActive: boolean;
    position: number;
    // Calculated
    calculatedPrice: number;
    isFree: boolean;
    deliveryEstimate: string | null;
}

@Injectable()
export class ShippingService {
    constructor(private readonly prisma: PrismaService) { }

    async create(storeId: string, dto: CreateShippingMethodDto) {
        // Obtener posición máxima actual
        const maxPosition = await this.prisma.shippingMethod.aggregate({
            where: { storeId },
            _max: { position: true },
        });

        return this.prisma.shippingMethod.create({
            data: {
                storeId,
                name: dto.name,
                description: dto.description,
                price: dto.price,
                freeAbove: dto.freeAbove,
                minDays: dto.minDays,
                maxDays: dto.maxDays,
                isActive: dto.isActive ?? true,
                position: (maxPosition._max.position ?? -1) + 1,
            },
        });
    }

    async findAll(storeId: string, includeInactive = false) {
        const where: any = { storeId };
        if (!includeInactive) {
            where.isActive = true;
        }

        return this.prisma.shippingMethod.findMany({
            where,
            orderBy: { position: 'asc' },
        });
    }

    async findOne(storeId: string, id: string) {
        const method = await this.prisma.shippingMethod.findFirst({
            where: { id, storeId },
        });

        if (!method) {
            throw new NotFoundException('Método de envío no encontrado');
        }

        return method;
    }

    async update(storeId: string, id: string, dto: UpdateShippingMethodDto) {
        await this.findOne(storeId, id);

        return this.prisma.shippingMethod.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                price: dto.price,
                freeAbove: dto.freeAbove,
                minDays: dto.minDays,
                maxDays: dto.maxDays,
                isActive: dto.isActive,
                position: dto.position,
            },
        });
    }

    async delete(storeId: string, id: string) {
        await this.findOne(storeId, id);

        return this.prisma.shippingMethod.delete({
            where: { id },
        });
    }

    async reorder(storeId: string, ids: string[]) {
        const updates = ids.map((id, index) =>
            this.prisma.shippingMethod.update({
                where: { id },
                data: { position: index },
            })
        );

        await this.prisma.$transaction(updates);

        return this.findAll(storeId, true);
    }

    async getAvailableForCart(storeId: string, cartTotal: number): Promise<ShippingMethodWithCost[]> {
        const methods = await this.prisma.shippingMethod.findMany({
            where: { storeId, isActive: true },
            orderBy: { position: 'asc' },
        });

        return methods.map((method) => {
            const freeAbove = method.freeAbove ? Number(method.freeAbove) : null;
            const isFree = freeAbove !== null && cartTotal >= freeAbove;
            const calculatedPrice = isFree ? 0 : Number(method.price);

            let deliveryEstimate: string | null = null;
            if (method.minDays && method.maxDays) {
                deliveryEstimate = method.minDays === method.maxDays
                    ? `${method.minDays} días`
                    : `${method.minDays}-${method.maxDays} días`;
            } else if (method.minDays) {
                deliveryEstimate = `${method.minDays}+ días`;
            } else if (method.maxDays) {
                deliveryEstimate = `Hasta ${method.maxDays} días`;
            }

            return {
                id: method.id,
                name: method.name,
                description: method.description,
                price: Number(method.price),
                freeAbove,
                minDays: method.minDays,
                maxDays: method.maxDays,
                isActive: method.isActive,
                position: method.position,
                calculatedPrice,
                isFree,
                deliveryEstimate,
            };
        });
    }
}
