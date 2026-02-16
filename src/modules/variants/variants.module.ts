import { Module } from '@nestjs/common';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [VariantsController],
    providers: [VariantsService],
    exports: [VariantsService],
})
export class VariantsModule { }
