import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { BetterAuthService } from './better-auth.service';
import { BetterAuthController } from './better-auth.controller';
import { AuthGuard } from './guards/auth.guard';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [
        BetterAuthService,
        AuthGuard,
    ],
    controllers: [BetterAuthController],
    exports: [
        BetterAuthService,
        AuthGuard,
    ],
})
export class BetterAuthModule { }
