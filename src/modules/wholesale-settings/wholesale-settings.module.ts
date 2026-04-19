import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { WholesaleSettingsController } from './wholesale-settings.controller';
import { WholesaleSettingsService } from './wholesale-settings.service';

@Module({
    imports: [PrismaModule],
    controllers: [WholesaleSettingsController],
    providers: [WholesaleSettingsService],
    exports: [WholesaleSettingsService],
})
export class WholesaleSettingsModule {}
