import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

// ============================================================
// 🚨 GLOBAL EXCEPTION FILTER
// ============================================================
// Este filtro captura TODAS las excepciones no manejadas.
//
// ¿Por qué es CRÍTICO?
// 1. SEGURIDAD: Nunca expone stack traces al cliente en producción
// 2. LOGGING: Todos los errores quedan registrados
// 3. CONSISTENCIA: Todas las respuestas de error tienen el mismo formato
// 4. DEBUGGING: El requestId permite encontrar el error en los logs
// ============================================================

interface ErrorResponse {
    statusCode: number;
    message: string;
    error: string;
    path: string;
    timestamp: string;
    requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('Exception');
    private readonly isProduction = process.env.NODE_ENV === 'production';

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const requestId = request.headers['x-request-id'] as string;
        const path = request.url;
        const method = request.method;

        // Determinar status code y mensaje
        let status: number;
        let message: string;
        let errorName: string;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                message = (exceptionResponse as any).message || exception.message;
            } else {
                message = exception.message;
            }
            errorName = exception.name;
        } else if (exception instanceof Error) {
            // Error no HTTP (500 Internal Server Error)
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = this.isProduction
                ? 'Error interno del servidor'
                : exception.message;
            errorName = exception.name;
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Error desconocido';
            errorName = 'UnknownError';
        }

        // Log del error
        const logContext = {
            requestId,
            method,
            path,
            statusCode: status,
            errorName,
            userId: (request as any).user?.id,
            ip: request.ip,
        };

        if (status >= 500) {
            // Errores de servidor - loggear stack trace
            this.logger.error(
                `${method} ${path} ${status} - ${message}`,
                exception instanceof Error ? exception.stack : undefined,
            );

            // Send to Sentry in production
            if (this.isProduction && exception instanceof Error) {
                Sentry.captureException(exception, {
                    tags: { method, path },
                    extra: logContext,
                });
            }
        } else if (status >= 400) {
            // Errores de cliente - solo warn
            this.logger.warn(`${method} ${path} ${status} - ${message}`);
        }

        // Respuesta al cliente
        const errorResponse: ErrorResponse = {
            statusCode: status,
            message: Array.isArray(message) ? message[0] : message,
            error: this.getErrorLabel(status),
            path,
            timestamp: new Date().toISOString(),
            requestId,
        };

        response.status(status).json(errorResponse);
    }

    private getErrorLabel(status: number): string {
        const labels: Record<number, string> = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
        };
        return labels[status] || 'Error';
    }
}
