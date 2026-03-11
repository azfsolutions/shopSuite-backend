import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { Public } from '../decorators';

// ============================================================
// ROOT REDIRECT CONTROLLER
// Handles GET / — Better Auth redirects here on auth errors
// (e.g., TOKEN_EXPIRED). We forward to the frontend error page
// so the user sees a proper UI instead of a raw JSON 404.
// ============================================================
@Controller()
export class AppController {
    @Public()
    @Get()
    @Redirect()
    handleRoot(@Query('error') error: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';

        if (error) {
            return {
                url: `${frontendUrl}/verify-email/error?error=${encodeURIComponent(error)}`,
                statusCode: 302,
            };
        }

        // Default: redirect to health check for API consumers
        return { url: '/health', statusCode: 302 };
    }
}
