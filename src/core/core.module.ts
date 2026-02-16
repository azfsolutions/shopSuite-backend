import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { SanitizationService } from './services/sanitization.service';
import { LoggerService } from './services/logger.service';
import { HealthController } from './controllers/health.controller';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';

// ============================================================
// 🧱 CORE MODULE - SERVICIOS GLOBALES
// ============================================================
// Este módulo contiene servicios y controllers que son
// usados en TODA la aplicación:
//
// - SanitizationService: Limpieza de inputs (XSS prevention)
// - LoggerService: Logging estructurado para producción
// - HealthController: Endpoints de salud para monitoring
// - RequestLoggerMiddleware: Logging de todas las HTTP requests
//
// @Global() hace que estos servicios estén disponibles
// automáticamente en todos los módulos sin necesidad
// de importar explícitamente.
// ============================================================

@Global()
@Module({
    controllers: [HealthController],
    providers: [
        SanitizationService,
        LoggerService,
    ],
    exports: [
        SanitizationService,
        LoggerService,
    ],
})
export class CoreModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Aplicar el middleware de logging a todas las rutas
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes('*');
    }
}
