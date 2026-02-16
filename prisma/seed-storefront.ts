import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seed Storefront PRO MAX - Starting...\n');

    // Password hash (password: "pro123")
    const passwordHash = await bcrypt.hash('pro123', 10);

    // ========================================
    // USER: Pro Store Owner
    // ========================================
    const userEmail = 'owner@modernstore.com';
    console.log(`👤 Creating/Updating User: ${userEmail}...`);
    const user = await prisma.user.upsert({
        where: { email: userEmail },
        update: {},
        create: {
            email: userEmail,
            password: passwordHash,
            name: 'Alex Design',
            firstName: 'Alex',
            lastName: 'Design',
            emailVerified: true,
        },
    });

    // ========================================
    // STORE: Modern Tech & Living
    // ========================================
    const storeSlug = 'modern-tech-living';
    console.log(`🏪 Creating Store: Modern Tech & Living (${storeSlug})...`);

    // First check if exists, if so delete to start fresh regarding products/settings for clean demo
    const existingStore = await prisma.store.findUnique({ where: { slug: storeSlug } });
    if (existingStore) {
        console.log('   Removing existing store for clean slate...');
        await prisma.store.delete({ where: { id: existingStore.id } });
    }

    const store = await prisma.store.create({
        data: {
            name: 'Modern Tech & Living',
            slug: storeSlug,
            email: userEmail,
            subdomain: 'modern',
            description: 'Lifestyle technology and premium home accessories.',
            ownerId: user.id,
            // Create default settings immediately
            settings: {
                create: {
                    enableHeroSlider: true,
                    enableCategoryGrid: true,
                    enableFlashSales: true,
                    enableNewArrivals: true,
                    enableTestimonials: true,
                    primaryColorCustom: '#10b981', // Emerald 500
                    accentColorCustom: '#f59e0b',  // Amber 500
                }
            }
        },
    });

    await prisma.storeMember.create({
        data: { userId: user.id, storeId: store.id, role: 'OWNER' },
    });
    console.log(`✓ Store created with ID: ${store.id}\n`);

    // ========================================
    // CATEGORIES
    // ========================================
    console.log('📂 Creating Categories...');
    const catHeadphones = await prisma.category.create({
        data: { name: 'Audio Premium', slug: 'audio-premium', storeId: store.id, description: 'Sonido de alta fidelidad' }
    });
    const catWearables = await prisma.category.create({
        data: { name: 'Wearables', slug: 'wearables', storeId: store.id, description: 'Smartwatches y trackers' }
    });
    const catWorkspace = await prisma.category.create({
        data: { name: 'Workspace', slug: 'workspace', storeId: store.id, description: 'Mejora tu productividad' }
    });
    console.log('✓ Categories created\n');

    // ========================================
    // PRODUCTS (Rich Data)
    // ========================================
    console.log('📦 Creating Products with Images...');

    // 1. Sony Headphones
    await prisma.product.create({
        data: {
            storeId: store.id,
            categoryId: catHeadphones.id,
            name: 'Sony WH-1000XM5 Noise Canceling',
            slug: 'sony-wh-1000xm5',
            description: 'Industry-leading noise cancellation, crystal clear hands-free calling, and 30-hour battery life.',
            price: 349.99,
            compareAtPrice: 399.99, // On sale
            stock: 45,
            images: {
                create: [
                    { url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1000&auto=format&fit=crop', position: 0 },
                    { url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=1000&auto=format&fit=crop', position: 1 }
                ]
            }
        }
    });

    // 2. AirPods Max
    await prisma.product.create({
        data: {
            storeId: store.id,
            categoryId: catHeadphones.id,
            name: 'Apple AirPods Max',
            slug: 'apple-airpods-max',
            description: 'A perfect balance of exhilarating high-fidelity audio and the effortless magic of AirPods.',
            price: 549.00,
            stock: 12,
            images: {
                create: [
                    { url: 'https://images.unsplash.com/photo-1628202926206-c63a34b1618f?q=80&w=1000&auto=format&fit=crop', position: 0 }
                ]
            }
        }
    });

    // 3. Smart Watch
    await prisma.product.create({
        data: {
            storeId: store.id,
            categoryId: catWearables.id,
            name: 'Apex Pro Titanium Watch',
            slug: 'apex-pro-watch',
            description: 'Rugged GPS watch with 30 days battery life and advanced health metrics.',
            price: 499.00,
            compareAtPrice: 699.00, // Big sale
            stock: 8,
            images: {
                create: [
                    { url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=1000&auto=format&fit=crop', position: 0 }
                ]
            }
        }
    });

    // 4. Keyboard
    await prisma.product.create({
        data: {
            storeId: store.id,
            categoryId: catWorkspace.id,
            name: 'Mechanical Keychron K2',
            slug: 'keychron-k2',
            description: 'Wireless mechanical keyboard for Mac and Windows. Compact 75% layout.',
            price: 89.00,
            stock: 100,
            images: {
                create: [
                    { url: 'https://images.unsplash.com/photo-1587829741301-dc798b91add1?q=80&w=1000&auto=format&fit=crop', position: 0 }
                ]
            }
        }
    });

    // 5. Mouse
    await prisma.product.create({
        data: {
            storeId: store.id,
            categoryId: catWorkspace.id,
            name: 'Logitech MX Master 3S',
            slug: 'mx-master-3s',
            description: 'An icon remastered. Quiet clicks and 8K DPI tracking on glass.',
            price: 99.00,
            stock: 50,
            images: {
                create: [
                    { url: 'https://images.unsplash.com/photo-1615663245857-acda5b2b1518?q=80&w=1000&auto=format&fit=crop', position: 0 }
                ]
            }
        }
    });

    // 6. Monitor
    await prisma.product.create({
        data: {
            storeId: store.id,
            categoryId: catWorkspace.id,
            name: 'LG UltraFine 5k Display',
            slug: 'lg-ultrafine-5k',
            description: 'Perfect for creative professionals. 218 PPI, 500 nits brightness.',
            price: 1299.00,
            stock: 5,
            images: {
                create: [
                    { url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1000&auto=format&fit=crop', position: 0 }
                ]
            }
        }
    });

    console.log('✓ Products created successfully\n');

    // ========================================
    // STOREFRONT FEATURES (Benefits & Testimonials)
    // ========================================
    console.log('✨ Creating Storefront Features...');

    // Benefits
    await prisma.storeBenefit.createMany({
        data: [
            {
                storeId: store.id,
                icon: '🚚',
                title: 'Envío Gratis',
                description: 'En todas las órdenes sobre $50',
                order: 0,
                isActive: true
            },
            {
                storeId: store.id,
                icon: '🛡️',
                title: 'Garantía Extendida',
                description: '2 años en electrónicos',
                order: 1,
                isActive: true
            },
            {
                storeId: store.id,
                icon: '💳',
                title: 'Pago Seguro',
                description: 'Encriptación 256-bit SSL',
                order: 2,
                isActive: true
            },
            {
                storeId: store.id,
                icon: '↩️',
                title: 'Devoluciones Fáciles',
                description: '30 días para cambios',
                order: 3,
                isActive: true
            }
        ]
    });

    // Testimonials
    console.log('💬 Creating Testimonials...');
    await prisma.testimonial.createMany({
        data: [
            {
                storeId: store.id,
                customerName: 'Sarah J.',
                customerEmail: 'sarah@example.com',
                rating: 5,
                comment: 'The quality of the products is unmatched. Shipping was super fast!',
                isFeatured: true,
                isApproved: true
            },
            {
                storeId: store.id,
                customerName: 'Mike T.',
                customerEmail: 'mike@example.com',
                rating: 5,
                comment: 'Excellent customer service. They resolved my question in 5 minutes.',
                isFeatured: true,
                isApproved: true
            },
            {
                storeId: store.id,
                customerName: 'Elena R.',
                rating: 4,
                comment: 'Love the minimalist design of the keyboard. Highly recommended.',
                isFeatured: true,
                isApproved: true
            }
        ]
    });
    console.log('========================================');
    console.log('🚀 READY TO LAUNCH');
    console.log(`URL: http://localhost:3000/store/${storeSlug}`);
    console.log('User: owner@modernstore.com / pro123');
    console.log('========================================\n');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding storefront:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
