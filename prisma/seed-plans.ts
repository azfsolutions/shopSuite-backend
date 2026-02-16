import { PrismaClient, PlanType, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS_DATA = [
    {
        name: 'Gratis',
        type: PlanType.FREE,
        description: 'Perfecto para empezar',
        monthlyPrice: 0,
        yearlyPrice: 0,
        maxProducts: 25,
        maxStaff: 1,
        maxStorageGB: 1,
        transactionFeePercent: 5,
        features: [
            'Hasta 25 productos',
            'Dashboard básico',
            'Soporte por email',
        ],
    },
    {
        name: 'Starter',
        type: PlanType.STARTER,
        description: 'Para tiendas en crecimiento',
        monthlyPrice: 19,
        yearlyPrice: 190,
        maxProducts: 100,
        maxStaff: 3,
        maxStorageGB: 2,
        transactionFeePercent: 3,
        features: [
            'Hasta 100 productos',
            'Analytics avanzados',
            '3 miembros del equipo',
            'Soporte prioritario',
        ],
    },
    {
        name: 'Professional',
        type: PlanType.PROFESSIONAL,
        description: 'Para negocios establecidos',
        monthlyPrice: 49,
        yearlyPrice: 490,
        maxProducts: 500,
        maxStaff: 10,
        maxStorageGB: 10,
        transactionFeePercent: 2,
        features: [
            'Hasta 500 productos',
            'API Access',
            '10 miembros del equipo',
            'Dominio personalizado',
            'Soporte 24/7',
        ],
    },
    {
        name: 'Enterprise',
        type: PlanType.ENTERPRISE,
        description: 'Para grandes operaciones',
        monthlyPrice: 149,
        yearlyPrice: 1490,
        maxProducts: -1, // Ilimitado
        maxStaff: -1, // Ilimitado
        maxStorageGB: 100,
        transactionFeePercent: 1,
        features: [
            'Productos ilimitados',
            'Staff ilimitado',
            'API Premium',
            'Account Manager dedicado',
            'SLA garantizado',
        ],
    },
];

async function seedPlans() {
    console.log('🌱 Seeding plans...');

    for (const planData of PLANS_DATA) {
        const existing = await prisma.plan.findUnique({
            where: { type: planData.type },
        });

        if (existing) {
            console.log(`  ⏭️  Plan ${planData.name} ya existe`);
            continue;
        }

        await prisma.plan.create({
            data: {
                ...planData,
                transactionFeePercent: planData.transactionFeePercent,
            },
        });

        console.log(`  ✅ Plan ${planData.name} creado`);
    }

    console.log('✅ Plans seeded successfully!');
}

async function assignFreePlanToStoresWithoutSubscription() {
    console.log('🔄 Asignando plan FREE a tiendas sin suscripción...');

    const freePlan = await prisma.plan.findUnique({
        where: { type: PlanType.FREE },
    });

    if (!freePlan) {
        console.log('  ❌ Plan FREE no encontrado');
        return;
    }

    const storesWithoutSubscription = await prisma.store.findMany({
        where: {
            subscription: null,
        },
        select: { id: true, name: true },
    });

    for (const store of storesWithoutSubscription) {
        await prisma.subscription.create({
            data: {
                storeId: store.id,
                planId: freePlan.id,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
        });

        console.log(`  ✅ ${store.name} → Plan FREE asignado`);
    }

    console.log(`✅ ${storesWithoutSubscription.length} tiendas actualizadas`);
}

async function main() {
    try {
        await seedPlans();
        await assignFreePlanToStoresWithoutSubscription();
    } catch (error) {
        console.error('Error seeding:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
