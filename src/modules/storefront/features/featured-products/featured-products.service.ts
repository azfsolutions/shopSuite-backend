import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { FeaturedProductResult } from '../../core/interfaces/featured-product.interface';

@Injectable()
export class FeaturedProductsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get featured products with automatic detection + manual curation
     * Combines:
     * 1. Manual featured products (via FeaturedProduct table)
     * 2. Automatic featured based on criteria (Bestseller, Top-Rated, Limited Stock)
     */
    async getFeaturedProducts(storeId: string, limit = 12): Promise<FeaturedProductResult[]> {
        // 1. Get or create configuration
        const config = await this.getOrCreateFeaturedConfig(storeId);

        // 2. Get manual featured products (highest priority)
        const manualFeatured = await this.prisma.featuredProduct.findMany({
            where: { storeId },
            include: {
                product: {
                    include: {
                        images: { take: 3, orderBy: { position: 'asc' } },
                        category: { select: { id: true, name: true, slug: true } }
                    }
                }
            },
            orderBy: { position: 'asc' }
        });

        // 3. Get automatic featured products
        const automaticFeatured = await this.getAutomaticFeaturedProducts(storeId, config);

        // 4. Combine and enrich with metadata
        const manualProductsWithMeta: FeaturedProductResult[] = manualFeatured.map((mf, index) => ({
            ...mf.product,
            isHero: index === 0, // First manual product is hero
            featuredReason: mf.reason,
            isManual: true,
            position: mf.position,
        } as unknown as FeaturedProductResult));

        const automaticProductsWithMeta: FeaturedProductResult[] = automaticFeatured.map(p => ({
            ...p,
            isHero: manualProductsWithMeta.length === 0, // First automatic is hero if no manual
            isManual: false,
            position: 999, // Lower priority than manual
        }));

        // 5. Merge: Manual first, then automatic
        let allFeatured = [...manualProductsWithMeta, ...automaticProductsWithMeta];

        // 6. Remove duplicates (if a product is both manual and automatic, keep manual)
        const seen = new Set();
        allFeatured = allFeatured.filter(p => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
        });

        // 7. Set hero on first product
        if (allFeatured.length > 0 && !allFeatured[0].isHero) {
            allFeatured[0].isHero = true;
        }

        // 8. Limit to max configured
        return allFeatured.slice(0, config.maxFeaturedProducts || limit);
    }

    /**
     * Get automatic featured products based on criteria
     */
    private async getAutomaticFeaturedProducts(storeId: string, config: any): Promise<FeaturedProductResult[]> {
        const automaticProducts: FeaturedProductResult[] = [];

        // Bestsellers (high sales)
        if (config.enableBestseller) {
            const bestsellers = await this.prisma.product.findMany({
                where: {
                    storeId,
                    deletedAt: null,
                    status: 'ACTIVE',
                    salesCount: { gte: config.minSalesForBestseller }
                } as any,
                include: {
                    images: { take: 3, orderBy: { position: 'asc' } },
                    category: { select: { id: true, name: true, slug: true } }
                },
                orderBy: { salesCount: 'desc' } as any,
                take: 10
            });
            bestsellers.forEach(p => automaticProducts.push({ ...p, featuredReason: 'bestseller' } as unknown as FeaturedProductResult));
        }

        // Top Rated
        if (config.enableTopRated) {
            const topRated = await this.prisma.product.findMany({
                where: {
                    storeId,
                    deletedAt: null,
                    status: 'ACTIVE',
                    avgRating: { gte: config.minRatingForTopRated },
                    reviewCount: { gte: config.minReviewsForTopRated }
                } as any,
                include: {
                    images: { take: 3, orderBy: { position: 'asc' } },
                    category: { select: { id: true, name: true, slug: true } }
                },
                orderBy: { avgRating: 'desc' } as any,
                take: 10
            });
            topRated.forEach(p => automaticProducts.push({ ...p, featuredReason: 'top-rated' } as unknown as FeaturedProductResult));
        }

        // Limited Stock
        if (config.enableLimited) {
            const limited = await this.prisma.product.findMany({
                where: {
                    storeId,
                    deletedAt: null,
                    status: 'ACTIVE',
                    stock: { lte: config.maxStockForLimited, gt: 0 }
                },
                include: {
                    images: { take: 3, orderBy: { position: 'asc' } },
                    category: { select: { id: true, name: true, slug: true } }
                },
                orderBy: { stock: 'asc' },
                take: 10
            });
            limited.forEach(p => automaticProducts.push({ ...p, featuredReason: 'limited' } as unknown as FeaturedProductResult));
        }

        return automaticProducts;
    }

    /**
     * Get or create featured products configuration for a store
     */
    private async getOrCreateFeaturedConfig(storeId: string) {
        let config = await this.prisma.featuredProductConfig.findUnique({
            where: { storeId }
        });

        if (!config) {
            config = await this.prisma.featuredProductConfig.create({
                data: { storeId }
            });
        }

        return config;
    }

    /**
     * Get featured products configuration
     */
    async getFeaturedConfig(storeId: string) {
        return this.getOrCreateFeaturedConfig(storeId);
    }

    /**
     * Update featured products configuration
     */
    async updateFeaturedConfig(storeId: string, data: any) {
        const config = await this.getOrCreateFeaturedConfig(storeId);
        return this.prisma.featuredProductConfig.update({
            where: { id: config.id },
            data
        });
    }

    /**
     * Get all manual featured products for a store
     */
    async getManualFeaturedProducts(storeId: string) {
        return this.prisma.featuredProduct.findMany({
            where: { storeId },
            include: {
                product: {
                    include: {
                        images: { take: 1, orderBy: { position: 'asc' } }
                    }
                }
            },
            orderBy: { position: 'asc' }
        });
    }

    /**
     * Add a product to manual featured
     */
    async addManualFeaturedProduct(storeId: string, data: any) {
        // Check if product exists and belongs to store
        const product = await this.prisma.product.findFirst({
            where: { id: data.productId, storeId }
        });
        if (!product) throw new NotFoundException('Producto no encontrado');

        // Check if already featured
        const existing = await this.prisma.featuredProduct.findFirst({
            where: {
                storeId,
                productId: data.productId
            }
        });
        if (existing) throw new ConflictException('Producto ya está destacado');

        // Get max position + 1 if no position provided
        if (data.position === undefined) {
            const maxPosition = await this.prisma.featuredProduct.findFirst({
                where: { storeId },
                orderBy: { position: 'desc' }
            });
            data.position = maxPosition ? maxPosition.position + 1 : 0;
        }

        return this.prisma.featuredProduct.create({
            data: {
                storeId,
                productId: data.productId,
                position: data.position || 0,
                reason: data.reason || 'curated',
                isPinned: data.isPinned || false
            },
            include: {
                product: {
                    include: {
                        images: { take: 1, orderBy: { position: 'asc' } }
                    }
                }
            }
        });
    }

    /**
     * Remove a product from manual featured
     */
    async removeManualFeaturedProduct(storeId: string, productId: string) {
        const featured = await this.prisma.featuredProduct.findFirst({
            where: { storeId, productId }
        });
        if (!featured) throw new NotFoundException('Producto destacado no encontrado');

        return this.prisma.featuredProduct.delete({
            where: { id: featured.id }
        });
    }

    /**
     * Update position of a manual featured product
     */
    async updateFeaturedProductPosition(storeId: string, productId: string, newPosition: number) {
        const featured = await this.prisma.featuredProduct.findFirst({
            where: { storeId, productId }
        });
        if (!featured) throw new NotFoundException('Producto destacado no encontrado');

        return this.prisma.featuredProduct.update({
            where: { id: featured.id },
            data: { position: newPosition }
        });
    }
}
