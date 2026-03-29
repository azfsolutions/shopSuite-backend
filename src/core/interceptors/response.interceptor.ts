import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface StandardResponse<T> {
    success: boolean;
    data: T;
    meta?: Record<string, unknown>;
    timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
        const response = context.switchToHttp().getResponse<Response>();

        return next.handle().pipe(
            map((body) => {
                // If response is already streamed (e.g., CSV export with @Res()), skip
                if (response.headersSent) {
                    return body;
                }

                // If body is null/undefined (e.g., 204 No Content)
                if (body === undefined || body === null) {
                    return {
                        success: true,
                        data: null as T,
                        timestamp: new Date().toISOString(),
                    };
                }

                // If body already has our standard format
                if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
                    return body;
                }

                // If body has data + meta (paginated responses from services)
                if (body && typeof body === 'object' && 'data' in body && 'meta' in body) {
                    return {
                        success: true,
                        data: body.data,
                        meta: body.meta,
                        timestamp: new Date().toISOString(),
                    };
                }

                // Default: wrap raw data
                return {
                    success: true,
                    data: body,
                    timestamp: new Date().toISOString(),
                };
            }),
        );
    }
}
