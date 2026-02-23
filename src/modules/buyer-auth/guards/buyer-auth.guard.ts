import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { BuyerAuthService } from '../buyer-auth.service';

@Injectable()
export class BuyerAuthGuard implements CanActivate {
    constructor(private readonly buyerAuthService: BuyerAuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);

        if (!token) {
            throw new UnauthorizedException('Token requerido');
        }

        const buyerUser = await this.buyerAuthService.validateToken(token);
        if (!buyerUser) {
            throw new UnauthorizedException('Token inválido o expirado');
        }

        request.buyerUser = buyerUser;
        return true;
    }

    private extractToken(request: any): string | null {
        const auth = request.headers?.authorization;
        if (auth?.startsWith('Bearer ')) {
            return auth.slice(7);
        }
        return request.cookies?.buyer_token ?? null;
    }
}
