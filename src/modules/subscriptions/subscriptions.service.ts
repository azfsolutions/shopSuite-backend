import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PlanType, SubscriptionStatus, NotificationType } from '@prisma/client';

// Límites por plan
const PLAN_LIMITS = {
    FREE: { products: 25, staff: 1, storageGB: 0.1 },
    STARTER: { products: 100, staff: 3, storageGB: 1 },
    PROFESSIONAL: { products: 500, staff: 10, storageGB: 5 },
    ENTERPRISE: { products: -1, staff: -1, storageGB: 50 }, // -1 = ilimitado
};


@Injectable()
export class SubscriptionsService {
    constructor(private readonly prisma: PrismaService) { }

    // ============================================================
    // PLANS (Público)
    // ============================================================

    async getAllPlans() {
        return this.prisma.plan.findMany({
            where: { isActive: true },
            orderBy: { monthlyPrice: 'asc' },
        });
    }

    async getPlanByType(type: PlanType) {
        const plan = await this.prisma.plan.findUnique({
            where: { type },
        });

        if (!plan) {
            throw new NotFoundException('Plan no encontrado');
        }

        return plan;
    }

    // ============================================================
    // SUBSCRIPTION (Dashboard)
    // ============================================================

    async getSubscription(storeId: string) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { storeId },
            include: {
                plan: true,
            },
        });

        if (!subscription) {
            // Auto-crear suscripción FREE si no existe
            return this.createFreeSubscription(storeId);
        }

        return subscription;
    }

    async createFreeSubscription(storeId: string) {
        const freePlan = await this.prisma.plan.findUnique({
            where: { type: PlanType.FREE },
        });

        if (!freePlan) {
            throw new NotFoundException('Plan FREE no encontrado. Ejecuta el seed.');
        }

        return this.prisma.subscription.create({
            data: {
                storeId,
                planId: freePlan.id,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            },
            include: { plan: true },
        });
    }

    async getUsage(storeId: string) {
        const subscription = await this.getSubscription(storeId);
        const plan = subscription.plan;

        // Contar recursos actuales
        const [productCount, staffCount] = await Promise.all([
            this.prisma.product.count({ where: { storeId, deletedAt: null } }),
            this.prisma.storeMember.count({ where: { storeId } }),
        ]);

        // Calcular porcentajes
        const productUsage = plan.maxProducts === -1 ? 0 : (productCount / plan.maxProducts) * 100;
        const staffUsage = plan.maxStaff === -1 ? 0 : (staffCount / plan.maxStaff) * 100;

        return {
            subscription,
            usage: {
                products: {
                    current: productCount,
                    max: plan.maxProducts,
                    percentage: Math.round(productUsage),
                    isUnlimited: plan.maxProducts === -1,
                },
                staff: {
                    current: staffCount,
                    max: plan.maxStaff,
                    percentage: Math.round(staffUsage),
                    isUnlimited: plan.maxStaff === -1,
                },
                storage: {
                    current: 0, // TODO: Implementar cálculo de storage
                    max: plan.maxStorageGB,
                    percentage: 0,
                    isUnlimited: plan.maxStorageGB === -1,
                },
            },
            limits: PLAN_LIMITS[plan.type],
        };
    }

    async requestUpgrade(storeId: string, targetPlanType: PlanType) {
        const subscription = await this.getSubscription(storeId);
        const targetPlan = await this.getPlanByType(targetPlanType);

        if (subscription.plan.monthlyPrice >= targetPlan.monthlyPrice) {
            throw new BadRequestException('Solo puedes hacer upgrade a un plan superior');
        }

        // Marcar como pendiente de pago
        const updated = await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: SubscriptionStatus.PAST_DUE,
            },
            include: { plan: true },
        });

        // Notificar al owner
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            select: { ownerId: true, name: true },
        });

        if (store) {
            await this.prisma.notification.create({
                data: {
                    userId: store.ownerId,
                    type: NotificationType.SUBSCRIPTION_EXPIRING,
                    title: 'Solicitud de upgrade enviada',
                    message: `Tu solicitud para el plan ${targetPlan.name} ha sido registrada. Contacta con soporte para completar el pago.`,
                },
            });
        }

        return updated;
    }

    async cancelSubscription(storeId: string) {
        const subscription = await this.getSubscription(storeId);

        if (subscription.plan.type === PlanType.FREE) {
            throw new BadRequestException('No puedes cancelar el plan FREE');
        }

        return this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                cancelAtPeriodEnd: true,
                cancelledAt: new Date(),
            },
            include: { plan: true },
        });
    }

    // ============================================================
    // ADMIN (Super Admin)
    // ============================================================

    async getAllSubscriptions(status?: SubscriptionStatus) {
        return this.prisma.subscription.findMany({
            where: status ? { status } : {},
            include: {
                plan: true,
                store: {
                    select: { id: true, name: true, slug: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async activateSubscription(subscriptionId: string, planType: PlanType) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { id: subscriptionId },
            include: { store: { select: { ownerId: true } } },
        });

        if (!subscription) {
            throw new NotFoundException('Suscripción no encontrada');
        }

        const plan = await this.getPlanByType(planType);

        const updated = await this.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                planId: plan.id,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
                cancelAtPeriodEnd: false,
            },
            include: { plan: true },
        });

        // Notificar al owner
        await this.prisma.notification.create({
            data: {
                userId: subscription.store.ownerId,
                type: NotificationType.SUBSCRIPTION_EXPIRING,
                title: '¡Suscripción activada!',
                message: `Tu plan ${plan.name} ha sido activado correctamente.`,
            },
        });

        return updated;
    }

    async checkLimits(storeId: string, resource: 'products' | 'staff'): Promise<boolean> {
        const { usage } = await this.getUsage(storeId);

        if (resource === 'products') {
            if (usage.products.isUnlimited) return true;
            return usage.products.current < usage.products.max;
        }

        if (resource === 'staff') {
            if (usage.staff.isUnlimited) return true;
            return usage.staff.current < usage.staff.max;
        }

        return true;
    }

    async notifyApproachingLimit(storeId: string) {
        const { usage } = await this.getUsage(storeId);
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            select: { ownerId: true },
        });

        if (!store) return;

        // Verificar si productos están al 80%
        if (!usage.products.isUnlimited && usage.products.percentage >= 80) {
            await this.prisma.notification.create({
                data: {
                    userId: store.ownerId,
                    type: NotificationType.SUBSCRIPTION_EXPIRING,
                    title: 'Acercándote al límite de productos',
                    message: `Has usado ${usage.products.current} de ${usage.products.max} productos (${usage.products.percentage}%). Considera hacer upgrade.`,
                },
            });
        }
    }
}
