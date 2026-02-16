import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Stores Module (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let authCookie: string;
    let userId: string;

    const timestamp = Date.now();
    const testUser = {
        email: `store-owner-${timestamp}@test.com`,
        password: 'Password123!',
        name: 'Store Owner',
        firstName: 'Store',
        lastName: 'Owner',
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true }));
        app.setGlobalPrefix('api');
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // 1. Register User to get Session
        const textUserRegister = { ...testUser };
        const response = await request(app.getHttpServer())
            .post('/api/auth/sign-up/email')
            .send(textUserRegister)
            .expect((res) => expect([200, 201]).toContain(res.status)); // Better Auth returns 200/201

        const cookies = response.headers['set-cookie'];
        if (cookies) {
            authCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies;
        }

        // Get userId from DB
        const user = await prisma.user.findUnique({ where: { email: testUser.email } });
        userId = user?.id || '';
    });

    afterAll(async () => {
        // Cleanup stores and user
        if (userId) {
            await prisma.store.deleteMany({ where: { ownerId: userId } });
            await prisma.user.delete({ where: { id: userId } }).catch(console.error);
        }
        await app.close();
    });

    let createdStoreId: string;

    describe('POST /api/stores', () => {
        it('should create a new store', async () => {
            const createDto = {
                name: 'My E2E Store',
                slug: `my-store-${timestamp}`,
                description: 'Test Description',
                email: 'my-store@test.com',
            };

            const response = await request(app.getHttpServer())
                .post('/api/stores')
                .set('Cookie', authCookie)
                .send(createDto)
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe(createDto.name);
            createdStoreId = response.body.id;
        });

        it('should fail without auth', async () => {
            await request(app.getHttpServer())
                .post('/api/stores')
                .send({ name: 'Fail Store', slug: 'fail' })
                .expect(401);
        });
    });

    describe('GET /api/stores', () => {
        it('should list user stores', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/stores')
                .set('Cookie', authCookie)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((s: any) => s.id === createdStoreId)).toBe(true);
        });
    });

    describe('GET /api/stores/:id', () => {
        it('should return store details', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/stores/${createdStoreId}`)
                .set('Cookie', authCookie)
                .expect(200);

            expect(response.body.id).toBe(createdStoreId);
        });
    });

    describe('PATCH /api/stores/:id', () => {
        it('should update store', async () => {
            const updateDto = { description: 'Updated Description' };

            const response = await request(app.getHttpServer())
                .patch(`/api/stores/${createdStoreId}`)
                .set('Cookie', authCookie)
                .send(updateDto)
                .expect(200);

            expect(response.body.description).toBe(updateDto.description);
        });
    });

    // describe('DELETE /api/stores/:id', () => {
    //     it('should soft delete store', async () => {
    //         await request(app.getHttpServer())
    //             .delete(`/api/stores/${createdStoreId}`)
    //             .set('Cookie', authCookie)
    //             .expect(200);

    //         // Verify soft delete
    //         const store = await prisma.store.findUnique({ where: { id: createdStoreId } });
    //         expect(store?.deletedAt).not.toBeNull();
    //     });
    // });
});
