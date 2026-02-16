-- CreateTable
CREATE TABLE "featured_product_configs" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "minSalesForBestseller" INTEGER NOT NULL DEFAULT 100,
    "minRatingForTopRated" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "minReviewsForTopRated" INTEGER NOT NULL DEFAULT 5,
    "maxStockForLimited" INTEGER NOT NULL DEFAULT 10,
    "maxFeaturedProducts" INTEGER NOT NULL DEFAULT 12,
    "enableBestseller" BOOLEAN NOT NULL DEFAULT true,
    "enableTopRated" BOOLEAN NOT NULL DEFAULT true,
    "enableLimited" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_product_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_products" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'curated',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "featured_product_configs_storeId_key" ON "featured_product_configs"("storeId");

-- CreateIndex
CREATE INDEX "featured_product_configs_storeId_idx" ON "featured_product_configs"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "featured_products_productId_key" ON "featured_products"("productId");

-- CreateIndex
CREATE INDEX "featured_products_storeId_position_idx" ON "featured_products"("storeId", "position");

-- AddForeignKey
ALTER TABLE "featured_product_configs" ADD CONSTRAINT "featured_product_configs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
