import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export const LIMIT_TYPE_KEY = 'limitType';
export const CheckLimit = (type: 'products' | 'staff') =>
    Reflect.metadata(LIMIT_TYPE_KEY, type);

@Injectable()
export class LimitsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private subscriptionsService: SubscriptionsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const limitType = this.reflector.getAllAndOverride<'products' | 'staff'>(
            LIMIT_TYPE_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!limitType) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const storeId = request.store?.id;

        if (!storeId) {
            return true;
        }

        const canCreate = await this.subscriptionsService.checkLimits(storeId, limitType);

        if (!canCreate) {
            const resourceName = limitType === 'products' ? 'productos' : 'miembros del equipo';
            throw new ForbiddenException(
                `Has alcanzado el límite de ${resourceName} de tu plan. Haz upgrade para continuar.`,
            );
        }

        // Verificar si está cerca del límite y notificar
        await this.subscriptionsService.notifyApproachingLimit(storeId);

        return true;
    }
}
