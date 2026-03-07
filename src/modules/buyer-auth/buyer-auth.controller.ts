import {
    Controller,
    Post,
    Get,
    Body,
    HttpCode,
    HttpStatus,
    Req,
    Res,
    Headers,
    Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { BuyerAuthService } from './buyer-auth.service';
import { BuyerSignUpDto } from './dto/sign-up.dto';
import { BuyerSignInDto } from './dto/sign-in.dto';

const COOKIE_NAME = 'buyer_token';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function setBuyerCookie(res: Response, token: string): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        // SameSite=None required for cross-domain deployments (Railway + Vercel).
        // SameSite=Lax works only when frontend and backend share the same eTLD+1.
        sameSite: isProd ? 'none' : 'lax',
        maxAge: COOKIE_MAX_AGE_MS,
        path: '/',
    });
}

function clearBuyerCookie(res: Response): void {
    res.clearCookie(COOKIE_NAME, { path: '/' });
}

@ApiTags('buyer-auth')
@Controller('buyer-auth')
export class BuyerAuthController {
    constructor(private readonly buyerAuthService: BuyerAuthService) {}

    @Post('sign-up')
    @ApiOperation({ summary: 'Registro de comprador' })
    async signUp(
        @Body() dto: BuyerSignUpDto,
        @Res({ passthrough: true }) res: Response,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
    ) {
        const result = await this.buyerAuthService.signUp(dto, ip, userAgent);
        setBuyerCookie(res, result.token);
        return { buyerUser: result.buyerUser };
    }

    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login de comprador' })
    async signIn(
        @Body() dto: BuyerSignInDto,
        @Res({ passthrough: true }) res: Response,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string,
    ) {
        const result = await this.buyerAuthService.signIn(dto, ip, userAgent);
        setBuyerCookie(res, result.token);
        return { buyerUser: result.buyerUser };
    }

    @Post('sign-out')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cerrar sesión de comprador' })
    async signOut(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const token = req.cookies?.[COOKIE_NAME];
        if (token) {
            await this.buyerAuthService.signOut(token);
        }
        clearBuyerCookie(res);
        return { message: 'Sesión cerrada exitosamente' };
    }

    @Get('session')
    @ApiOperation({ summary: 'Obtener sesión activa del comprador' })
    async getSession(@Req() req: Request) {
        const token = req.cookies?.[COOKIE_NAME];
        if (!token) return null;
        return this.buyerAuthService.getSession(token);
    }
}
