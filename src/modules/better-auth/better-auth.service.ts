import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { createAuthInstance, type Auth } from '../../lib/auth';

/**
 * Better Auth Service — Wrapper para la instancia de Better Auth
 *
 * Administra la instancia de Better Auth usando el PrismaClient singleton.
 * Uses lazy initialization to avoid startup issues.
 */
@Injectable()
export class BetterAuthService {
    private readonly logger = new Logger(BetterAuthService.name);
    private _authInstance: Auth | null = null;

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtiene la instancia de Better Auth (lazy initialized)
     */
    get auth(): Auth {
        if (!this._authInstance) {
            this._authInstance = createAuthInstance(this.prisma);
            this.logger.log('Better Auth initialized with singleton PrismaClient');
        }
        return this._authInstance;
    }

    /**
     * API de Better Auth (para usar en guards/controllers)
     */
    get api() {
        return this.auth.api;
    }
}
