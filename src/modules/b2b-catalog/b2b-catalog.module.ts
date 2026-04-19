import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { B2BCatalogService } from './b2b-catalog.service';
import { B2BCatalogAdminController } from './b2b-catalog.admin.controller';
import { B2BCatalogBuyerController } from './b2b-catalog.buyer.controller';
import { WholesaleRequestsModule } from '../wholesale-requests/wholesale-requests.module';

@Module({
    imports: [PrismaModule, WholesaleRequestsModule],
    controllers: [B2BCatalogAdminController, B2BCatalogBuyerController],
    providers: [B2BCatalogService],
    exports: [B2BCatalogService],
})
export class B2BCatalogModule {}
