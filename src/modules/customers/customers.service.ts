import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CustomersService {
    private readonly logger = new Logger(CustomersService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findAll(storeId: string, page = 1, limit = 20) {
        const [customers, total] = await Promise.all([
            this.prisma.customer.findMany({
                where: { storeId, deletedAt: null },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.customer.count({ where: { storeId, deletedAt: null } }),
        ]);
        return { data: customers, meta: { total, page, limit } };
    }

    async findById(storeId: string, customerId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, storeId },
            select: {
                id: true,
                storeId: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                emailVerified: true,
                acceptsMarketing: true,
                ordersCount: true,
                totalSpent: true,
                notes: true,
                tags: true,
                lastOrderAt: true,
                createdAt: true,
                updatedAt: true,
                addresses: true,
                orders: {
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
                                        images: {
                                            take: 1,
                                            select: { url: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!customer) {
            throw new NotFoundException('Cliente no encontrado');
        }

        return customer;
    }
}
