import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CustomersService {
    private readonly logger = new Logger(CustomersService.name);

    constructor(private readonly prisma: PrismaService) { }

    async findAll(storeId: string, page = 1, limit = 20) {
        const [profiles, total] = await Promise.all([
            this.prisma.storeCustomerProfile.findMany({
                where: { storeId },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
            }),
            this.prisma.storeCustomerProfile.count({ where: { storeId } }),
        ]);

        return {
            data: profiles.map(p => ({
                id: p.id,
                email: p.user.email,
                firstName: p.user.firstName,
                lastName: p.user.lastName,
                phone: null,
                ordersCount: p.ordersCount,
                totalSpent: p.totalSpent,
                notes: p.notes,
                tags: p.tags,
                lastOrderAt: p.lastOrderAt,
                createdAt: p.createdAt,
            })),
            meta: { total, page, limit },
        };
    }

    async findById(storeId: string, customerId: string) {
        const profile = await this.prisma.storeCustomerProfile.findFirst({
            where: { id: customerId, storeId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        emailVerified: true,
                    },
                },
                buyerAddresses: true,
            },
        });

        if (!profile) {
            throw new NotFoundException('Cliente no encontrado');
        }

        const orders = await this.prisma.order.findMany({
            where: { storeId, customerEmail: profile.user.email },
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
                                    select: { url: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        return {
            id: profile.id,
            storeId: profile.storeId,
            email: profile.user.email,
            firstName: profile.user.firstName,
            lastName: profile.user.lastName,
            phone: profile.user.phone,
            emailVerified: profile.user.emailVerified,
            acceptsMarketing: profile.acceptsMarketing,
            ordersCount: profile.ordersCount,
            totalSpent: profile.totalSpent,
            notes: profile.notes,
            tags: profile.tags,
            lastOrderAt: profile.lastOrderAt,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
            addresses: profile.buyerAddresses,
            orders,
        };
    }
}
