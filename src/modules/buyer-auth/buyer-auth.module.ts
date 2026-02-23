import { Module, Global } from '@nestjs/common';
import { BuyerAuthController } from './buyer-auth.controller';
import { BuyerAuthService } from './buyer-auth.service';
import { BuyerAuthGuard } from './guards/buyer-auth.guard';
import { OptionalBuyerAuthGuard } from './guards/optional-buyer-auth.guard';

@Global()
@Module({
    controllers: [BuyerAuthController],
    providers: [BuyerAuthService, BuyerAuthGuard, OptionalBuyerAuthGuard],
    exports: [BuyerAuthService, BuyerAuthGuard, OptionalBuyerAuthGuard],
})
export class BuyerAuthModule {}
