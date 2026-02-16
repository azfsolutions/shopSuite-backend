import { All, Controller, Req, Res, Logger, OnModuleInit } from '@nestjs/common';
import { Request, Response } from 'express';
import { BetterAuthService } from './better-auth.service';
import { toNodeHandler } from 'better-auth/node';

/**
 * Better Auth Controller
 *
 * Handles all authentication requests using Better Auth.
 * Acts as a bridge between NestJS and Better Auth's Node.js handler.
 *
 * Endpoints handled:
 * - POST /api/auth/sign-up/email
 * - POST /api/auth/sign-in/email
 * - POST /api/auth/sign-out
 * - GET  /api/auth/session
 * - POST /api/auth/forgot-password
 * - POST /api/auth/reset-password
 * - GET  /api/auth/callback/:provider
 */
@Controller('auth')
export class BetterAuthController implements OnModuleInit {
    private readonly logger = new Logger(BetterAuthController.name);
    private handler: ReturnType<typeof toNodeHandler>;

    constructor(private readonly authService: BetterAuthService) { }

    onModuleInit() {
        this.handler = toNodeHandler(this.authService.auth);
    }

    @All('*')
    async handleAuth(@Req() req: Request, @Res() res: Response) {
        // Temporary debug endpoint to reset password


        try {
            this.logger.debug({
                event: 'AUTH_REQUEST',
                method: req.method,
                path: req.path,
                ip: req.ip,
            });

            return this.handler(req, res);
        } catch (error) {
            this.logger.error({
                event: 'AUTH_ERROR',
                method: req.method,
                path: req.path,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
}
