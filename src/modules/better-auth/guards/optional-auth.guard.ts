import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { BetterAuthService } from '../better-auth.service';
import { fromNodeHeaders } from 'better-auth/node';

/**
 * OptionalAuthGuard — Non-blocking session guard for guest-friendly endpoints
 *
 * Unlike AuthGuard, this guard NEVER throws an error.
 * - If a valid session cookie is present, it populates `req.user` and `req.session`
 * - If there is no cookie or the session is invalid, `req.user` remains undefined
 * - Always returns `true`, allowing the request to proceed
 *
 * Use this guard for endpoints that support both authenticated and guest access
 * (e.g. storefront checkout, which supports buyer and guest orders).
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
    private readonly logger = new Logger(OptionalAuthGuard.name);

    constructor(private readonly authService: BetterAuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        try {
            const session = await this.authService.api.getSession({
                headers: fromNodeHeaders(request.headers),
            });

            if (session?.user) {
                request.user = session.user;
                request.session = session.session;
            }
        } catch {
            // Silently ignore — guest access is allowed
            this.logger.debug('OptionalAuthGuard: no valid session, proceeding as guest');
        }

        return true;
    }
}
