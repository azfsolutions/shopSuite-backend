import { Module } from '@nestjs/common';
import { BuyerNotificationsController } from './buyer-notifications.controller';
import { BuyerNotificationsService } from './buyer-notifications.service';

@Module({
    controllers: [BuyerNotificationsController],
    providers: [BuyerNotificationsService],
    exports: [BuyerNotificationsService],
})
export class BuyerNotificationsModule {}
