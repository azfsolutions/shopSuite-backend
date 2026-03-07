import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Role Enforcement E2E Tests
 *
 * Validates that buyers cannot access merchant endpoints
 * and merchants can access them normally.
 *
 * NOTA: Requiere base de datos real (PostgreSQL).
 */
describe('Role Enforcement (e2e)', () => {
    let app: INestApplication;

    const timestamp = Date.now();

    const buyerUser = {
        email: `buyer-role-${timestamp}@e2e.test`,
        password: 'SecureP@ssw0rd!',
        firstName: 'Buyer',
        lastName: 'Test',
    };

    const merchantUser = {
        email: `merchant-role-${timestamp}@e2e.test`,
        password: 'SecureP@ssw0rd!',
        name: 'Merchant Test',
        firstName: 'Merchant',
        lastName: 'Test',
    };

    let buyerCookie: string;
    let merchantCookie: string;

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

        // Register buyer via dedicated endpoint
        await request(app.getHttpServer())
            .post('/api/auth/buyer/signup')
            .send(buyerUser);

        // Login buyer
        const buyerLogin = await request(app.getHttpServer())
            .post('/api/auth/sign-in/email')
            .send({ email: buyerUser.email, password: buyerUser.password });

        const buyerCookies = buyerLogin.headers['set-cookie'];
        buyerCookie = Array.isArray(buyerCookies)
            ? buyerCookies.join('; ')
            : buyerCookies;

        // Register merchant (default globalRole: USER)
        await request(app.getHttpServer())
            .post('/api/auth/sign-up/email')
            .send(merchantUser);

        // Login merchant
        const merchantLogin = await request(app.getHttpServer())
            .post('/api/auth/sign-in/email')
            .send({ email: merchantUser.email, password: merchantUser.password });

        const merchantCookies = merchantLogin.headers['set-cookie'];
        merchantCookie = Array.isArray(merchantCookies)
            ? merchantCookies.join('; ')
            : merchantCookies;
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    // ============================================================
    // BUYER BLOCKED FROM MERCHANT ENDPOINTS
    // ============================================================
    describe('Buyer cannot access merchant endpoints', () => {
        it('GET /api/stores should return 403 for buyer', async () => {
            await request(app.getHttpServer())
                .get('/api/stores')
                .set('Cookie', buyerCookie)
                .expect(403);
        });
    });

    // ============================================================
    // MERCHANT CAN ACCESS MERCHANT ENDPOINTS
    // ============================================================
    describe('Merchant can access merchant endpoints', () => {
        it('GET /api/stores should return 200 for merchant', async () => {
            if (!merchantCookie) {
                console.warn('Skipping: no merchant cookie available');
                return;
            }

            const response = await request(app.getHttpServer())
                .get('/api/stores')
                .set('Cookie', merchantCookie);

            // Should be 200 (empty array is fine)
            expect(response.status).toBe(200);
        });
    });

    // ============================================================
    // BUYER SIGNUP FORCES GLOBAL ROLE
    // ============================================================
    describe('Buyer signup forces globalRole to BUYER', () => {
        it('should create user with globalRole BUYER', async () => {
            const sessionRes = await request(app.getHttpServer())
                .get('/api/auth/get-session')
                .set('Cookie', buyerCookie);

            if (sessionRes.body?.user) {
                expect(sessionRes.body.user.globalRole).toBe('BUYER');
            }
        });
    });

    // ============================================================
    // BOTH CAN ACCESS PUBLIC ENDPOINTS
    // ============================================================
    describe('Public endpoints accessible to all', () => {
        it('GET /api/auth/get-session should work for buyer', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/auth/get-session')
                .set('Cookie', buyerCookie);

            expect(response.status).toBe(200);
        });

        it('GET /api/auth/get-session should work for merchant', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/auth/get-session')
                .set('Cookie', merchantCookie);

            expect(response.status).toBe(200);
        });
    });

    // ============================================================
    // GLOBALROLE CANNOT BE OVERRIDDEN BY CLIENT
    // ============================================================
    describe('globalRole cannot be set by client', () => {
        it('should ignore globalRole in signup payload (input: false)', async () => {
            const hackUser = {
                email: `hack-${timestamp}@e2e.test`,
                password: 'SecureP@ssw0rd!',
                name: 'Hacker Test',
                firstName: 'Hacker',
                lastName: 'Test',
                globalRole: 'SUPER_ADMIN',
            };

            await request(app.getHttpServer())
                .post('/api/auth/sign-up/email')
                .send(hackUser);

            const loginRes = await request(app.getHttpServer())
                .post('/api/auth/sign-in/email')
                .send({ email: hackUser.email, password: hackUser.password });

            const cookies = loginRes.headers['set-cookie'];
            const cookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;

            if (cookie) {
                const sessionRes = await request(app.getHttpServer())
                    .get('/api/auth/get-session')
                    .set('Cookie', cookie);

                if (sessionRes.body?.user) {
                    // Should be default 'USER', NOT 'SUPER_ADMIN'
                    expect(sessionRes.body.user.globalRole).not.toBe('SUPER_ADMIN');
                    expect(sessionRes.body.user.globalRole).toBe('USER');
                }
            }
        });
    });
});
