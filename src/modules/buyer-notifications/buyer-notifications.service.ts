import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BuyerNotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(buyerUserId: string, storeId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
            this.prisma.buyerNotification.findMany({
                where: { buyerUserId, storeId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.buyerNotification.count({ where: { buyerUserId, storeId } }),
            this.prisma.buyerNotification.count({ where: { buyerUserId, storeId, isRead: false } }),
        ]);

        return {
            data: notifications,
            meta: { total, page, limit, unreadCount },
        };
    }

    async getUnreadCount(buyerUserId: string, storeId: string) {
        const count = await this.prisma.buyerNotification.count({
            where: { buyerUserId, storeId, isRead: false },
        });
        return { count };
    }

    async markAsRead(buyerUserId: string, storeId: string, notificationId: string) {
        const notification = await this.prisma.buyerNotification.findFirst({
            where: { id: notificationId, buyerUserId, storeId },
        });

        if (!notification) {
            throw new NotFoundException('Notificación no encontrada');
        }

        return this.prisma.buyerNotification.update({
            where: { id: notificationId },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async markAllAsRead(buyerUserId: string, storeId: string) {
        await this.prisma.buyerNotification.updateMany({
            where: { buyerUserId, storeId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        return { message: 'Todas las notificaciones marcadas como leídas' };
    }

    async createForBuyer(data: {
        buyerUserId: string;
        storeId: string;
        type: 'ORDER_UPDATE' | 'NEWSLETTER' | 'PROMOTIONAL';
        title: string;
        message: string;
        data?: object;
    }) {
        return this.prisma.buyerNotification.create({ data });
    }
}
