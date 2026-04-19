import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { WholesaleRequestsService } from './wholesale-requests.service';
import { WholesaleRequestsAdminController } from './wholesale-requests.admin.controller';
import { WholesaleRequestsBuyerController } from './wholesale-requests.buyer.controller';
import { CustomerTiersModule } from '../customer-tiers/customer-tiers.module';

@Module({
    imports: [PrismaModule, CustomerTiersModule],
    controllers: [WholesaleRequestsAdminController, WholesaleRequestsBuyerController],
    providers: [WholesaleRequestsService],
    exports: [WholesaleRequestsService],
})
export class WholesaleRequestsModule {}
