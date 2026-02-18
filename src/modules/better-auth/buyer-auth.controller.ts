import {
    Controller,
    Post,
    Body,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BetterAuthService } from './better-auth.service';
import { PrismaService } from '../../database/prisma.service';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

class BuyerSignupDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsOptional()
    @IsString()
    phone?: string;
}

@ApiTags('buyer-auth')
@Controller('auth/buyer')
export class BuyerAuthController {
    private readonly logger = new Logger(BuyerAuthController.name);

    constructor(
        private readonly authService: BetterAuthService,
        private readonly prisma: PrismaService,
    ) {}

    @Post('signup')
    @ApiOperation({ summary: 'Register a new buyer (globalRole forced to BUYER)' })
    async signup(@Body() dto: BuyerSignupDto) {
        try {
            const result = await (this.authService.api.signUpEmail as Function)({
                body: {
                    email: dto.email,
                    password: dto.password,
                    name: `${dto.firstName} ${dto.lastName}`,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    phone: dto.phone || '',
                },
            });

            // Force globalRole to BUYER server-side (input: false prevents client override)
            if (result.user?.id) {
                await this.prisma.user.update({
                    where: { id: result.user.id },
                    data: { globalRole: 'BUYER' },
                });
            }

            return result;
        } catch (error) {
            this.logger.error({
                event: 'BUYER_SIGNUP_ERROR',
                email: dto.email,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new BadRequestException(
                error instanceof Error ? error.message : 'Error al registrar buyer',
            );
        }
    }
}
