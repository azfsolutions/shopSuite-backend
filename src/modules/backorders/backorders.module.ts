import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { BackordersService } from './backorders.service';
import { BackordersController } from './backorders.controller';

@Module({
    imports: [PrismaModule],
    controllers: [BackordersController],
    providers: [BackordersService],
    exports: [BackordersService],
})
export class BackordersModule {}
