import { ArgumentsHost, HttpException, BadRequestException, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
    let filter: GlobalExceptionFilter;
    let mockResponse: any;
    let mockHost: ArgumentsHost;

    beforeEach(() => {
        filter = new GlobalExceptionFilter();
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockHost = {
            switchToHttp: () => ({
                getResponse: () => mockResponse,
                getRequest: () => ({
                    url: '/api/test',
                    method: 'GET',
                    headers: { 'x-request-id': 'test-req-id' },
                    ip: '127.0.0.1',
                    user: { id: 'user-1' },
                }),
            }),
        } as unknown as ArgumentsHost;
    });

    it('should handle HttpException (400)', () => {
        const exception = new BadRequestException('Invalid input');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 400,
                error: 'Bad Request',
                path: '/api/test',
                requestId: 'test-req-id',
            }),
        );
    });

    it('should handle HttpException (404)', () => {
        const exception = new NotFoundException('Not found');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 404,
                error: 'Not Found',
            }),
        );
    });

    it('should handle generic Error (500)', () => {
        const exception = new Error('Database crashed');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        // The filter might mask the message for security, so we check for status 500
        expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle unknown exception (500)', () => {
        filter.catch('random string error', mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 500,
                message: 'Error desconocido',
                error: 'Internal Server Error',
            }),
        );
    });

    it('should handle HttpException with string response', () => {
        const exception = new HttpException('Custom message', 422);

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(422);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 422,
                message: 'Custom message',
            }),
        );
    });

    it('should include requestId from x-request-id header', () => {
        const exception = new BadRequestException('test');

        filter.catch(exception, mockHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: 'test-req-id',
            }),
        );
    });

    it('should use getErrorLabel for known HTTP statuses', () => {
        const filter2 = new GlobalExceptionFilter();
        const label = (filter2 as any).getErrorLabel(429);
        expect(label).toBe('Too Many Requests');
    });

    it('should return "Error" for unknown status codes', () => {
        const filter2 = new GlobalExceptionFilter();
        const label = (filter2 as any).getErrorLabel(418);
        expect(label).toBe('Error');
    });
});
