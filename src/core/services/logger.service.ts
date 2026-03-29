import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as Sentry from '@sentry/node';

// ============================================================
// STRUCTURED LOGGER SERVICE — Winston + Sentry
// ============================================================
// Uses Winston for structured logging and Sentry for production
// error tracking. Keeps the same public API so all consumers
// continue working without changes.
// ============================================================

interface LogContext {
    // Identificadores
    requestId?: string;
    userId?: string;
    storeId?: string;

    // Accion
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

@Injectable()
export class LoggerService {
    private readonly winstonLogger: winston.Logger;
    private readonly isProduction: boolean;
    private readonly serviceName: string;

    constructor(configService: ConfigService) {
        this.isProduction = configService.get('NODE_ENV') === 'production';
        this.serviceName = configService.get('SERVICE_NAME') || 'shopsuite-api';

        this.winstonLogger = winston.createLogger({
            level: this.isProduction ? 'info' : 'debug',
            defaultMeta: { service: this.serviceName },
            transports: [
                new winston.transports.Console({
                    format: this.isProduction
                        ? winston.format.combine(
                            winston.format.timestamp(),
                            winston.format.json(),
                        )
                        : winston.format.combine(
                            winston.format.timestamp({ format: 'HH:mm:ss' }),
                            winston.format.colorize(),
                            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                                const metaKeys = Object.keys(meta);
                                const metaStr = metaKeys.length > 0
                                    ? ` ${JSON.stringify(meta)}`
                                    : '';
                                return `${timestamp} ${level}: ${message}${metaStr}`;
                            }),
                        ),
                }),
            ],
        });
    }

    /**
     * Log informativo - para operaciones exitosas
     */
    info(message: string, context: LogContext = {}) {
        this.winstonLogger.info(message, { ...context });
    }

    /**
     * Log de warning - algo inesperado pero no fatal
     */
    warn(message: string, context: LogContext = {}) {
        this.winstonLogger.warn(message, { ...context });
    }

    /**
     * Log de error - algo fallo
     */
    error(message: string, error: Error | null, context: LogContext = {}) {
        const meta: Record<string, unknown> = { ...context };

        if (error) {
            meta.error = {
                message: error.message,
                stack: this.isProduction ? undefined : error.stack,
                code: (error as any).code,
            };

            // Send to Sentry in production
            if (this.isProduction) {
                Sentry.captureException(error, {
                    tags: { action: context.action as string | undefined },
                    extra: context,
                });
            }
        }

        this.winstonLogger.error(message, meta);
    }

    /**
     * Log de debug - solo en desarrollo
     */
    debug(message: string, context: LogContext = {}) {
        this.winstonLogger.debug(message, { ...context });
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

        this.winstonLogger.log(level, `${context.method} ${context.path} ${context.statusCode}`, context);
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
}
