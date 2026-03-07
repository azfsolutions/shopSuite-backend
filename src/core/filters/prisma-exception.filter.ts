import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * 🔧 PRISMA EXCEPTION FILTER
 *
 * Transforma errores crípticos de Prisma en HttpExceptions legibles.
 * Se registra globalmente en main.ts ANTES del GlobalExceptionFilter
 * para que los errores de Prisma se conviertan en respuestas HTTP apropiadas.
 *
 * Códigos cubiertos:
 * - P2002: Unique constraint violation → 409 Conflict
 * - P2025: Record not found → 404 Not Found
 * - P2003: Foreign key constraint failed → 400 Bad Request
 * - P2014: Required relation violation → 400 Bad Request
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('PrismaException');

    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status: number;
        let message: string;

        switch (exception.code) {
            case 'P2002': {
                // Unique constraint violation
                const fields = (exception.meta?.target as string[])?.join(', ') || 'campo';
                status = HttpStatus.CONFLICT;
                message = `Ya existe un registro con el mismo valor en: ${fields}`;
                this.logger.warn(`Unique constraint violation on [${fields}]`);
                break;
            }

            case 'P2025': {
                // Record not found
                const model = (exception.meta?.modelName as string) || 'Registro';
                status = HttpStatus.NOT_FOUND;
                message = `${model} no encontrado`;
                this.logger.warn(`Record not found: ${model}`);
                break;
            }

            case 'P2003': {
                // Foreign key constraint failed
                const field = (exception.meta?.field_name as string) || 'referencia';
                status = HttpStatus.BAD_REQUEST;
                message = `Referencia inválida: ${field} no existe`;
                this.logger.warn(`Foreign key constraint failed on [${field}]`);
                break;
            }

            case 'P2014': {
                // Required relation violation
                status = HttpStatus.BAD_REQUEST;
                message = 'No se puede eliminar porque tiene registros relacionados';
                this.logger.warn('Required relation violation');
                break;
            }

            default: {
                status = HttpStatus.INTERNAL_SERVER_ERROR;
                message = 'Error de base de datos';
                this.logger.error(
                    `Unhandled Prisma error [${exception.code}]: ${exception.message}`,
                    exception.stack,
                );
                break;
            }
        }

        response.status(status).json({
            statusCode: status,
            message,
            error: this.getErrorLabel(status),
            timestamp: new Date().toISOString(),
        });
    }

    private getErrorLabel(status: number): string {
        const labels: Record<number, string> = {
            400: 'Bad Request',
            404: 'Not Found',
            409: 'Conflict',
            500: 'Internal Server Error',
        };
        return labels[status] || 'Error';
    }
}
