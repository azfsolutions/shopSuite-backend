import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// 📊 REQUEST LOGGER MIDDLEWARE
// ============================================================
// Este middleware registra TODAS las requests HTTP entrantes.
//
// ¿Por qué es importante?
// 1. DEBUGGING: Sabes exactamente qué requests llegaron y cuándo
// 2. PERFORMANCE: Detectas endpoints lentos (duration > 1s)
// 3. SEGURIDAD: Ves patrones de acceso sospechosos
// 4. ANALYTICS: Cuánto tráfico recibe cada endpoint
//
// El requestId permite correlacionar todos los logs de una
// misma request, incluso si van a diferentes servicios.
// ============================================================

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const startTime = Date.now();

        // Generar requestId único para correlación
        const requestId = req.headers['x-request-id'] as string || uuidv4();
        req.headers['x-request-id'] = requestId;

        // Añadir requestId a la respuesta
        res.setHeader('X-Request-Id', requestId);

        // Extraer información útil
        const { method, originalUrl, ip } = req;
        const userAgent = req.get('user-agent') || '';
        const userId = (req as any).user?.id; // Si está autenticado

        // Log al completar la respuesta
        res.on('finish', () => {
            const { statusCode } = res;
            const duration = Date.now() - startTime;
            const contentLength = res.get('content-length') || 0;

            // Determinar nivel de log basado en status
            const logData = {
                requestId,
                method,
                path: originalUrl,
                statusCode,
                duration: `${duration}ms`,
                contentLength,
                ip,
                userAgent: userAgent.substring(0, 100), // Truncar
                userId,
            };

            // Formato de log
            const message = `${method} ${originalUrl} ${statusCode} ${duration}ms`;

            if (statusCode >= 500) {
                this.logger.error(message, JSON.stringify(logData));
            } else if (statusCode >= 400) {
                this.logger.warn(message);
            } else if (duration > 1000) {
                // Warn si es lento (> 1 segundo)
                this.logger.warn(`SLOW: ${message}`);
            } else {
                this.logger.log(message);
            }
        });

        next();
    }
}
