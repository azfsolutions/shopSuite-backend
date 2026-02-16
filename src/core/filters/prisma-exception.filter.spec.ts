import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
    let filter: PrismaExceptionFilter;
    let mockResponse: any;
    let mockHost: ArgumentsHost;

    beforeEach(() => {
        filter = new PrismaExceptionFilter();
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockHost = {
            switchToHttp: () => ({
                getResponse: () => mockResponse,
            }),
        } as unknown as ArgumentsHost;
    });

    // Helper to create Prisma known errors
    function createPrismaError(code: string, meta?: Record<string, any>): Prisma.PrismaClientKnownRequestError {
        const error = new Prisma.PrismaClientKnownRequestError('Prisma error', {
            code,
            clientVersion: '5.0.0',
            meta,
        });
        return error;
    }

    it('should handle P2002 (unique constraint) → 409', () => {
        const exception = createPrismaError('P2002', { target: ['email', 'storeId'] });

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 409,
                error: 'Conflict',
                message: expect.stringContaining('email, storeId'),
            }),
        );
    });

    it('should handle P2025 (record not found) → 404', () => {
        const exception = createPrismaError('P2025', { modelName: 'Product' });

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 404,
                error: 'Not Found',
                message: expect.stringContaining('Product'),
            }),
        );
    });

    it('should handle P2003 (foreign key constraint) → 400', () => {
        const exception = createPrismaError('P2003', { field_name: 'categoryId' });

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 400,
                error: 'Bad Request',
                message: expect.stringContaining('categoryId'),
            }),
        );
    });

    it('should handle P2014 (required relation violation) → 400', () => {
        const exception = createPrismaError('P2014');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 400,
                message: expect.stringContaining('registros relacionados'),
            }),
        );
    });

    it('should handle unknown Prisma error → 500', () => {
        const exception = createPrismaError('P9999');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 500,
                message: 'Error de base de datos',
            }),
        );
    });

    it('should include timestamp in response', () => {
        const exception = createPrismaError('P2002', { target: ['id'] });

        filter.catch(exception, mockHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                timestamp: expect.any(String),
            }),
        );
    });

    it('should return correct error labels', () => {
        const label400 = (filter as any).getErrorLabel(400);
        const label404 = (filter as any).getErrorLabel(404);
        const label409 = (filter as any).getErrorLabel(409);
        const label500 = (filter as any).getErrorLabel(500);
        const labelUnknown = (filter as any).getErrorLabel(418);

        expect(label400).toBe('Bad Request');
        expect(label404).toBe('Not Found');
        expect(label409).toBe('Conflict');
        expect(label500).toBe('Internal Server Error');
        expect(labelUnknown).toBe('Error');
    });
});
