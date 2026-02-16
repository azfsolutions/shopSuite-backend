import {
    Injectable,
    ConflictException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';

@Injectable()
export class StoresService {
    private readonly logger = new Logger(StoresService.name);

    constructor(private readonly prisma: PrismaService) { }

    async create(ownerId: string, createStoreDto: CreateStoreDto) {
        const { slug } = createStoreDto;

        // Check if slug is taken
        const existingStore = await this.prisma.store.findUnique({
            where: { slug },
        });

        if (existingStore) {
            throw new ConflictException('El slug ya está en uso');
        }

        // Check subdomain
        const existingSubdomain = await this.prisma.store.findUnique({
            where: { subdomain: slug },
        });

        if (existingSubdomain) {
            throw new ConflictException('El subdominio ya está en uso');
        }

        // Create store with settings
        const store = await this.prisma.store.create({
            data: {
                ...createStoreDto,
                subdomain: slug,
                ownerId,
                settings: {
                    create: {},
                },
            },
            include: {
                settings: true,
            },
        });

        // Create owner as member with OWNER role
        await this.prisma.storeMember.create({
            data: {
                userId: ownerId,
                storeId: store.id,
                role: 'OWNER',
            },
        });

        return store;
    }

    async findAll(userId: string) {
        // Get stores where user is owner or member
        const stores = await this.prisma.store.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
            include: {
                _count: {
                    select: {
                        products: true,
                        orders: true,
                        customers: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return stores;
    }

    async findById(storeId: string) {
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            include: {
                settings: true,
                _count: {
                    select: {
                        products: true,
                        orders: true,
                        customers: true,
                        members: true,
                    },
                },
            },
        });

        if (!store) {
            throw new NotFoundException('Tienda no encontrada');
        }

        return store;
    }

    async findBySlug(slug: string) {
        const store = await this.prisma.store.findUnique({
            where: { slug },
            include: {
                settings: true,
            },
        });

        if (!store) {
            throw new NotFoundException('Tienda no encontrada');
        }

        return store;
    }

    async update(storeId: string, updateStoreDto: UpdateStoreDto) {
        // Verify store exists before updating
        await this.findById(storeId);

        return this.prisma.store.update({
            where: { id: storeId },
            data: updateStoreDto,
            include: {
                settings: true,
            },
        });
    }

    async delete(storeId: string) {
        // Verify store exists before deleting
        await this.findById(storeId);

        // Soft delete
        return this.prisma.store.update({
            where: { id: storeId },
            data: { deletedAt: new Date() },
        });
    }

    async getDashboardStats(storeId: string) {
        const [
            totalProducts,
            totalOrders,
            totalCustomers,
            pendingOrders,
            todayOrders,
        ] = await Promise.all([
            this.prisma.product.count({
                where: { storeId, deletedAt: null },
            }),
            this.prisma.order.count({
                where: { storeId },
            }),
            this.prisma.customer.count({
                where: { storeId, deletedAt: null },
            }),
            this.prisma.order.count({
                where: { storeId, status: 'PENDING' },
            }),
            this.prisma.order.count({
                where: {
                    storeId,
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
        ]);

        // Get total revenue
        const revenueResult = await this.prisma.order.aggregate({
            where: { storeId, paymentStatus: 'PAID' },
            _sum: { total: true },
        });

        return {
            totalProducts,
            totalOrders,
            totalCustomers,
            pendingOrders,
            todayOrders,
            totalRevenue: revenueResult._sum.total || 0,
        };
    }
}
