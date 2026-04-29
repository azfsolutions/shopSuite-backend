import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BuyerSignUpDto } from './dto/sign-up.dto';
import { BuyerSignInDto } from './dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const SESSION_TTL_SEC = 5 * 60;                    // Redis cache TTL: 5 min
const SESSION_DB_DAYS = 7;                          // DB session lifespan: 7 days (B-S-3)
const SESSION_SLIDE_THRESHOLD_MS = 24 * 60 * 60 * 1000;  // Extend if < 1 day left
const SESSION_KEY = (token: string) => `buyer_session:${token}`;

// Account lockout (SEC-AUTH-002) — defense in depth on top of @Throttle.
// Throttler limits per-IP, this limits per-email so distributed brute force
// (multiple IPs targeting one account) is also blocked.
const LOCKOUT_MAX_FAILS = 10;                       // Block after 10 failed attempts
const LOCKOUT_WINDOW_SEC = 15 * 60;                 // Within a 15-min sliding window
const LOCKOUT_KEY = (email: string) => `buyer:signin:fail:${email}`;

const USER_SELECT = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    emailVerified: true,
    deletedAt: true,
} as const;

@Injectable()
export class BuyerAuthService {
    private readonly logger = new Logger(BuyerAuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}

    async signUp(dto: BuyerSignUpDto, ip?: string, userAgent?: string) {
        const emailLower = dto.email.toLowerCase();

        const existing = await this.prisma.buyerUser.findUnique({
            where: { email: emailLower },
        });
        if (existing) {
            throw new ConflictException('Este email ya está registrado');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);

        const buyerUser = await this.prisma.buyerUser.create({
            data: {
                email: emailLower,
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                emailVerified: true,
                createdAt: true,
            },
        });

        const token = await this.createSession(buyerUser.id, ip, userAgent);
        return { buyerUser, token };
    }

    async signIn(dto: BuyerSignInDto, ip?: string, userAgent?: string) {
        const emailLower = dto.email.toLowerCase();

        // Account lockout check (SEC-AUTH-002). Soft-fail if Redis is down so
        // we never lock out users due to infra issues.
        const lockoutKey = LOCKOUT_KEY(emailLower);
        try {
            const failsRaw = await this.redis.get(lockoutKey);
            const fails = failsRaw ? parseInt(failsRaw, 10) : 0;
            if (fails >= LOCKOUT_MAX_FAILS) {
                throw new ForbiddenException(
                    'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
                );
            }
        } catch (err) {
            if (err instanceof ForbiddenException) throw err;
            // Redis unavailable — fall through, throttler still protects per-IP
        }

        const buyerUser = await this.prisma.buyerUser.findUnique({
            where: { email: emailLower },
        });

        if (!buyerUser?.password) {
            await this.recordSignInFailure(lockoutKey);
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        const passwordValid = await bcrypt.compare(dto.password, buyerUser.password);
        if (!passwordValid) {
            await this.recordSignInFailure(lockoutKey);
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        if (buyerUser.deletedAt) {
            throw new UnauthorizedException('Cuenta desactivada');
        }

        // Successful sign-in — clear the failure counter
        this.redis.del(lockoutKey).catch(() => {});

        await this.prisma.buyerUser.update({
            where: { id: buyerUser.id },
            data: { lastLoginAt: new Date() },
        });

        const token = await this.createSession(buyerUser.id, ip, userAgent);

        return {
            buyerUser: {
                id: buyerUser.id,
                email: buyerUser.email,
                firstName: buyerUser.firstName,
                lastName: buyerUser.lastName,
                phone: buyerUser.phone,
                emailVerified: buyerUser.emailVerified,
            },
            token,
        };
    }

    async signOut(token: string) {
        // 1. Evict from Redis immediately
        try {
            await this.redis.del(SESSION_KEY(token));
        } catch {
            // ignore — DB delete will handle persistence
        }

        // 2. Remove from DB
        await this.prisma.buyerSession.deleteMany({ where: { token } });

        return { message: 'Sesión cerrada exitosamente' };
    }

    async validateToken(token: string) {
        // 1. Redis cache — slide TTL on every valid request
        try {
            const cached = await this.redis.get(SESSION_KEY(token));
            if (cached) {
                const user = JSON.parse(cached);
                this.redis.set(SESSION_KEY(token), cached, SESSION_TTL_SEC).catch(() => {});
                return user;
            }
        } catch {
            this.logger.warn('Redis unavailable — falling back to DB for buyer session');
        }

        // 2. DB fallback
        const session = await this.prisma.buyerSession.findUnique({
            where: { token },
            include: { buyerUser: { select: USER_SELECT } },
        });

        if (!session || session.expiresAt < new Date() || session.buyerUser.deletedAt) {
            return null;
        }

        // 3. Sliding refresh: if session expires in < 1 day, extend it (B-S-3).
        // Active users keep their session alive without forcing re-login,
        // while inactive sessions still expire after 7 days.
        const msLeft = session.expiresAt.getTime() - Date.now();
        if (msLeft < SESSION_SLIDE_THRESHOLD_MS) {
            const newExpiresAt = new Date(Date.now() + SESSION_DB_DAYS * 24 * 60 * 60 * 1000);
            this.prisma.buyerSession
                .update({ where: { token }, data: { expiresAt: newExpiresAt } })
                .catch(() => {});
        }

        // 4. Repopulate cache (omit deletedAt from cached payload)
        const { deletedAt: _deleted, ...safeUser } = session.buyerUser;
        try {
            await this.redis.set(SESSION_KEY(token), JSON.stringify(safeUser), SESSION_TTL_SEC);
        } catch {
            // ignore cache write failure
        }

        return safeUser;
    }

    async getSession(token: string) {
        return this.validateToken(token);
    }

    // ── PRIVATE ───────────────────────────────────────────────────────────────

    /**
     * Increment failure counter for an email and set TTL on first failure.
     * Soft-fails if Redis is unavailable so sign-in still works.
     */
    private async recordSignInFailure(lockoutKey: string): Promise<void> {
        try {
            const fails = await this.redis.incr(lockoutKey);
            if (fails === 1) {
                await this.redis.expire(lockoutKey, LOCKOUT_WINDOW_SEC);
            }
        } catch {
            // Redis unavailable — throttler still protects per-IP
        }
    }

    private async createSession(
        buyerUserId: string,
        ip?: string,
        userAgent?: string,
    ): Promise<string> {
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + SESSION_DB_DAYS * 24 * 60 * 60 * 1000);

        // Lazy cleanup of this user's expired sessions (non-blocking)
        this.prisma.buyerSession
            .deleteMany({ where: { buyerUserId, expiresAt: { lt: new Date() } } })
            .catch(() => {});

        await this.prisma.buyerSession.create({
            data: {
                buyerUserId,
                token,
                expiresAt,
                ipAddress: ip ?? null,
                userAgent: userAgent ?? null,
            },
        });

        return token;
    }
}
