import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../core/decorators/public.decorator';
import { BetterAuthService } from '../better-auth.service';
import { PrismaService } from '../../../database/prisma.service';
import { fromNodeHeaders } from 'better-auth/node';

/**
 * AuthGuard — Session-based authentication guard (Better Auth)
 *
 * Validates the session cookie via Better Auth's `api.getSession()`
 * and attaches the user + store context to the request.
 *
 * Supports:
 * - @Public() decorator to skip authentication
 * - X-Store-Id header for multi-store context
 */
@Injectable()
export class AuthGuard implements CanActivate {
    private readonly logger = new Logger(AuthGuard.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly authService: BetterAuthService,
        private readonly prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) return true;

        const request = context.switchToHttp().getRequest();

        try {
            const session = await this.authService.api.getSession({
                headers: fromNodeHeaders(request.headers),
            });

            if (!session?.user) {
                throw new UnauthorizedException('Sesión inválida o expirada');
            }

            request.user = session.user;
            request.session = session.session;

            // Handle Store Context if X-Store-Id is present
            const storeId = request.headers['x-store-id'];
            if (storeId) {
                const store = await this.prisma.store.findUnique({
                    where: { id: String(storeId) },
                });

                if (store) {
                    const membership = await this.prisma.storeMember.findUnique({
                        where: {
                            userId_storeId: {
                                storeId: store.id,
                                userId: session.user.id,
                            },
                        },
                    });

                    if (membership) {
                        request.store = store;
                        request.storeMember = membership;
                    }
                }
            }

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) throw error;

            this.logger.warn({
                event: 'SESSION_VALIDATION_FAILED',
                path: request.path,
                ip: request.ip,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            throw new UnauthorizedException('Sesión inválida o expirada');
        }
    }
}
