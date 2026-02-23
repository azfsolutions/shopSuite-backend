import {
    Controller,
    Post,
    Get,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BuyerAuthService } from './buyer-auth.service';
import { BuyerSignUpDto } from './dto/sign-up.dto';
import { BuyerSignInDto } from './dto/sign-in.dto';

@ApiTags('buyer-auth')
@Controller('buyer-auth')
export class BuyerAuthController {
    constructor(private readonly buyerAuthService: BuyerAuthService) {}

    @Post('sign-up')
    @ApiOperation({ summary: 'Registro de comprador' })
    async signUp(@Body() dto: BuyerSignUpDto) {
        return this.buyerAuthService.signUp(dto);
    }

    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login de comprador' })
    async signIn(@Body() dto: BuyerSignInDto) {
        return this.buyerAuthService.signIn(dto);
    }

    @Post('sign-out')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cerrar sesión de comprador' })
    async signOut(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        if (!token) throw new UnauthorizedException('Token requerido');
        return this.buyerAuthService.signOut(token);
    }

    @Get('session')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Obtener sesión activa del comprador' })
    async getSession(@Headers('authorization') auth: string) {
        const token = auth?.replace('Bearer ', '');
        if (!token) return null;
        return this.buyerAuthService.getSession(token);
    }
}
