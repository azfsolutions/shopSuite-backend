import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { BuyerAuthService } from '../buyer-auth.service';

const COOKIE_NAME = 'buyer_token';

@Injectable()
export class BuyerAuthGuard implements CanActivate {
    constructor(private readonly buyerAuthService: BuyerAuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);

        if (!token) {
            throw new UnauthorizedException('Sesión requerida');
        }

        const buyerUser = await this.buyerAuthService.validateToken(token);
        if (!buyerUser) {
            throw new UnauthorizedException('Sesión inválida o expirada');
        }

        request.buyerUser = buyerUser;
        return true;
    }

    // Cookie-first, Bearer token as fallback (for API clients / mobile)
    private extractToken(request: any): string | null {
        return (
            request.cookies?.[COOKIE_NAME] ??
            request.headers?.authorization?.replace('Bearer ', '') ??
            null
        );
    }
}
