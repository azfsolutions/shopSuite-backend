import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

/**
 * Service para gestionar suscriptores del Newsletter
 */
@Injectable()
export class NewsletterService {
    private readonly logger = new Logger(NewsletterService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtener todos los suscriptores de una tienda
     */
    async findAllByStore(storeId: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [subscribers, total] = await Promise.all([
            this.prisma.newsletterSubscriber.findMany({
                where: { storeId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.newsletterSubscriber.count({ where: { storeId } }),
        ]);

        // Map to include subscribedAt for frontend compatibility
        const mappedSubscribers = subscribers.map((s) => ({
            ...s,
            subscribedAt: s.createdAt.toISOString(),
        }));

        return {
            subscribers: mappedSubscribers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Suscribir un email al newsletter (público)
     */
    async subscribe(storeId: string, subscribeDto: SubscribeNewsletterDto) {
        const emailLower = subscribeDto.email.toLowerCase();

        // Verificar si ya existe
        const existing = await this.prisma.newsletterSubscriber.findFirst({
            where: { storeId, email: emailLower },
        });

        if (existing) {
            throw new ConflictException('Este email ya está suscrito');
        }

        const subscriber = await this.prisma.newsletterSubscriber.create({
            data: {
                storeId,
                email: emailLower,
            },
        });

        return subscriber;
    }

    /**
     * Desuscribir un email
     */
    async unsubscribe(storeId: string, email: string) {
        const emailLower = email.toLowerCase();

        const subscriber = await this.prisma.newsletterSubscriber.findFirst({
            where: { storeId, email: emailLower },
        });

        if (!subscriber) {
            throw new NotFoundException('Suscriptor no encontrado');
        }

        await this.prisma.newsletterSubscriber.delete({
            where: { id: subscriber.id },
        });

        return { message: 'Suscripción cancelada exitosamente' };
    }

    /**
     * Eliminar un suscriptor por ID (scoped al storeId)
     */
    async delete(storeId: string, subscriberId: string) {
        const subscriber = await this.prisma.newsletterSubscriber.findFirst({
            where: { id: subscriberId, storeId },
        });

        if (!subscriber) {
            throw new NotFoundException('Suscriptor no encontrado');
        }

        await this.prisma.newsletterSubscriber.delete({
            where: { id: subscriberId },
        });

        return { message: 'Suscriptor eliminado exitosamente' };
    }

    /**
     * Exportar suscriptores a formato CSV
     */
    async exportToCsv(storeId: string): Promise<string> {
        const subscribers = await this.prisma.newsletterSubscriber.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
        });

        // CSV header
        let csv = 'email,subscribedAt\n';

        // CSV rows
        for (const sub of subscribers) {
            const date = sub.createdAt.toISOString();
            csv += `${sub.email},${date}\n`;
        }

        return csv;
    }

    /**
     * Obtener estadísticas de suscriptores
     */
    async getStats(storeId: string) {
        const total = await this.prisma.newsletterSubscriber.count({
            where: { storeId },
        });

        // Suscriptores de los últimos 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentCount = await this.prisma.newsletterSubscriber.count({
            where: {
                storeId,
                createdAt: { gte: thirtyDaysAgo },
            },
        });

        return {
            total,
            last30Days: recentCount,
        };
    }

    /**
     * Enviar mensaje a todos los suscriptores activos de una tienda
     */
    async broadcast(storeId: string, subject: string, message: string) {
        const subscribers = await this.prisma.newsletterSubscriber.findMany({
            where: { storeId, isActive: true },
            include: {
                buyerUser: { select: { id: true } },
            },
        });

        // Crear BuyerNotification para suscriptores con cuenta
        const notificationPromises = subscribers
            .filter(s => s.buyerUser)
            .map(s =>
                this.prisma.buyerNotification.create({
                    data: {
                        buyerUserId: s.buyerUser!.id,
                        storeId,
                        type: 'NEWSLETTER' as const,
                        title: subject,
                        message,
                    },
                }),
            );

        await Promise.all(notificationPromises);

        this.logger.log(
            `Newsletter broadcast: ${subject} enviado a ${subscribers.length} suscriptores en tienda ${storeId}`,
        );

        return {
            sent: subscribers.length,
            withAccount: subscribers.filter(s => s.buyerUser).length,
            emailOnly: subscribers.filter(s => !s.buyerUser).length,
        };
    }
}
