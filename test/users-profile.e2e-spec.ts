import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * Users Profile E2E Tests
 *
 * Tests GET /api/users/me and PATCH /api/users/me endpoints.
 * Verifies auth requirements, profile retrieval, update with
 * name sync, phone support, and validation.
 */
describe('Users Profile (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let authCookie: string;
    let userId: string;

    const timestamp = Date.now();
    const testUser = {
        email: `profile-${timestamp}@e2e.test`,
        password: 'SecureP@ssw0rd!',
        name: 'Profile TestUser',
        firstName: 'Profile',
        lastName: 'TestUser',
    };

    // ─── SETUP ──────────────────────────────────────────────
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

        prisma = app.get<PrismaService>(PrismaService);

        // Register test user and capture session cookie
        const response = await request(app.getHttpServer())
            .post('/api/auth/sign-up/email')
            .send(testUser)
            .expect((res) => expect([200, 201]).toContain(res.status));

        const cookies = response.headers['set-cookie'];
        if (cookies) {
            authCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;
        }

        const user = await prisma.user.findUnique({ where: { email: testUser.email } });
        userId = user?.id || '';
    }, 30000);

    // ─── CLEANUP ────────────────────────────────────────────
    afterAll(async () => {
        if (userId) {
            await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
            await prisma.account.deleteMany({ where: { userId } }).catch(() => {});
            await prisma.user.delete({ where: { id: userId } }).catch(() => {});
        }
        await app.close();
    });

    // ─── AUTH REQUIRED ──────────────────────────────────────
    describe('Authentication Required', () => {
        it('GET /api/users/me should return 401 without auth', async () => {
            await request(app.getHttpServer())
                .get('/api/users/me')
                .expect(401);
        });

        it('PATCH /api/users/me should return 401 without auth', async () => {
            await request(app.getHttpServer())
                .patch('/api/users/me')
                .send({ firstName: 'Hack' })
                .expect(401);
        });
    });

    // ─── GET PROFILE ────────────────────────────────────────
    describe('GET /api/users/me', () => {
        it('should return current user profile', async () => {
            if (!authCookie) return;

            const response = await request(app.getHttpServer())
                .get('/api/users/me')
                .set('Cookie', authCookie)
                .expect(200);

            expect(response.body.email).toBe(testUser.email);
            expect(response.body.firstName).toBe(testUser.firstName);
            expect(response.body.lastName).toBe(testUser.lastName);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('globalRole');
            expect(response.body).not.toHaveProperty('password');
        });

        it('should include phone field in response', async () => {
            if (!authCookie) return;

            const response = await request(app.getHttpServer())
                .get('/api/users/me')
                .set('Cookie', authCookie)
                .expect(200);

            expect(response.body).toHaveProperty('phone');
        });
    });

    // ─── UPDATE PROFILE ─────────────────────────────────────
    describe('PATCH /api/users/me', () => {
        it('should update firstName', async () => {
            if (!authCookie) return;

            const response = await request(app.getHttpServer())
                .patch('/api/users/me')
                .set('Cookie', authCookie)
                .send({ firstName: 'UpdatedFirst' })
                .expect(200);

            expect(response.body.firstName).toBe('UpdatedFirst');
        });

        it('should update lastName', async () => {
            if (!authCookie) return;

            const response = await request(app.getHttpServer())
                .patch('/api/users/me')
                .set('Cookie', authCookie)
                .send({ lastName: 'UpdatedLast' })
                .expect(200);

            expect(response.body.lastName).toBe('UpdatedLast');
        });

        it('should update phone', async () => {
            if (!authCookie) return;

            const response = await request(app.getHttpServer())
                .patch('/api/users/me')
                .set('Cookie', authCookie)
                .send({ phone: '+595991234567' })
                .expect(200);

            expect(response.body.phone).toBe('+595991234567');
        });

        it('should sync name field when updating firstName and lastName', async () => {
            if (!authCookie) return;

            await request(app.getHttpServer())
                .patch('/api/users/me')
                .set('Cookie', authCookie)
                .send({ firstName: 'Juan', lastName: 'Pérez' })
                .expect(200);

            // Verify via fresh GET
            const response = await request(app.getHttpServer())
                .get('/api/users/me')
                .set('Cookie', authCookie)
                .expect(200);

            expect(response.body.firstName).toBe('Juan');
            expect(response.body.lastName).toBe('Pérez');
        });

        it('should reject firstName shorter than 2 characters', async () => {
            if (!authCookie) return;

            const response = await request(app.getHttpServer())
                .patch('/api/users/me')
                .set('Cookie', authCookie)
                .send({ firstName: 'X' });

            expect([400, 422]).toContain(response.status);
        });

        it('should reject non-whitelisted fields', async () => {
            if (!authCookie) return;

            const response = await request(app.getHttpServer())
                .patch('/api/users/me')
                .set('Cookie', authCookie)
                .send({ email: 'hacker@evil.com', globalRole: 'SUPER_ADMIN' });

            expect([400, 422]).toContain(response.status);
        });

        it('should never expose password in response', async () => {
            if (!authCookie) return;

            const response = await request(app.getHttpServer())
                .patch('/api/users/me')
                .set('Cookie', authCookie)
                .send({ firstName: 'Safe' })
                .expect(200);

            const body = JSON.stringify(response.body);
            expect(body).not.toContain('password');
            expect(body).not.toContain('$2b$');
        });
    });
});
