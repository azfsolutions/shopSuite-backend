import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { BetterAuthService } from './better-auth.service';
import { BetterAuthController } from './better-auth.controller';
import { BuyerAuthController } from './buyer-auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { GlobalRoleGuard } from '../../core/guards/global-role.guard';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [
        BetterAuthService,
        AuthGuard,
        GlobalRoleGuard,
    ],
    controllers: [BetterAuthController, BuyerAuthController],
    exports: [
        BetterAuthService,
        AuthGuard,
        GlobalRoleGuard,
    ],
})
export class BetterAuthModule { }
