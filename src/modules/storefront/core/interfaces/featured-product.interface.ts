import { Product, ProductImage, Category } from '@prisma/client';

export interface EnrichedProduct extends Product {
    images: ProductImage[];
    category: Partial<Category> | null;
}

export interface FeaturedProductResult extends EnrichedProduct {
    isHero?: boolean;
    featuredReason?: string;
    isManual?: boolean;
    position?: number;
}
