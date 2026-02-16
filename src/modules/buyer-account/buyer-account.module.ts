import { Module } from '@nestjs/common';
import { BuyerAccountController } from './buyer-account.controller';
import { BuyerAccountService } from './buyer-account.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [BuyerAccountController],
    providers: [BuyerAccountService],
    exports: [BuyerAccountService],
})
export class BuyerAccountModule { }
