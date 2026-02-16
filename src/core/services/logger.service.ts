import { Injectable, Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================================
// 📝 STRUCTURED LOGGER SERVICE
// ============================================================
// El logging estructurado es CRÍTICO en producción porque:
//
// 1. BÚSQUEDA: Logs en JSON pueden ser indexados y buscados
//    en herramientas como Elasticsearch, Datadog, Logtail
//
// 2. ALERTAS: Puedes crear alertas basadas en campos específicos
//    Ejemplo: Alerta si level='error' && action='PAYMENT_FAILED'
//
// 3. CORRELACIÓN: El requestId conecta todos los logs de una
//    misma request, facilitando debugging
//
// 4. MÉTRICAS: Extrae automáticamente latencia, conteos de errores,
//    etc. de los logs estructurados
// ============================================================

interface LogContext {
    // Identificadores
    requestId?: string;
    userId?: string;
    storeId?: string;

    // Acción
    action?: string;
    entity?: string;
    entityId?: string;

    // Request info
    method?: string;
    path?: string;
    statusCode?: number;
    duration?: number;
    ip?: string;

    // Cualquier dato adicional
    [key: string]: unknown;
}

interface StructuredLog {
    timestamp: string;
    level: string;
    message: string;
    service: string;
    environment: string;
    context: LogContext;
    error?: {
        message: string;
        stack?: string;
        code?: string;
    };
}

@Injectable()
export class LoggerService {
    private readonly logger = new Logger('App');
    private readonly isProduction: boolean;
    private readonly serviceName: string;

    constructor(private readonly configService: ConfigService) {
        this.isProduction = configService.get('NODE_ENV') === 'production';
        this.serviceName = configService.get('SERVICE_NAME') || 'shopsuite-api';
    }

    /**
     * Log informativo - para operaciones exitosas
     */
    info(message: string, context: LogContext = {}) {
        this.log('info', message, context);
    }

    /**
     * Log de warning - algo inesperado pero no fatal
     */
    warn(message: string, context: LogContext = {}) {
        this.log('warn', message, context);
    }

    /**
     * Log de error - algo falló
     */
    error(message: string, error: Error | null, context: LogContext = {}) {
        const logEntry = this.createLogEntry('error', message, context);

        if (error) {
            logEntry.error = {
                message: error.message,
                stack: this.isProduction ? undefined : error.stack, // No exponer stack en prod
                code: (error as any).code,
            };
        }

        // En producción, output como JSON para ingesta en sistemas de logging
        if (this.isProduction) {
            console.error(JSON.stringify(logEntry));
        } else {
            this.logger.error(message, error?.stack);
            if (Object.keys(context).length > 0) {
                this.logger.error('Context:', context);
            }
        }
    }

    /**
     * Log de debug - solo en desarrollo
     */
    debug(message: string, context: LogContext = {}) {
        if (!this.isProduction) {
            this.log('debug', message, context);
        }
    }

    /**
     * Log de request HTTP - para middleware
     */
    httpRequest(context: {
        requestId: string;
        method: string;
        path: string;
        statusCode: number;
        duration: number;
        ip?: string;
        userId?: string;
    }) {
        const level = context.statusCode >= 500 ? 'error' :
            context.statusCode >= 400 ? 'warn' : 'info';

        this.log(level, `${context.method} ${context.path} ${context.statusCode}`, context);
    }

    /**
     * Log de evento de negocio
     */
    businessEvent(action: string, context: LogContext = {}) {
        this.info(`Business Event: ${action}`, { action, ...context });
    }

    /**
     * Log de seguridad
     */
    security(action: string, context: LogContext = {}) {
        this.warn(`Security: ${action}`, { action, category: 'security', ...context });
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private log(level: string, message: string, context: LogContext) {
        const logEntry = this.createLogEntry(level, message, context);

        if (this.isProduction) {
            // En producción: JSON estructurado para sistemas de logging
            console.log(JSON.stringify(logEntry));
        } else {
            // En desarrollo: formato legible
            const contextStr = Object.keys(context).length > 0
                ? ` ${JSON.stringify(context)}`
                : '';

            switch (level) {
                case 'error':
                    this.logger.error(`${message}${contextStr}`);
                    break;
                case 'warn':
                    this.logger.warn(`${message}${contextStr}`);
                    break;
                case 'debug':
                    this.logger.debug(`${message}${contextStr}`);
                    break;
                default:
                    this.logger.log(`${message}${contextStr}`);
            }
        }
    }

    private createLogEntry(level: string, message: string, context: LogContext): StructuredLog {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: this.serviceName,
            environment: this.isProduction ? 'production' : 'development',
            context: {
                ...context,
                // Limpiar valores undefined
                ...Object.fromEntries(
                    Object.entries(context).filter(([_, v]) => v !== undefined)
                ),
            },
        };
    }
}
