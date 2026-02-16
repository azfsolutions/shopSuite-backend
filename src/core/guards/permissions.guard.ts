import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { Permission, hasPermission } from '../../config/permissions.config';

/**
 * Guard que verifica si el usuario tiene el permiso requerido
 * basándose en su rol dentro de la tienda actual
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 1. Obtener el permiso requerido del decorador
        const requiredPermission = this.reflector.getAllAndOverride<Permission>(
            PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Si no hay permiso requerido, permitir acceso
        if (!requiredPermission) {
            return true;
        }

        // 2. Obtener el storeMember del request (inyectado por AuthGuard de Better Auth)
        const request = context.switchToHttp().getRequest();
        const storeMember = request.storeMember;

        if (!storeMember) {
            throw new ForbiddenException('No tienes acceso a esta tienda');
        }

        // 3. Verificar si el rol tiene el permiso
        const hasPerm = hasPermission(storeMember.role, requiredPermission);

        if (!hasPerm) {
            throw new ForbiddenException(
                `No tienes el permiso necesario: ${requiredPermission}`,
            );
        }

        return true;
    }
}
