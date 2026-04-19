import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { StockReservationsService } from './stock-reservations.service';
import { StockReservationsController } from './stock-reservations.controller';
import { StockReservationsCron } from './stock-reservations.cron';

@Module({
    imports: [PrismaModule],
    controllers: [StockReservationsController],
    providers: [StockReservationsService, StockReservationsCron],
    exports: [StockReservationsService],
})
export class StockReservationsModule {}
