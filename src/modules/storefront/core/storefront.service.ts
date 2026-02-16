import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { FeaturedProductResult } from './interfaces/featured-product.interface';

@Injectable()
export class StorefrontService {
    private readonly logger = new Logger(StorefrontService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getStoreBySlug(slug: string) {
        const store = await this.prisma.store.findUnique({
            where: { slug },
        });
        if (!store || store.status !== 'ACTIVE') {
            throw new NotFoundException('Tienda no encontrada');
        }
        return store;
    }

    async getCategories(storeId: string) {
        return this.prisma.category.findMany({
            where: { storeId, isActive: true, deletedAt: null, parentId: null },
        });
    }

    async getProducts(storeId: string, categorySlug?: string, page?: any, limit?: any) {
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 20;

        this.logger.debug(`getProducts: storeId=${storeId}, category=${categorySlug}, page=${pageNum}, limit=${limitNum}`);

        try {
            // Build where clause
            const whereClause: any = {
                storeId,
                deletedAt: null,
                status: 'ACTIVE', // Solo productos activos en storefront
            };

            // Si hay categorySlug, buscar la categoría y filtrar por categoryId
            if (categorySlug) {
                const category = await this.prisma.category.findFirst({
                    where: { storeId, slug: categorySlug, isActive: true },
                });

                if (category) {
                    whereClause.categoryId = category.id;
                    this.logger.debug(`Filtering by category: ${category.name} (${category.id})`);
                } else {
                    this.logger.debug(`Category not found: ${categorySlug}`);
                    // Si la categoría no existe, retornar vacío
                    return {
                        data: [],
                        meta: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
                    };
                }
            }

            // Contar total para paginación
            const total = await this.prisma.product.count({ where: whereClause });

            const products = await this.prisma.product.findMany({
                where: whereClause,
                include: {
                    category: true,
                    images: { take: 1, orderBy: { position: 'asc' } },
                },
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
            });

            this.logger.debug(`Found ${products.length} of ${total} products`);

            return {
                data: products,
                meta: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            };
        } catch (error) {
            this.logger.error(`Error in getProducts: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getProductBySlug(storeId: string, productSlug: string) {
        const product = await this.prisma.product.findFirst({
            where: { storeId, slug: productSlug, deletedAt: null },
        });
        if (!product) throw new NotFoundException('Producto no encontrado');
        return product;
    }



    async getNewArrivals(storeId: string, limit = 8) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Step 1: Products < 7 days (NEW)
        let products = await this.prisma.product.findMany({
            where: {
                storeId,
                deletedAt: null,
                status: 'ACTIVE',
                createdAt: { gte: sevenDaysAgo }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { images: { take: 1, select: { url: true } } }
        });

        // Step 2: If not enough, add products from 8-14 days (RECENT)
        if (products.length < limit) {
            const recentProducts = await this.prisma.product.findMany({
                where: {
                    storeId,
                    deletedAt: null,
                    status: 'ACTIVE',
                    createdAt: {
                        gte: fourteenDaysAgo,
                        lt: sevenDaysAgo
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit - products.length,
                include: { images: { take: 1, select: { url: true } } }
            });
            products = [...products, ...recentProducts];
        }

        // Step 3: If still not enough, add products from 15-30 days (OLDER)
        if (products.length < limit) {
            const olderProducts = await this.prisma.product.findMany({
                where: {
                    storeId,
                    deletedAt: null,
                    status: 'ACTIVE',
                    createdAt: {
                        gte: thirtyDaysAgo,
                        lt: fourteenDaysAgo
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit - products.length,
                include: { images: { take: 1, select: { url: true } } }
            });
            products = [...products, ...olderProducts];
        }

        // Add freshness metadata to each product
        return products.map(product => {
            const daysAgo = Math.floor(
                (now.getTime() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );

            let freshnessLevel: 'new' | 'recent' | 'older';
            if (daysAgo <= 7) freshnessLevel = 'new';
            else if (daysAgo <= 14) freshnessLevel = 'recent';
            else freshnessLevel = 'older';

            return {
                ...product,
                freshnessLevel,
                daysAgo
            };
        });
    }

    /**
     * Obtener productos exclusivos/edición limitada
     * Solo productos con stock > 0 y status ACTIVE
     * Ordenados por stock ascendente (más urgente primero)
     */
    async getExclusiveProducts(storeId: string, limit = 6) {
        return this.prisma.product.findMany({
            where: {
                storeId,
                isExclusive: true,
                deletedAt: null,
                status: 'ACTIVE',
                stock: { gt: 0 }
            },
            take: limit,
            include: {
                images: { take: 1, select: { url: true } },
                category: true,
            },
            orderBy: { stock: 'asc' } // Menos stock = más urgente
        });
    }

    // ============================================================
    // STOREFRONT FEATURES - PUBLIC METHODS
    // ============================================================

    /**
     * Obtener benefits activos de una tienda
     */
    async getActiveBenefits(storeId: string) {
        return this.prisma.storeBenefit.findMany({
            where: { storeId, isActive: true },
            orderBy: { order: 'asc' },
            select: {
                id: true,
                icon: true,
                title: true,
                description: true,
                order: true,
            },
        });
    }

    /**
     * Obtener settings públicos del storefront (solo lo necesario para el frontend)
     */
    async getPublicSettings(storeId: string) {
        const settings = await this.prisma.storeSettings.findUnique({
            where: { storeId },
            select: {
                enableHeroSlider: true,
                enableCategoryGrid: true,
                enableFlashSales: true,
                enableTestimonials: true,
                enableNewsletter: true,
                enableRecentlyViewed: true,
                enableWishlist: true,
                enableNewArrivals: true,
                enableTopRated: true,
                freeShippingThreshold: true,
                requireLoginForCheckout: true,
                primaryColorCustom: true,
                accentColorCustom: true,
            },
        });

        if (!settings) {
            // Return defaults if no settings exist
            return {
                enableHeroSlider: true,
                enableCategoryGrid: true,
                enableFlashSales: true,
                enableTestimonials: true,
                enableNewsletter: true,
                enableRecentlyViewed: true,
                enableWishlist: true,
                enableNewArrivals: true,
                enableTopRated: true,
                freeShippingThreshold: null,
                requireLoginForCheckout: true,
                primaryColorCustom: null,
                accentColorCustom: null,
            };
        }

        return settings;
    }

    /**
     * Obtener banners activos
     */
    async getActiveBanners(storeId: string) {
        try {
            this.logger.debug(`Fetching banners for store: ${storeId}`);
            return await this.prisma.banner.findMany({
                where: { storeId, isActive: true },
                orderBy: { order: 'asc' },
                select: {
                    id: true,
                    title: true,
                    subtitle: true,
                    description: true,
                    imageDesktop: true,
                    imageMobile: true,
                    ctaText: true,
                    ctaLink: true,
                    order: true,

                    // ⭐ Background Config
                    backgroundType: true,
                    backgroundColor: true,
                    gradientColor1: true,
                    gradientColor2: true,
                    gradientAngle: true,
                    gradientType: true,
                    backgroundImage: true,
                    backgroundOpacity: true,
                    backgroundOverlay: true,
                    backgroundSize: true,
                    videoUrl: true,
                    videoOpacity: true,
                    videoOverlay: true,
                    videoMuted: true,
                    fallbackColor: true,
                },
            });
        } catch (error) {
            this.logger.error(`Error getting banners: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Obtener flash sales activos (en curso)
     */
    async getActiveFlashSales(storeId: string) {
        const now = new Date();

        return this.prisma.flashSale.findMany({
            where: {
                storeId,
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                price: true,
                                images: { take: 1, select: { url: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    }

    /**
     * Obtener testimonios destacados
     */
    async getFeaturedTestimonials(storeId: string) {
        return this.prisma.testimonial.findMany({
            where: {
                storeId,
                isFeatured: true,
                isApproved: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 6,
            select: {
                id: true,
                customerName: true,
                customerAvatar: true,
                rating: true,
                comment: true,
                product: {
                    select: { name: true, slug: true },
                },
            },
        });
    }

    async getTrendingProducts(storeId: string, limit = 8) {
        // 1. Get top selling products by grouping order items
        const trending = await this.prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
                order: {
                    storeId,
                    status: { not: 'CANCELLED' } // Don't count cancelled orders
                }
            },
            _sum: { quantity: true },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: limit,
        });

        if (!trending || trending.length === 0) {
            return [];
        }

        // 2. Fetch full product details
        const productIds = trending.map(t => t.productId);
        const products = await this.prisma.product.findMany({
            where: {
                id: { in: productIds },
                deletedAt: null,
                status: 'ACTIVE' // Only active products
            },
            include: {
                images: {
                    take: 1,
                    select: { url: true }
                }
            }
        });

        // 3. Sort results to match trending order (findMany doesn't preserve input array order)
        return products.sort((a, b) => {
            const qtyA = trending.find(t => t.productId === a.id)?._sum?.quantity || 0;
            const qtyB = trending.find(t => t.productId === b.id)?._sum?.quantity || 0;
            return qtyB - qtyA;
        });
    }
}


