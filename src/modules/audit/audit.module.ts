import { Module, Global } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../database/prisma.module';

@Global() // Hacer global para que otros servicios puedan inyectarlo
@Module({
    imports: [PrismaModule],
    controllers: [AuditController],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule { }
