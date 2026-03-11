import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { Public } from '../decorators';

// ============================================================
// ROOT REDIRECT CONTROLLER
// Better Auth redirects to baseURL paths (/, /login) on auth
// events (token expired, post-verification). We forward these
// to the correct frontend URLs so the user sees proper UI.
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

        return { url: '/health', statusCode: 302 };
    }

    @Public()
    @Get('login')
    @Redirect()
    handleLogin(@Query() query: Record<string, string>) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
        const params = new URLSearchParams(query).toString();
        return {
            url: `${frontendUrl}/login${params ? '?' + params : ''}`,
            statusCode: 302,
        };
    }
}
