import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { B2BQuotesService } from './b2b-quotes.service';
import { B2BQuotePdfService } from './b2b-quote-pdf.service';
import { B2BQuotesAdminController } from './b2b-quotes.admin.controller';
import { B2BQuotesBuyerController } from './b2b-quotes.buyer.controller';
import { StockReservationsModule } from '../stock-reservations/stock-reservations.module';
import { WholesaleRequestsModule } from '../wholesale-requests/wholesale-requests.module';

@Module({
    imports: [PrismaModule, StockReservationsModule, WholesaleRequestsModule],
    controllers: [B2BQuotesAdminController, B2BQuotesBuyerController],
    providers: [B2BQuotesService, B2BQuotePdfService],
    exports: [B2BQuotesService],
})
export class B2BQuotesModule {}
