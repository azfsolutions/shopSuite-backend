import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { WholesaleChatService } from './wholesale-chat.service';
import { WholesaleChatAdminController } from './wholesale-chat.admin.controller';
import { WholesaleChatBuyerController } from './wholesale-chat.buyer.controller';

@Module({
    imports: [PrismaModule],
    controllers: [WholesaleChatAdminController, WholesaleChatBuyerController],
    providers: [WholesaleChatService],
    exports: [WholesaleChatService],
})
export class WholesaleChatModule {}
