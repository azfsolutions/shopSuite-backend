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
    user: { email: string; name: string; firstName?: string },
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

    const displayName = user.firstName || user.name || 'allí';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f0f5ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f5ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,52,242,0.08);">

        <!-- HEADER -->
        <tr>
          <td align="center" style="padding:28px 40px;border-bottom:1px solid #e8f0fe;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:linear-gradient(135deg,#001b7a,#0034f2);border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                <span style="color:#ffffff;font-size:22px;font-weight:700;line-height:44px;display:block;">S</span>
              </td>
              <td style="padding-left:12px;vertical-align:middle;">
                <span style="font-size:22px;font-weight:700;color:#0D0C54;letter-spacing:-0.5px;">ShopSuite</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- HERO -->
        <tr>
          <td style="background-color:#F0F5FF;padding:48px 40px;text-align:center;">
            <h1 style="margin:0 0 12px;font-size:28px;font-weight:700;color:#0D0C54;letter-spacing:-0.5px;">
              ¡Bienvenido, ${displayName}! 👋
            </h1>
            <p style="margin:0 0 32px;font-size:16px;color:#40406A;line-height:1.6;">
              Tu cuenta de ShopSuite está casi lista.<br>
              Haz clic en el botón para activarla.
            </p>
            <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#001b7a,#0034f2);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:16px 40px;border-radius:10px;letter-spacing:0.2px;">
              Verificar mi cuenta →
            </a>
            <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">El enlace expira en 24 horas</p>
          </td>
        </tr>

        <!-- STEPS -->
        <tr>
          <td style="padding:40px;background-color:#ffffff;">
            <h2 style="margin:0 0 28px;font-size:18px;font-weight:700;color:#0D0C54;text-align:center;">¿Qué sigue?</h2>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
              <td width="44" valign="top">
                <div style="width:44px;height:44px;background-color:#EFF6FF;border-radius:10px;text-align:center;line-height:44px;font-size:22px;">🏪</div>
              </td>
              <td style="padding-left:16px;vertical-align:middle;">
                <p style="margin:0;font-size:15px;font-weight:600;color:#0D0C54;">Crea tu tienda</p>
                <p style="margin:4px 0 0;font-size:14px;color:#40406A;">Configura tu logo, nombre y URL personalizada</p>
              </td>
            </tr></table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
              <td width="44" valign="top">
                <div style="width:44px;height:44px;background-color:#EFF6FF;border-radius:10px;text-align:center;line-height:44px;font-size:22px;">📦</div>
              </td>
              <td style="padding-left:16px;vertical-align:middle;">
                <p style="margin:0;font-size:15px;font-weight:600;color:#0D0C54;">Agrega tus productos</p>
                <p style="margin:4px 0 0;font-size:14px;color:#40406A;">Sube fotos, precios y variantes de tu catálogo</p>
              </td>
            </tr></table>

            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td width="44" valign="top">
                <div style="width:44px;height:44px;background-color:#EFF6FF;border-radius:10px;text-align:center;line-height:44px;font-size:22px;">🚀</div>
              </td>
              <td style="padding-left:16px;vertical-align:middle;">
                <p style="margin:0;font-size:15px;font-weight:600;color:#0D0C54;">Empieza a vender</p>
                <p style="margin:4px 0 0;font-size:14px;color:#40406A;">Comparte tu tienda y recibe tus primeros pedidos</p>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#0D0C54;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#ffffff;">ShopSuite</p>
            <p style="margin:0 0 16px;font-size:12px;color:#64748b;">azfsolutions.com</p>
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.8;">
              Si no creaste esta cuenta, ignora este email.<br>
              Este mensaje fue enviado a ${user.email}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
        from,
        to: user.email,
        subject: `¡Bienvenido a ShopSuite, ${displayName}! Activa tu cuenta`,
        html,
    });

    if (error) {
        console.error(`[BetterAuth] Resend error for ${user.email}:`, JSON.stringify(error));
    } else {
        console.log(`[BetterAuth] Verification email sent to ${user.email}, id: ${data?.id}`);
    }
}

// ============================================================
// SHARED PARENT DOMAIN DETECTION
// Determines if backend and frontend share a common eTLD+1
// (e.g., api.azfsolutions.com + shopsuite.azfsolutions.com).
// When they do, we set Domain=.azfsolutions.com so cookies
// are visible to both services (including Next.js middleware).
// When they don't (e.g., railway.app + vercel.app), we skip
// the Domain attribute and rely on SameSite=None;Secure for
// cross-origin fetch requests.
// ============================================================
function getSharedParentDomain(): string | undefined {
    const backendUrl = process.env.BETTER_AUTH_URL;
    const frontendUrl = process.env.FRONTEND_URL;

    if (!backendUrl || !frontendUrl) return undefined;

    try {
        const backendHost = new URL(backendUrl).hostname;
        const frontendHost = new URL(frontendUrl).hostname;

        if (backendHost === 'localhost' || frontendHost === 'localhost') return undefined;

        // Same hostname = proxy setup (BETTER_AUTH_URL = FRONTEND_URL).
        // No cross-subdomain cookies needed — SameSite=Lax works.
        if (backendHost === frontendHost) return undefined;

        const backendParts = backendHost.split('.');
        const frontendParts = frontendHost.split('.');

        if (backendParts.length < 2 || frontendParts.length < 2) return undefined;

        // Compare eTLD+1 (simplified: last 2 labels)
        const backendParent = backendParts.slice(-2).join('.');
        const frontendParent = frontendParts.slice(-2).join('.');

        // Exclude PaaS domains — setting Domain=.railway.app would leak
        // cookies to every tenant on the platform.
        const paasDomains = [
            'railway.app', 'vercel.app', 'herokuapp.com',
            'netlify.app', 'onrender.com', 'fly.dev',
        ];

        if (backendParent === frontendParent && !paasDomains.includes(backendParent)) {
            return `.${backendParent}`;
        }

        return undefined;
    } catch {
        return undefined;
    }
}

// ============================================================
// CREATE AUTH INSTANCE
// Called once by BetterAuthService (lazy singleton).
// Redis is optional — auth is fully functional without it.
// ============================================================
export function createAuthInstance(prismaClient: PrismaClient, redis?: Redis) {
    const isProduction = process.env.NODE_ENV === 'production';
    const secondaryStorage = redis ? buildSecondaryStorage(redis) : undefined;
    const sharedDomain = isProduction ? getSharedParentDomain() : undefined;

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

        // ── SOCIAL PROVIDERS ──────────────────────────────────
        socialProviders: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            },
        },

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
            // After clicking the link, redirect to frontend login page (not backend /)
            callbackURL: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/login?verified=true`,
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
        // Cookie strategy adapts automatically:
        //
        // PROXY (BETTER_AUTH_URL = FRONTEND_URL, same hostname):
        //   → No crossSubdomainCookies, defaults to SameSite=Lax
        //   → Cookies scoped to frontend hostname (via proxy)
        //   → Same-origin: no CORS needed, middleware reads cookies directly
        //
        // CROSS-SUBDOMAIN (e.g., api.azf.com + app.azf.com):
        //   → Domain=.azfsolutions.com, SameSite=None, Secure
        //   → Cookies visible to both backend AND frontend
        advanced: {
            useSecureCookies: isProduction,
            cookiePrefix: 'shopsuite',
            crossSubdomainCookies: isProduction && sharedDomain
                ? { enabled: true, domain: sharedDomain }
                : undefined,
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
