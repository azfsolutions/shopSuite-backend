import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '@prisma/client';

/**
 * Crea la instancia de Better Auth usando un PrismaClient existente
 * @param prismaClient - Instancia singleton de Prisma (inyectada)
 */
export function createAuthInstance(prismaClient: PrismaClient) {
    return betterAuth({
        appName: 'ShopSuite',
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
        basePath: '/api/auth',

        database: prismaAdapter(prismaClient, {
            provider: 'postgresql',
        }),

        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
            minPasswordLength: 8,
        },

        session: {
            expiresIn: 60 * 60 * 24 * 7,
            updateAge: 60 * 60 * 24,
            cookieCache: {
                enabled: true,
                maxAge: 5 * 60,
            },
        },

        user: {
            additionalFields: {
                firstName: { type: 'string', required: true, input: true },
                lastName: { type: 'string', required: true, input: true },
                phone: { type: 'string', required: false, input: true },
                avatar: { type: 'string', required: false },
                globalRole: { type: 'string', required: false, defaultValue: 'USER', input: true },
            },
        },

        advanced: {
            useSecureCookies: process.env.NODE_ENV === 'production',
            cookiePrefix: 'shopsuite',
        },

        rateLimit: {
            enabled: true,
            window: 60,
            max: 100,
        },

        trustedOrigins: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
        ],
    });
}

export type Auth = ReturnType<typeof createAuthInstance>;
