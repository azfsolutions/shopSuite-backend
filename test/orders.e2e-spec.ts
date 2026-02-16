import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// ============================================================
// 🧪 ORDERS E2E TESTS - GESTIÓN DE PEDIDOS
// ============================================================
// NOTA IMPORTANTE: Los endpoints de órdenes requieren:
// - Usuario autenticado CON tienda asociada
// - El guard de store verifica permisos DESPUÉS del JWT
//
// Los tests validan:
// - Autenticación requerida (401 sin token)
// - Formato de respuestas
// - Protección de endpoints
// ============================================================

describe('OrdersController (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        app.setGlobalPrefix('api');

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    // ============================================================
    // AUTHENTICATION REQUIRED TESTS
    // Estos endpoints SIEMPRE requieren un token JWT válido
    // ============================================================
    describe('Authentication Required', () => {
        it('GET /api/stores/:storeId/orders should return 401 without auth', async () => {
            await request(app.getHttpServer())
                .get('/api/stores/any-store-id/orders')
                .expect(401);
        });

        it('GET /api/stores/:storeId/orders/:orderId should return 401 without auth', async () => {
            await request(app.getHttpServer())
                .get('/api/stores/any-store-id/orders/any-order-id')
                .expect(401);
        });

        it('PATCH /api/stores/:storeId/orders/:orderId/status should return 401 without auth', async () => {
            await request(app.getHttpServer())
                .patch('/api/stores/any-store-id/orders/any-order-id/status')
                .send({ status: 'PROCESSING' })
                .expect(401);
        });
    });

    // ============================================================
    // INVALID TOKEN TESTS
    // ============================================================
    describe('Invalid Token Handling', () => {
        it('should reject invalid JWT format', async () => {
            await request(app.getHttpServer())
                .get('/api/stores/any-store-id/orders')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });

        it('should reject malformed authorization header', async () => {
            await request(app.getHttpServer())
                .get('/api/stores/any-store-id/orders')
                .set('Authorization', 'NotBearer token')
                .expect(401);
        });

        it('should reject empty authorization header', async () => {
            await request(app.getHttpServer())
                .get('/api/stores/any-store-id/orders')
                .set('Authorization', '')
                .expect(401);
        });
    });
});

// ============================================================
// HEALTH ENDPOINT TESTS (no auth required)
// Basado en HealthController real que retorna:
// - /health: { status, timestamp, uptime, version, checks }
// - /health/ready: { ready: boolean }
// - /health/live: { alive: boolean }
// ============================================================
describe('Health Endpoints (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/health', () => {
        it('should return health status with all required fields', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('checks');
            expect(response.body.checks).toHaveProperty('database');
        });

        it('should return healthy or unhealthy status', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/health')
                .expect(200);

            expect(['healthy', 'unhealthy', 'degraded']).toContain(response.body.status);
        });
    });

    describe('GET /api/health/live', () => {
        it('should return alive status', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/health/live')
                .expect(200);

            expect(response.body).toHaveProperty('alive', true);
        });
    });

    describe('GET /api/health/ready', () => {
        it('should return ready status', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/health/ready')
                .expect(200);

            expect(response.body).toHaveProperty('ready');
            expect(typeof response.body.ready).toBe('boolean');
        });
    });
});
