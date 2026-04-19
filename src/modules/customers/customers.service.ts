import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CustomersService {
    private readonly logger = new Logger(CustomersService.name);

    constructor(private readonly prisma: PrismaService) {}

    async findAll(storeId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [customers, total] = await Promise.all([
            this.prisma.customer.findMany({
                where: { storeId, deletedAt: null },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    buyerUser: {
                        select: { phone: true, emailVerified: true },
                    },
                },
            }),
            this.prisma.customer.count({ where: { storeId, deletedAt: null } }),
        ]);

        return {
            data: customers.map(c => ({
                id: c.id,
                email: c.email,
                firstName: c.firstName,
                lastName: c.lastName,
                phone: c.phone ?? c.buyerUser?.phone ?? null,
                emailVerified: c.buyerUser?.emailVerified ?? c.emailVerified,
                acceptsMarketing: c.acceptsMarketing,
                ordersCount: c.ordersCount,
                totalSpent: c.totalSpent,
                customerType: c.customerType,
                notes: c.notes,
                tags: c.tags,
                lastOrderAt: c.lastOrderAt,
                createdAt: c.createdAt,
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(storeId: string, customerId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, storeId, deletedAt: null },
            include: {
                buyerUser: {
                    select: { id: true, emailVerified: true, phone: true },
                },
                addresses: true,
            },
        });

        if (!customer) {
            throw new NotFoundException('Cliente no encontrado');
        }

        const orders = await this.prisma.order.findMany({
            where: { storeId, customerEmail: customer.email },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orderNumber: true,
                total: true,
                status: true,
                paymentStatus: true,
                createdAt: true,
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        product: {
                            select: {
                                name: true,
                                images: { take: 1, select: { url: true } },
                            },
                        },
                    },
                },
            },
        });

        return {
            id: customer.id,
            storeId: customer.storeId,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone ?? customer.buyerUser?.phone ?? null,
            emailVerified: customer.buyerUser?.emailVerified ?? customer.emailVerified,
            acceptsMarketing: customer.acceptsMarketing,
            ordersCount: customer.ordersCount,
            totalSpent: customer.totalSpent,
            customerType: customer.customerType,
            notes: customer.notes,
            tags: customer.tags,
            lastOrderAt: customer.lastOrderAt,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
            addresses: customer.addresses,
            orders,
        };
    }
}
