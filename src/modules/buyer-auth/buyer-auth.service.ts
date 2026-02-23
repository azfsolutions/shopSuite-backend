import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BuyerSignUpDto } from './dto/sign-up.dto';
import { BuyerSignInDto } from './dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class BuyerAuthService {
    private readonly logger = new Logger(BuyerAuthService.name);

    constructor(private readonly prisma: PrismaService) {}

    async signUp(dto: BuyerSignUpDto) {
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

        const token = await this.createSession(buyerUser.id);

        return { buyerUser, token };
    }

    async signIn(dto: BuyerSignInDto) {
        const emailLower = dto.email.toLowerCase();

        const buyerUser = await this.prisma.buyerUser.findUnique({
            where: { email: emailLower },
        });

        if (!buyerUser || !buyerUser.password) {
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

        const token = await this.createSession(buyerUser.id);

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
        await this.prisma.buyerSession.deleteMany({ where: { token } });
        return { message: 'Sesión cerrada exitosamente' };
    }

    async getSession(token: string) {
        const session = await this.prisma.buyerSession.findUnique({
            where: { token },
            include: {
                buyerUser: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        emailVerified: true,
                        deletedAt: true,
                    },
                },
            },
        });

        if (!session || session.expiresAt < new Date() || session.buyerUser.deletedAt) {
            return null;
        }

        return session.buyerUser;
    }

    async validateToken(token: string) {
        return this.getSession(token);
    }

    private async createSession(buyerUserId: string): Promise<string> {
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

        // Limpiar sesiones expiradas del mismo usuario (lazy cleanup)
        await this.prisma.buyerSession.deleteMany({
            where: { buyerUserId, expiresAt: { lt: new Date() } },
        });

        await this.prisma.buyerSession.create({
            data: { buyerUserId, token, expiresAt },
        });

        return token;
    }
}
