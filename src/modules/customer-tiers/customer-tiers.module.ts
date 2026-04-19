import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CustomerTiersController } from './customer-tiers.controller';
import { CustomerTiersService } from './customer-tiers.service';

@Module({
    imports: [PrismaModule],
    controllers: [CustomerTiersController],
    providers: [CustomerTiersService],
    exports: [CustomerTiersService],
})
export class CustomerTiersModule {}
