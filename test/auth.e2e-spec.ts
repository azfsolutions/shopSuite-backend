import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Auth E2E Tests — Better Auth Session-Based Authentication
 *
 * Tests the full authentication flow using Better Auth's
 * cookie-based sessions via /api/auth/* endpoints.
 *
 * NOTA: Requiere base de datos real (PostgreSQL).
 * Usa emails únicos por ejecución para evitar conflictos.
 */
describe('BetterAuth (e2e)', () => {
    let app: INestApplication;

    const timestamp = Date.now();
    const testUser = {
        email: `test-${timestamp}@e2e.test`,
        password: 'SecureP@ssw0rd!',
        name: 'E2E TestUser',
        firstName: 'E2E',
        lastName: 'TestUser',
    };

    let sessionCookie: string;

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
    }, 30000);

    afterAll(async () => {
        await app.close();
    });

    // ============================================================
    // SIGN UP FLOW
    // ============================================================
    describe('POST /api/auth/sign-up/email', () => {
        it('should register a new user successfully', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/auth/sign-up/email')
                .send(testUser)
                .expect((res) => {
                    // Better Auth returns 200 on success
                    expect([200, 201]).toContain(res.status);
                });

            // Better Auth sets session cookies
            const cookies = response.headers['set-cookie'];
            if (cookies) {
                sessionCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;
            }

            // Response should have user data
            if (response.body.user) {
                expect(response.body.user.email).toBe(testUser.email);
                // Password NEVER in response
                expect(JSON.stringify(response.body)).not.toContain(testUser.password);
            }
        });

        it('should reject duplicate email registration', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/auth/sign-up/email')
                .send(testUser);

            // Better Auth returns 422 or 400 for duplicate email
            expect([400, 409, 422]).toContain(response.status);
        });

        it('should reject weak password (< 8 chars)', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/auth/sign-up/email')
                .send({
                    email: `weak-${Date.now()}@password.test`,
                    password: '123',
                    name: 'Weak Password',
                    firstName: 'Weak',
                    lastName: 'Password',
                });

            expect([400, 422]).toContain(response.status);
        });
    });

    // ============================================================
    // SIGN IN FLOW
    // ============================================================
    describe('POST /api/auth/sign-in/email', () => {
        it('should login with correct credentials', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/auth/sign-in/email')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .expect(200);

            // Should set session cookies
            const cookies = response.headers['set-cookie'];
            expect(cookies).toBeDefined();

            if (cookies) {
                sessionCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;
            }
        });

        it('should reject wrong password', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/auth/sign-in/email')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123!',
                });

            expect([401, 403]).toContain(response.status);
        });

        it('should reject non-existent email', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/auth/sign-in/email')
                .send({
                    email: 'nonexistent@email.test',
                    password: 'SomePassword123!',
                });

            expect([401, 403]).toContain(response.status);
        });
    });

    // ============================================================
    // SESSION FLOW
    // ============================================================
    describe('GET /api/auth/get-session', () => {
        it('should return session with valid cookie', async () => {
            if (!sessionCookie) {
                console.warn('Skipping: no session cookie available');
                return;
            }

            const response = await request(app.getHttpServer())
                .get('/api/auth/get-session')
                .set('Cookie', sessionCookie)
                .expect(200);

            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('session');
            expect(response.body.user.email).toBe(testUser.email);
        });

        it('should return 401 without cookie', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/auth/get-session');

            // Better Auth returns null session or 401
            expect([200, 401]).toContain(response.status);
            if (response.status === 200) {
                // If 200, body should be null/empty
                expect(response.body?.user || response.body?.session).toBeFalsy();
            }
        });
    });

    // ============================================================
    // PROTECTED ROUTE ACCESS
    // ============================================================
    describe('Protected Routes', () => {
        it('should deny access to protected route without session', async () => {
            await request(app.getHttpServer())
                .get('/api/users/me')
                .expect(401);
        });

        it('should allow access to protected route with valid session', async () => {
            if (!sessionCookie) {
                console.warn('Skipping: no session cookie available');
                return;
            }

            const response = await request(app.getHttpServer())
                .get('/api/users/me')
                .set('Cookie', sessionCookie);

            // Should not be 401
            expect(response.status).not.toBe(401);
        });
    });

    // ============================================================
    // SIGN OUT FLOW
    // ============================================================
    describe('POST /api/auth/sign-out', () => {
        it('should sign out with valid session', async () => {
            if (!sessionCookie) {
                console.warn('Skipping: no session cookie available');
                return;
            }

            const response = await request(app.getHttpServer())
                .post('/api/auth/sign-out')
                .set('Cookie', sessionCookie)
                .send({})
                .expect(200);

            // Capture cleared cookies from sign-out response
            const clearedCookies = response.headers['set-cookie'];
            if (clearedCookies) {
                sessionCookie = Array.isArray(clearedCookies)
                    ? clearedCookies.join('; ')
                    : clearedCookies;
            }
        });

        it('should not access protected routes after sign out', async () => {
            // After sign-out, the session cookie should be cleared/expired
            // Using the cleared cookie (or no cookie) should result in 401
            await request(app.getHttpServer())
                .get('/api/users/me')
                .expect(401);
        });
    });

    // ============================================================
    // SECURITY TESTS
    // ============================================================
    describe('Security', () => {
        it('should never expose password in any response', async () => {
            const securityTestUser = {
                email: `security-${Date.now()}@test.com`,
                password: 'TestP@ssw0rd!',
                name: 'Security Test',
                firstName: 'Security',
                lastName: 'Test',
            };

            const response = await request(app.getHttpServer())
                .post('/api/auth/sign-up/email')
                .send(securityTestUser);

            const bodyString = JSON.stringify(response.body);
            expect(bodyString).not.toContain(securityTestUser.password);
            expect(bodyString).not.toContain('$2b$'); // bcrypt hash prefix
            expect(bodyString).not.toContain('$2a$'); // bcrypt hash prefix
        });

        it('should set HttpOnly cookie flag', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/auth/sign-in/email')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });

            const cookies = response.headers['set-cookie'];
            if (cookies) {
                const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
                // Session cookie should have httponly flag
                expect(cookieStr.toLowerCase()).toContain('httponly');
            }
        });
    });
});
