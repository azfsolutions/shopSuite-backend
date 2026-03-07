import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';

const TRUSTED_ORIGINS_CACHE_KEY = 'ba:trusted_origins';
const TRUSTED_ORIGINS_TTL_SEC = 5 * 60; // 5 minutes

// ============================================================
// REDIS SECONDARY STORAGE ADAPTER
// Better Auth uses this for sessions and rate limiting.
// Falls back gracefully — errors are swallowed so Redis failure
// never breaks auth. PostgreSQL remains the source of truth.
// ============================================================
function buildSecondaryStorage(redis: Redis) {
    return {
        get: async (key: string): Promise<string | null> => {
            try {
                return await redis.get(key);
            } catch {
                return null;
            }
        },
        set: async (key: string, value: string, ttl?: number): Promise<void> => {
            try {
                if (ttl) {
                    await redis.set(key, value, 'EX', ttl);
                } else {
                    await redis.set(key, value);
                }
            } catch {
                // Swallow — DB is still the source of truth
            }
        },
        delete: async (key: string): Promise<void> => {
            try {
                await redis.del(key);
            } catch {
                // Swallow
            }
        },
    };
}

// ============================================================
// TRUSTED ORIGINS — cached in Redis (5 min TTL)
// Avoids a DB query on every Better Auth CSRF check.
// ============================================================
async function resolveTrustedOrigins(
    prismaClient: PrismaClient,
    redis?: Redis,
): Promise<string[]> {
    const staticOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3002',
        process.env.BETTER_AUTH_URL || 'http://localhost:3001',
        'http://localhost:3001',
        'http://localhost:3002',
    ].filter(Boolean) as string[];

    if (redis) {
        try {
            const cached = await redis.get(TRUSTED_ORIGINS_CACHE_KEY);
            if (cached) return JSON.parse(cached);
        } catch {
            // Fallthrough to DB
        }
    }

    try {
        const stores = await prismaClient.store.findMany({
            where: { customDomain: { not: null } },
            select: { customDomain: true },
        });

        const customOrigins = stores
            .filter((s) => s.customDomain)
            .flatMap((s) => [
                `https://${s.customDomain}`,
                `http://${s.customDomain}`,
            ]);

        const allOrigins = [...new Set([...staticOrigins, ...customOrigins])];

        if (redis) {
            try {
                await redis.set(
                    TRUSTED_ORIGINS_CACHE_KEY,
                    JSON.stringify(allOrigins),
                    'EX',
                    TRUSTED_ORIGINS_TTL_SEC,
                );
            } catch {
                // ignore cache failure
            }
        }

        return allOrigins;
    } catch {
        return staticOrigins;
    }
}

// ============================================================
// EMAIL SENDER — Resend
// If RESEND_API_KEY is not set, logs the URL (dev-friendly).
// ============================================================
async function sendVerificationEmail(
    user: { email: string; name: string },
    url: string,
): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'noreply@shopsuite.com';

    if (!apiKey) {
        console.warn(
            `[BetterAuth] No RESEND_API_KEY — verification URL for ${user.email}: ${url}`,
        );
        return;
    }

    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    await resend.emails.send({
        from,
        to: user.email,
        subject: 'Verifica tu cuenta en ShopSuite',
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                <h2 style="color:#1e1b4b">Bienvenido a ShopSuite</h2>
                <p style="color:#374151">Haz clic en el botón para activar tu cuenta:</p>
                <a href="${url}"
                   style="display:inline-block;background:#6366f1;color:white;padding:12px 28px;
                          border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
                    Verificar cuenta
                </a>
                <p style="color:#9ca3af;font-size:14px;margin-top:24px">
                    El enlace expira en 24 horas.<br>
                    Si no creaste esta cuenta, ignora este email.
                </p>
            </div>
        `,
    });
}

// ============================================================
// CREATE AUTH INSTANCE
// Called once by BetterAuthService (lazy singleton).
// Redis is optional — auth is fully functional without it.
// ============================================================
export function createAuthInstance(prismaClient: PrismaClient, redis?: Redis) {
    const isProduction = process.env.NODE_ENV === 'production';
    const secondaryStorage = redis ? buildSecondaryStorage(redis) : undefined;

    return betterAuth({
        appName: 'ShopSuite',
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
        basePath: '/api/auth',

        // ── DATABASE ──────────────────────────────────────────
        database: prismaAdapter(prismaClient, {
            provider: 'postgresql',
        }),

        // ── REDIS SECONDARY STORAGE ───────────────────────────
        // Sessions + rate limit counters live in Redis.
        // storeSessionInDatabase: true keeps PG as backup.
        ...(secondaryStorage && { secondaryStorage }),

        // ── EMAIL & PASSWORD ──────────────────────────────────
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
            minPasswordLength: 8,
        },

        emailVerification: {
            sendVerificationEmail: async ({ user, url }) => {
                await sendVerificationEmail(user, url);
            },
            sendOnSignUp: true,
        },

        // ── SESSION ───────────────────────────────────────────
        session: {
            expiresIn: 60 * 60 * 24 * 7,  // 7 days
            updateAge: 60 * 60 * 24,        // slide TTL once per day
            ...(secondaryStorage && { storeSessionInDatabase: true }),
            cookieCache: {
                enabled: true,
                maxAge: 5 * 60,             // 5 min client-side cache
            },
        },

        // ── USER SCHEMA ───────────────────────────────────────
        user: {
            additionalFields: {
                firstName:  { type: 'string', required: true,  input: true  },
                lastName:   { type: 'string', required: true,  input: true  },
                phone:      { type: 'string', required: false, input: true  },
                avatar:     { type: 'string', required: false               },
                globalRole: {
                    type: 'string',
                    required: false,
                    defaultValue: 'USER',
                    input: false,
                },
            },
        },

        // ── SECURITY ──────────────────────────────────────────
        advanced: {
            useSecureCookies: isProduction,
            cookiePrefix: 'shopsuite',
            // Cross-domain support: when frontend (Vercel) and backend (Railway) are on
            // different eTLD+1 domains, cookies need SameSite=None;Secure to be sent.
            // Once you add a custom domain with subdomains (api.domain.com + app.domain.com),
            // replace this with: crossSubdomainCookies: { enabled: true, domain: '.domain.com' }
            crossSubdomainCookies: isProduction ? { enabled: true } : undefined,
        },

        // ── RATE LIMITING ─────────────────────────────────────
        // secondary-storage = Redis (works across multiple instances).
        // Falls back to in-memory in dev when Redis is absent.
        rateLimit: {
            enabled: true,
            window: 60,
            max: 100,
            storage: secondaryStorage ? 'secondary-storage' : 'memory',
        },

        // ── TRUSTED ORIGINS ───────────────────────────────────
        // Redis-cached for 5 min to avoid DB hit on every request.
        trustedOrigins: () => resolveTrustedOrigins(prismaClient, redis),
    });
}

export type Auth = ReturnType<typeof createAuthInstance>;
