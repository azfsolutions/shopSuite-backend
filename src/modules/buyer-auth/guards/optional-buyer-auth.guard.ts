import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { BuyerAuthService } from '../buyer-auth.service';

@Injectable()
export class OptionalBuyerAuthGuard implements CanActivate {
    constructor(private readonly buyerAuthService: BuyerAuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractToken(request);

        if (token) {
            const buyerUser = await this.buyerAuthService.validateToken(token);
            if (buyerUser) {
                request.buyerUser = buyerUser;
            }
        }

        return true; // Siempre permite, buyerUser puede ser undefined
    }

    private extractToken(request: any): string | null {
        const auth = request.headers?.authorization;
        if (auth?.startsWith('Bearer ')) {
            return auth.slice(7);
        }
        return request.cookies?.buyer_token ?? null;
    }
}
