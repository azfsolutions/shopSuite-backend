import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BuyerSignUpDto } from './dto/sign-up.dto';
import { BuyerSignInDto } from './dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const SESSION_TTL_SEC = 5 * 60;                    // Redis cache TTL: 5 min
const SESSION_DB_DAYS = 30;                         // DB session lifespan: 30 days
const SESSION_KEY = (token: string) => `buyer_session:${token}`;

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

        const buyerUser = await this.prisma.buyerUser.findUnique({
            where: { email: emailLower },
        });

        if (!buyerUser?.password) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        const passwordValid = await bcrypt.compare(dto.password, buyerUser.password);
        if (!passwordValid) {
            throw new UnauthorizedException('Credenciales incorrectas');
        }

        if (buyerUser.deletedAt) {
            throw new UnauthorizedException('Cuenta desactivada');
        }

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

        // 3. Repopulate cache (omit deletedAt from cached payload)
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
