import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Storefront (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    const storeSlug = `e2e-store-${Date.now()}`;
    const productSlug = `e2e-prod-${Date.now()}`;
    let storeId: string;
    let productId: string;
    let categoryId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true }));
        app.setGlobalPrefix('api');
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);

        // Seed data
        // 1. Create Owner User
        const user = await prisma.user.create({
            data: {
                email: `owner-${Date.now()}@test.com`,
                name: 'Store Owner',
                firstName: 'Store',
                lastName: 'Owner',
                password: 'hash', // We don't need to login for storefront public access
            },
        });

        // 2. Create Store
        const store = await prisma.store.create({
            data: {
                name: 'E2E Test Store',
                slug: storeSlug,
                subdomain: storeSlug,
                email: 'store@test.com',
                owner: { connect: { id: user.id } },
                settings: { create: {} },
            },
        });
        storeId = store.id;

        // 3. Create Category
        const category = await prisma.category.create({
            data: {
                name: 'E2E Category',
                slug: `cat-${Date.now()}`,
                store: { connect: { id: store.id } },
                isActive: true,
            },
        });
        categoryId = category.id;

        // 4. Create Product
        const product = await prisma.product.create({
            data: {
                name: 'E2E Product',
                slug: productSlug,
                store: { connect: { id: store.id } },
                category: { connect: { id: category.id } },
                price: 100,
                description: 'Test Description',
                status: 'ACTIVE',
            },
        });
        productId = product.id;

        // 5. Create Product Variant & Options (optional but good for completeness)
        // ...
    });

    afterAll(async () => {
        // Cleanup
        if (storeId) {
            // Delete store (cascades usually, but let's be safe or rely on cascade)
            await prisma.store.delete({ where: { id: storeId } }).catch(e => console.error(e));
        }
        await app.close();
    });

    describe('GET /api/storefront/:slug', () => {
        it('should return store info', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}`)
                .expect(200);

            expect(response.body.id).toBe(storeId);
            expect(response.body.slug).toBe(storeSlug);
        });

        it('should return 404 for nonexistent store', async () => {
            await request(app.getHttpServer())
                .get(`/api/storefront/nonexistent-${Date.now()}`)
                .expect(404);
        });
    });

    describe('GET /api/storefront/:slug/products', () => {
        it('should return products list', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/products`)
                .expect(200);

            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0].slug).toBe(productSlug);
        });

        it('should filter by category', async () => {
            // Fetch category slug first
            const cat = await prisma.category.findUnique({ where: { id: categoryId } });

            const response = await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/products?category=${cat?.slug}`)
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/storefront/:slug/categories', () => {
        it('should return categories', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/categories`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((c: any) => c.id === categoryId)).toBe(true);
        });
    });

    describe('GET /api/storefront/:slug/products/:productSlug', () => {
        it('should return single product details', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/products/${productSlug}`)
                .expect(200);

            expect(response.body.id).toBe(productId);
        });

        it('should return 404 for invalid product', async () => {
            await request(app.getHttpServer())
                .get(`/api/storefront/${storeSlug}/products/missing-prod`)
                .expect(404);
        });
    });
});
