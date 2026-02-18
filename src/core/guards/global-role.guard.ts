import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GLOBAL_ROLE_KEY } from '../decorators/global-role.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * GlobalRoleGuard — Validates user.globalRole against @RequireGlobalRole()
 *
 * Must be used AFTER AuthGuard so that request.user is populated.
 * If no @RequireGlobalRole() decorator is present, access is allowed.
 */
@Injectable()
export class GlobalRoleGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) return true;

        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            GLOBAL_ROLE_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.globalRole) {
            throw new ForbiddenException('Acceso denegado: rol no válido');
        }

        if (!requiredRoles.includes(user.globalRole)) {
            throw new ForbiddenException('Acceso denegado: permisos insuficientes');
        }

        return true;
    }
}
