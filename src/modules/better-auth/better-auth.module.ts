import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { BetterAuthService } from './better-auth.service';
import { BetterAuthController } from './better-auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
import { GlobalRoleGuard } from '../../core/guards/global-role.guard';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [
        BetterAuthService,
        AuthGuard,
        OptionalAuthGuard,
        GlobalRoleGuard,
    ],
    controllers: [BetterAuthController],
    exports: [
        BetterAuthService,
        AuthGuard,
        OptionalAuthGuard,
        GlobalRoleGuard,
    ],
})
export class BetterAuthModule { }
