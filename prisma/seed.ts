import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // ============================================================
    // 0. CLEANUP (Delete all data to start fresh)
    // ============================================================
    console.log('🧹 Cleaning up database...');
    // Delete in order to avoid foreign key constraints
    await prisma.orderItem.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.flashSaleItem.deleteMany({});
    await prisma.wishlistItem.deleteMany({});
    await prisma.review.deleteMany({});

    await prisma.productVariant.deleteMany({});
    await prisma.productOptionValue.deleteMany({});
    await prisma.productOption.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.product.deleteMany({});

    await prisma.category.deleteMany({});
    await prisma.banner.deleteMany({});
    await prisma.testimonial.deleteMany({});
    await prisma.storeSettings.deleteMany({});
    await prisma.storeMember.deleteMany({});
    await prisma.storeInvitation.deleteMany({});
    await prisma.storeCustomerProfile.deleteMany({});
    await prisma.buyerAddress.deleteMany({});

    await prisma.customerAddress.deleteMany({});
    await prisma.customer.deleteMany({});

    await prisma.subscription.deleteMany({});
    await prisma.invoice.deleteMany({});

    // Delete Stores first (they depend on Users/Owners)
    await prisma.store.deleteMany({});

    // Delete Better Auth data
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.verification.deleteMany({});

    // Finally delete Users
    await prisma.user.deleteMany({});
    console.log('✨ Database cleaned');

    // ============================================================
    // 1. CREATE USERS
    // ============================================================
    console.log('👤 Creating users...');

    const { betterAuth } = await import('better-auth');
    const { prismaAdapter } = await import('better-auth/adapters/prisma');

    const auth = betterAuth({
        database: prismaAdapter(prisma, {
            provider: 'postgresql',
        }),
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
            minPasswordLength: 8,
        },
        user: {
            additionalFields: {
                firstName: { type: 'string', required: true },
                lastName: { type: 'string', required: true },
                phone: { type: 'string', required: false },
                avatar: { type: 'string', required: false },
                globalRole: { type: 'string', required: false, defaultValue: 'USER' },
            },
        },
        secret: process.env.BETTER_AUTH_SECRET || 'secret123',
    });

    // 1.1 Tech Store Owner
    console.log('   Creating Tech Owner...');
    // Minimal payload to avoid validation errors
    const techRes = await auth.api.signUpEmail({
        body: {
            email: 'electronics@demo.com',
            password: 'password123',
            name: 'Tech Store Owner',
            firstName: 'Tech',
            lastName: 'Store Owner',
        } as any,
        asResponse: false
    });

    let electronicOwner = techRes.user as any;

    // Update with full profile
    await prisma.user.update({
        where: { id: electronicOwner.id },
        data: {
            globalRole: 'USER',
            emailVerified: true,
            phone: '+1234567890',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech'
        }
    });

    // 1.2 Fashion Store Owner
    console.log('   Creating Fashion Owner...');
    const fashionRes = await auth.api.signUpEmail({
        body: {
            email: 'fashion@demo.com',
            password: 'password123',
            name: 'Fashion Boutique Owner',
            firstName: 'Fashion',
            lastName: 'Boutique Owner',
        } as any,
        asResponse: false
    });

    let fashionOwner = fashionRes.user as any;

    await prisma.user.update({
        where: { id: fashionOwner.id },
        data: {
            globalRole: 'USER',
            emailVerified: true,
            phone: '+0987654321',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fashion'
        }
    });

    console.log('✅ Users created');

    // ============================================================
    // 2. CREATE ELECTRONICS STORE
    // ============================================================
    console.log('🏪 Creating Electronics Store...');

    const electronicsStore = await prisma.store.create({
        data: {
            name: 'Tech Galaxy',
            slug: 'tech-galaxy',
            subdomain: 'tech-galaxy',
            description: 'Tu destino para la mejor tecnología y gadgets',
            email: 'contact@tech-galaxy.com',
            ownerId: electronicOwner.id,
            logo: 'https://res.cloudinary.com/demo/image/upload/v1/tech-logo.png',
            primaryColor: '#3B82F6',
        },
    });

    // Settings
    await prisma.storeSettings.create({
        data: {
            storeId: electronicsStore.id,
            enableHeroSlider: true,
            enableCategoryGrid: true,
            enableFlashSales: true,
            enableNewArrivals: true,
            enableTestimonials: true,
            enableNewsletter: true,
            primaryColorCustom: '#3B82F6',
        },
    });

    const electronicsCategories = await Promise.all([
        prisma.category.create({
            data: {
                name: 'Smartphones',
                slug: 'smartphones',
                storeId: electronicsStore.id,
                description: 'Los últimos modelos de smartphones',
                image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Laptops',
                slug: 'laptops',
                storeId: electronicsStore.id,
                description: 'Laptops de alto rendimiento',
                image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Audio',
                slug: 'audio',
                storeId: electronicsStore.id,
                description: 'Auriculares y altavoces premium',
                image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Gaming',
                slug: 'gaming',
                storeId: electronicsStore.id,
                description: 'Accesorios para gamers',
                image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400',
                isActive: true,
            },
        }),
    ]);

    // Electronics Products
    const electronicsProducts = [];

    // Smartphones
    for (let i = 1; i <= 5; i++) {
        const product = await prisma.product.create({
            data: {
                name: `Smartphone Pro ${i}`,
                slug: `smartphone-pro-${i}`,
                description: `Smartphone de última generación con cámara de 108MP, pantalla AMOLED de 6.7", procesador octa-core y 5G.`,
                price: 599.99 + (i * 100),
                compareAtPrice: 799.99 + (i * 100),
                stock: 50 - (i * 5),
                sku: `PHONE-${i}`,
                storeId: electronicsStore.id,
                categoryId: electronicsCategories[0].id,
                status: 'ACTIVE',
                isFeatured: i <= 2,
                images: {
                    create: [
                        {
                            url: `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80`,
                            altText: `Smartphone Pro ${i}`,
                            position: 0,
                        },
                    ],
                },
            },
        });
        electronicsProducts.push(product);
    }

    // Laptops
    for (let i = 1; i <= 4; i++) {
        const product = await prisma.product.create({
            data: {
                name: `Gaming Laptop ${i}`,
                slug: `gaming-laptop-${i}`,
                description: `Laptop gaming con RTX 4070, Intel i7, 32GB RAM, SSD 1TB. Perfecta para gaming y edición profesional.`,
                price: 1299.99 + (i * 200),
                compareAtPrice: 1599.99 + (i * 200),
                stock: 20 - (i * 2),
                sku: `LAPTOP-${i}`,
                storeId: electronicsStore.id,
                categoryId: electronicsCategories[1].id,
                status: 'ACTIVE',
                isFeatured: i === 1,
                images: {
                    create: [
                        {
                            url: `https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80`,
                            altText: `Gaming Laptop ${i}`,
                            position: 0,
                        },
                    ],
                },
            },
        });
        electronicsProducts.push(product);
    }

    // Audio
    for (let i = 1; i <= 6; i++) {
        const product = await prisma.product.create({
            data: {
                name: `Wireless Headphones ${i}`,
                slug: `wireless-headphones-${i}`,
                description: `Auriculares inalámbricos con cancelación de ruido activa, 30h de batería, audio Hi-Res.`,
                price: 149.99 + (i * 50),
                compareAtPrice: 199.99 + (i * 50),
                stock: 100 - (i * 10),
                sku: `AUDIO-${i}`,
                storeId: electronicsStore.id,
                categoryId: electronicsCategories[2].id,
                status: 'ACTIVE',
                isFeatured: i <= 3,
                images: {
                    create: [
                        {
                            url: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80`,
                            altText: `Wireless Headphones ${i}`,
                            position: 0,
                        },
                    ],
                },
            },
        });
        electronicsProducts.push(product);
    }

    // Gaming
    for (let i = 1; i <= 5; i++) {
        const product = await prisma.product.create({
            data: {
                name: `Mechanical Keyboard RGB ${i}`,
                slug: `mechanical-keyboard-${i}`,
                description: `Teclado mecánico gaming con switches Cherry MX, RGB personalizable, anti-ghosting.`,
                price: 89.99 + (i * 20),
                compareAtPrice: 129.99 + (i * 20),
                stock: 75 - (i * 8),
                sku: `GAMING-${i}`,
                storeId: electronicsStore.id,
                categoryId: electronicsCategories[3].id,
                status: 'ACTIVE',
                isFeatured: i <= 2,
                images: {
                    create: [
                        {
                            url: `https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80`,
                            altText: `Mechanical Keyboard ${i}`,
                            position: 0,
                        },
                    ],
                },
            },
        });
        electronicsProducts.push(product);
    }

    // Electronics Banners
    await prisma.banner.createMany({
        data: [
            {
                storeId: electronicsStore.id,
                title: 'Nueva Colección Gaming 2026',
                subtitle: 'Hasta 40% OFF',
                description: 'Teclados mecánicos, mouse y auriculares de las mejores marcas',
                imageDesktop: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1920&q=80',
                imageMobile: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&q=80',
                ctaText: 'Ver Ofertas',
                ctaLink: '/store/tech-galaxy/products?category=gaming',
                backgroundType: 'gradient',
                gradientColor1: '#1E3A8A',
                gradientColor2: '#3B82F6',
                gradientAngle: 135,
                isActive: true,
                order: 0,
            },
            {
                storeId: electronicsStore.id,
                title: 'Smartphones 5G',
                subtitle: 'Tecnología de Vanguardia',
                description: 'Los últimos modelos con conectividad 5G',
                imageDesktop: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1920&q=80',
                imageMobile: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
                ctaText: 'Descubrir',
                ctaLink: '/store/tech-galaxy/products?category=smartphones',
                backgroundType: 'gradient',
                gradientColor1: '#7C3AED',
                gradientColor2: '#EC4899',
                gradientAngle: 90,
                isActive: true,
                order: 1,
            },
        ],
    });

    // Electronics Testimonials
    await prisma.testimonial.createMany({
        data: [
            {
                storeId: electronicsStore.id,
                customerName: 'Carlos Rodríguez',
                rating: 5,
                comment: 'Excelente servicio y productos de calidad. Mi laptop gaming llegó en perfectas condiciones.',
                isApproved: true,
                isFeatured: true,
            },
            {
                storeId: electronicsStore.id,
                customerName: 'María González',
                rating: 5,
                comment: 'Los auriculares tienen un sonido increíble. Totalmente recomendado.',
                isApproved: true,
                isFeatured: true,
            },
            {
                storeId: electronicsStore.id,
                customerName: 'Juan Pérez',
                rating: 4,
                comment: 'Buena relación calidad-precio. El teclado mecánico es una maravilla.',
                isApproved: true,
                isFeatured: true,
            },
        ],
    });

    console.log('✅ Electronics Store created');

    // ============================================================
    // 3. CREATE FASHION STORE
    // ============================================================
    console.log('👗 Creating Fashion Store...');

    const fashionStore = await prisma.store.create({
        data: {
            name: 'Fashion Boutique',
            slug: 'fashion-boutique',
            subdomain: 'fashion-boutique',
            description: 'Moda exclusiva y tendencias de temporada',
            email: 'contact@fashion-boutique.com',
            ownerId: fashionOwner.id,
            logo: 'https://res.cloudinary.com/demo/image/upload/v1/fashion-logo.png',
            primaryColor: '#EC4899',
        },
    });

    // Settings
    await prisma.storeSettings.create({
        data: {
            storeId: fashionStore.id,
            enableHeroSlider: true,
            enableCategoryGrid: true,
            enableFlashSales: true,
            enableNewArrivals: true,
            enableTestimonials: true,
            enableNewsletter: true,
            primaryColorCustom: '#EC4899',
        },
    });

    const fashionCategories = await Promise.all([
        prisma.category.create({
            data: {
                name: 'Vestidos',
                slug: 'vestidos',
                storeId: fashionStore.id,
                description: 'Vestidos elegantes para toda ocasión',
                image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Zapatos',
                slug: 'zapatos',
                storeId: fashionStore.id,
                description: 'Calzado de moda y confort',
                image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Accesorios',
                slug: 'accesorios',
                storeId: fashionStore.id,
                description: 'Bolsos, joyas y más',
                image: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=400',
                isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: 'Ropa Casual',
                slug: 'ropa-casual',
                storeId: fashionStore.id,
                description: 'Estilo urbano y cómodo',
                image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
                isActive: true,
            },
        }),
    ]);

    // Fashion Products
    const fashionProducts = [];

    // Vestidos
    for (let i = 1; i <= 6; i++) {
        const product = await prisma.product.create({
            data: {
                name: `Vestido Elegante ${i}`,
                slug: `vestido-elegante-${i}`,
                description: `Vestido de diseño exclusivo, perfecto para eventos especiales. Tela premium y corte moderno.`,
                price: 79.99 + (i * 15),
                compareAtPrice: 119.99 + (i * 15),
                stock: 30 - (i * 3),
                sku: `DRESS-${i}`,
                storeId: fashionStore.id,
                categoryId: fashionCategories[0].id,
                status: 'ACTIVE',
                isFeatured: i <= 3,
                images: {
                    create: [
                        {
                            url: `https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80`,
                            altText: `Vestido Elegante ${i}`,
                            position: 0,
                        },
                    ],
                },
            },
        });
        fashionProducts.push(product);
    }

    // Zapatos
    for (let i = 1; i <= 5; i++) {
        const product = await prisma.product.create({
            data: {
                name: `Zapatos de Tacón ${i}`,
                slug: `zapatos-talon-${i}`,
                description: `Zapatos de tacón alto con diseño italiano. Comodidad y estilo en cada paso.`,
                price: 89.99 + (i * 20),
                compareAtPrice: 129.99 + (i * 20),
                stock: 40 - (i * 4),
                sku: `SHOES-${i}`,
                storeId: fashionStore.id,
                categoryId: fashionCategories[1].id,
                status: 'ACTIVE',
                isFeatured: i <= 2,
                images: {
                    create: [
                        {
                            url: `https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80`,
                            altText: `Zapatos de Tacón ${i}`,
                            position: 0,
                        },
                    ],
                },
            },
        });
        fashionProducts.push(product);
    }

    // Accesorios
    for (let i = 1; i <= 7; i++) {
        const product = await prisma.product.create({
            data: {
                name: `Bolso de Mano ${i}`,
                slug: `bolso-mano-${i}`,
                description: `Bolso de cuero genuino con diseño minimalista. Ideal para el día a día.`,
                price: 59.99 + (i * 10),
                compareAtPrice: 89.99 + (i * 10),
                stock: 60 - (i * 5),
                sku: `BAG-${i}`,
                storeId: fashionStore.id,
                categoryId: fashionCategories[2].id,
                status: 'ACTIVE',
                isFeatured: i <= 3,
                images: {
                    create: [
                        {
                            url: `https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80`,
                            altText: `Bolso de Mano ${i}`,
                            position: 0,
                        },
                    ],
                },
            },
        });
        fashionProducts.push(product);
    }

    // Ropa Casual
    for (let i = 1; i <= 6; i++) {
        const product = await prisma.product.create({
            data: {
                name: `Camiseta Casual ${i}`,
                slug: `camiseta-casual-${i}`,
                description: `Camiseta de algodón 100% con diseño urbano. Comodidad y estilo.`,
                price: 29.99 + (i * 5),
                compareAtPrice: 49.99 + (i * 5),
                stock: 100 - (i * 8),
                sku: `TSHIRT-${i}`,
                storeId: fashionStore.id,
                categoryId: fashionCategories[3].id,
                status: 'ACTIVE',
                isFeatured: i <= 2,
                images: {
                    create: [
                        {
                            url: `https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80`,
                            altText: `Camiseta Casual ${i}`,
                            position: 0,
                        },
                    ],
                },
            },
        });
        fashionProducts.push(product);
    }

    // Fashion Banners
    await prisma.banner.createMany({
        data: [
            {
                storeId: fashionStore.id,
                title: 'Colección Primavera 2026',
                subtitle: 'Nueva Temporada',
                description: 'Descubre las últimas tendencias en moda',
                imageDesktop: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80',
                imageMobile: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
                ctaText: 'Ver Colección',
                ctaLink: '/store/fashion-boutique/products',
                backgroundType: 'gradient',
                gradientColor1: '#EC4899',
                gradientColor2: '#F59E0B',
                gradientAngle: 135,
                isActive: true,
                order: 0,
            },
            {
                storeId: fashionStore.id,
                title: 'Zapatos de Diseño',
                subtitle: 'Hasta 50% OFF',
                description: 'Elegancia y confort en cada paso',
                imageDesktop: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1920&q=80',
                imageMobile: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80',
                ctaText: 'Comprar Ahora',
                ctaLink: '/store/fashion-boutique/products?category=zapatos',
                backgroundType: 'gradient',
                gradientColor1: '#8B5CF6',
                gradientColor2: '#EC4899',
                gradientAngle: 90,
                isActive: true,
                order: 1,
            },
        ],
    });

    // Fashion Testimonials
    await prisma.testimonial.createMany({
        data: [
            {
                storeId: fashionStore.id,
                customerName: 'Ana Martínez',
                rating: 5,
                comment: 'Los vestidos son hermosos y de excelente calidad. Volveré a comprar sin duda.',
                isApproved: true,
                isFeatured: true,
            },
            {
                storeId: fashionStore.id,
                customerName: 'Laura Sánchez',
                rating: 5,
                comment: 'Me encantaron los zapatos. Son súper cómodos y elegantes.',
                isApproved: true,
                isFeatured: true,
            },
            {
                storeId: fashionStore.id,
                customerName: 'Sofia Torres',
                rating: 4,
                comment: 'Buena variedad de accesorios. El bolso que compré es perfecto.',
                isApproved: true,
                isFeatured: true,
            },
        ],
    });

    console.log('✅ Fashion Store created');

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - 2 Users created`);
    console.log(`   - 2 Stores created (Tech Galaxy & Fashion Boutique)`);
    console.log(`   - ${electronicsCategories.length + fashionCategories.length} Categories created`);
    console.log(`   - ${electronicsProducts.length + fashionProducts.length} Products created`);
    console.log('\n🔐 Login credentials:');
    console.log('   Electronics Store: electronics@demo.com / password123');
    console.log('   Fashion Store: fashion@demo.com / password123');
    console.log('\n🌐 Store URLs:');
    console.log('   Tech Galaxy: http://localhost:3000/store/tech-galaxy');
    console.log('   Fashion Boutique: http://localhost:3000/store/fashion-boutique');
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
