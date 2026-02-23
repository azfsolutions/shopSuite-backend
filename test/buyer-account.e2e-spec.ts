import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

/**
 * Buyer Account E2E Tests
 *
 * Tests the storefront/:storeSlug/account/* endpoints:
 * - GET/PATCH profile
 * - GET/POST/PATCH/DELETE addresses
 * - GET orders (list + detail)
 *
 * Requires real database. Seeds a store, registers a buyer,
 * and tests the full buyer account flow.
 */
describe('Buyer Account (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const timestamp = Date.now();
    let storeSlug: string;
    let storeId: string;
    let ownerId: string;
    let buyerCookie: string;
    let buyerId: string;

    const ownerUser = {
        email: `owner-ba-${timestamp}@e2e.test`,
        password: 'OwnerP@ss123!',
        name: 'Store Owner',
        firstName: 'Store',
        lastName: 'Owner',
    };

    const buyerUser = {
        email: `buyer-ba-${timestamp}@e2e.test`,
        password: 'BuyerP@ss123!',
        name: 'Test Buyer',
        firstName: 'Test',
        lastName: 'Buyer',
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

        // 1. Create store owner directly via Prisma
        const owner = await prisma.user.create({
            data: {
                email: ownerUser.email,
                name: ownerUser.name,
                firstName: ownerUser.firstName,
                lastName: ownerUser.lastName,
                password: 'hashed',
            },
        });
        ownerId = owner.id;

        // 2. Create store
        storeSlug = `e2e-buyer-${timestamp}`;
        const store = await prisma.store.create({
            data: {
                name: 'E2E Buyer Store',
                slug: storeSlug,
                subdomain: storeSlug,
                email: 'store@test.com',
                owner: { connect: { id: ownerId } },
                settings: { create: {} },
            },
        });
        storeId = store.id;

        // 3. Register buyer via Better Auth to get session cookie
        const response = await request(app.getHttpServer())
            .post('/api/auth/sign-up/email')
            .send(buyerUser)
            .expect((res) => expect([200, 201]).toContain(res.status));

        const cookies = response.headers['set-cookie'];
        if (cookies) {
            buyerCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;
        }

        const buyer = await prisma.user.findUnique({ where: { email: buyerUser.email } });
        buyerId = buyer?.id || '';
    }, 30000);

    // ─── CLEANUP ────────────────────────────────────────────
    afterAll(async () => {
        if (buyerId) {
            await prisma.buyerAddress.deleteMany({
                where: { profile: { buyerUserId: buyerId } },
            }).catch(() => {});
            await prisma.storeCustomerProfile.deleteMany({
                where: { buyerUserId: buyerId },
            }).catch(() => {});
            await prisma.session.deleteMany({ where: { userId: buyerId } }).catch(() => {});
            await prisma.account.deleteMany({ where: { userId: buyerId } }).catch(() => {});
            await prisma.user.delete({ where: { id: buyerId } }).catch(() => {});
        }
        if (storeId) {
            await prisma.store.delete({ where: { id: storeId } }).catch(() => {});
        }
        if (ownerId) {
            await prisma.user.delete({ where: { id: ownerId } }).catch(() => {});
        }
        await app.close();
    });

    // ─── AUTH REQUIRED ──────────────────────────────────────
    describe('Authentication Required', () => {
        it('GET profile should return 401 without auth', async () => {
            await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/account/profile`)
                .expect(401);
        });

        it('PATCH profile should return 401 without auth', async () => {
            await request(app.getHttpServer())
                .patch(`/api/storefront/${storeSlug}/account/profile`)
                .send({ firstName: 'Hack' })
                .expect(401);
        });

        it('GET addresses should return 401 without auth', async () => {
            await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/account/addresses`)
                .expect(401);
        });

        it('GET orders should return 401 without auth', async () => {
            await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/account/orders`)
                .expect(401);
        });
    });

    // ─── PROFILE ────────────────────────────────────────────
    describe('GET /api/storefront/:slug/account/profile', () => {
        it('should return buyer profile with store stats', async () => {
            if (!buyerCookie) return;

            const response = await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/account/profile`)
                .set('Cookie', buyerCookie)
                .expect(200);

            expect(response.body.email).toBe(buyerUser.email);
            expect(response.body.firstName).toBe(buyerUser.firstName);
            expect(response.body.lastName).toBe(buyerUser.lastName);
            expect(response.body.storeProfile).toBeDefined();
            expect(response.body.storeProfile).toHaveProperty('ordersCount');
            expect(response.body.storeProfile).toHaveProperty('totalSpent');
            expect(response.body.storeProfile).toHaveProperty('memberSince');
        });

        it('should auto-create customer profile on first access', async () => {
            if (!buyerCookie) return;

            // Profile was auto-created by previous test; verify it exists
            const profile = await prisma.storeCustomerProfile.findUnique({
                where: { buyerUserId_storeId: { buyerUserId: buyerId, storeId } },
            });
            expect(profile).toBeTruthy();
        });
    });

    describe('PATCH /api/storefront/:slug/account/profile', () => {
        it('should update buyer firstName', async () => {
            if (!buyerCookie) return;

            const response = await request(app.getHttpServer())
                .patch(`/api/storefront/${storeSlug}/account/profile`)
                .set('Cookie', buyerCookie)
                .send({ firstName: 'Juan' })
                .expect(200);

            expect(response.body.firstName).toBe('Juan');
        });

        it('should update buyer phone', async () => {
            if (!buyerCookie) return;

            const response = await request(app.getHttpServer())
                .patch(`/api/storefront/${storeSlug}/account/profile`)
                .set('Cookie', buyerCookie)
                .send({ phone: '+595991000000' })
                .expect(200);

            expect(response.body.phone).toBe('+595991000000');
        });

        it('should reject firstName shorter than 2 chars', async () => {
            if (!buyerCookie) return;

            const response = await request(app.getHttpServer())
                .patch(`/api/storefront/${storeSlug}/account/profile`)
                .set('Cookie', buyerCookie)
                .send({ firstName: 'X' });

            expect([400, 422]).toContain(response.status);
        });
    });

    // ─── ADDRESSES ──────────────────────────────────────────
    let createdAddressId: string;

    describe('POST /api/storefront/:slug/account/addresses', () => {
        it('should create a new address', async () => {
            if (!buyerCookie) return;

            const addressDto = {
                firstName: 'Juan',
                lastName: 'Pérez',
                address1: 'Av. España 1234',
                city: 'Asunción',
                state: 'Central',
                postalCode: '1234',
                country: 'Paraguay',
                phone: '+595991234567',
                isDefault: true,
            };

            const response = await request(app.getHttpServer())
                .post(`/api/storefront/${storeSlug}/account/addresses`)
                .set('Cookie', buyerCookie)
                .send(addressDto)
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.city).toBe('Asunción');
            expect(response.body.isDefault).toBe(true);
            createdAddressId = response.body.id;
        });

        it('should reject address without required fields', async () => {
            if (!buyerCookie) return;

            const response = await request(app.getHttpServer())
                .post(`/api/storefront/${storeSlug}/account/addresses`)
                .set('Cookie', buyerCookie)
                .send({ city: 'Asunción' });

            expect([400, 422]).toContain(response.status);
        });
    });

    describe('GET /api/storefront/:slug/account/addresses', () => {
        it('should list buyer addresses', async () => {
            if (!buyerCookie) return;

            const response = await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/account/addresses`)
                .set('Cookie', buyerCookie)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
    });

    describe('PATCH /api/storefront/:slug/account/addresses/:id', () => {
        it('should update an existing address', async () => {
            if (!buyerCookie || !createdAddressId) return;

            const response = await request(app.getHttpServer())
                .patch(`/api/storefront/${storeSlug}/account/addresses/${createdAddressId}`)
                .set('Cookie', buyerCookie)
                .send({ city: 'Encarnación' })
                .expect(200);

            expect(response.body.city).toBe('Encarnación');
        });

        it('should return 404 for nonexistent address', async () => {
            if (!buyerCookie) return;

            await request(app.getHttpServer())
                .patch(`/api/storefront/${storeSlug}/account/addresses/nonexistent-id`)
                .set('Cookie', buyerCookie)
                .send({ city: 'X' })
                .expect(404);
        });
    });

    describe('DELETE /api/storefront/:slug/account/addresses/:id', () => {
        it('should delete an existing address', async () => {
            if (!buyerCookie || !createdAddressId) return;

            const response = await request(app.getHttpServer())
                .delete(`/api/storefront/${storeSlug}/account/addresses/${createdAddressId}`)
                .set('Cookie', buyerCookie)
                .expect(200);

            expect(response.body.message).toBe('Dirección eliminada');
        });

        it('should return 404 for already deleted address', async () => {
            if (!buyerCookie || !createdAddressId) return;

            await request(app.getHttpServer())
                .delete(`/api/storefront/${storeSlug}/account/addresses/${createdAddressId}`)
                .set('Cookie', buyerCookie)
                .expect(404);
        });
    });

    // ─── ORDERS ─────────────────────────────────────────────
    describe('GET /api/storefront/:slug/account/orders', () => {
        it('should return empty orders list for new buyer', async () => {
            if (!buyerCookie) return;

            const response = await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/account/orders`)
                .set('Cookie', buyerCookie)
                .expect(200);

            expect(response.body.orders).toBeDefined();
            expect(Array.isArray(response.body.orders)).toBe(true);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination).toHaveProperty('page');
            expect(response.body.pagination).toHaveProperty('total');
            expect(response.body.pagination).toHaveProperty('totalPages');
        });

        it('should support pagination params', async () => {
            if (!buyerCookie) return;

            const response = await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/account/orders?page=1&limit=5`)
                .set('Cookie', buyerCookie)
                .expect(200);

            expect(response.body.pagination.limit).toBe(5);
        });
    });

    describe('GET /api/storefront/:slug/account/orders/:id', () => {
        it('should return 404 for nonexistent order', async () => {
            if (!buyerCookie) return;

            await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/account/orders/nonexistent-id`)
                .set('Cookie', buyerCookie)
                .expect(404);
        });
    });

    // ─── INVALID STORE SLUG ─────────────────────────────────
    describe('Invalid Store Slug', () => {
        it('should return 500/404 for nonexistent store slug', async () => {
            if (!buyerCookie) return;

            const response = await request(app.getHttpServer())
                .get(`/api/storefront/nonexistent-store-${timestamp}/account/profile`)
                .set('Cookie', buyerCookie);

            expect([404, 500]).toContain(response.status);
        });
    });
});
