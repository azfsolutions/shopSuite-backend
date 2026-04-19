import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StockReservationsService } from './stock-reservations.service';

@Injectable()
export class StockReservationsCron {
    private readonly logger = new Logger(StockReservationsCron.name);

    constructor(private readonly service: StockReservationsService) {}

    @Cron(CronExpression.EVERY_10_MINUTES)
    async expireOverdue() {
        try {
            await this.service.expireOverdue();
        } catch (err) {
            this.logger.error({
                event: 'STOCK_RESERVATIONS_CRON_FAILED',
                error: err instanceof Error ? err.message : 'Unknown',
            });
        }
    }
}
