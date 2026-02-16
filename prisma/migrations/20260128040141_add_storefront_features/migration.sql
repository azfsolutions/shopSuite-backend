-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "accentColorCustom" TEXT,
ADD COLUMN     "enableCategoryGrid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableFlashSales" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableHeroSlider" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableNewArrivals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableNewsletter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableRecentlyViewed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableTestimonials" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableTopRated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableWishlist" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "freeShippingThreshold" DECIMAL(10,2),
ADD COLUMN     "primaryColorCustom" TEXT,
ADD COLUMN     "requireLoginForCheckout" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "store_benefits" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageDesktop" TEXT NOT NULL,
    "imageMobile" TEXT NOT NULL,
    "ctaText" TEXT NOT NULL,
    "ctaLink" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_sales" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flash_sale_items" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discountPercentage" INTEGER NOT NULL,
    "stockLimit" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flash_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerAvatar" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT NOT NULL,
    "productId" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_benefits_storeId_isActive_idx" ON "store_benefits"("storeId", "isActive");

-- CreateIndex
CREATE INDEX "store_benefits_storeId_order_idx" ON "store_benefits"("storeId", "order");

-- CreateIndex
CREATE INDEX "banners_storeId_isActive_idx" ON "banners"("storeId", "isActive");

-- CreateIndex
CREATE INDEX "banners_storeId_order_idx" ON "banners"("storeId", "order");

-- CreateIndex
CREATE INDEX "flash_sales_storeId_isActive_idx" ON "flash_sales"("storeId", "isActive");

-- CreateIndex
CREATE INDEX "flash_sales_startDate_endDate_idx" ON "flash_sales"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "flash_sale_items_flashSaleId_idx" ON "flash_sale_items"("flashSaleId");

-- CreateIndex
CREATE INDEX "flash_sale_items_productId_idx" ON "flash_sale_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "flash_sale_items_flashSaleId_productId_key" ON "flash_sale_items"("flashSaleId", "productId");

-- CreateIndex
CREATE INDEX "testimonials_storeId_isFeatured_isApproved_idx" ON "testimonials"("storeId", "isFeatured", "isApproved");

-- CreateIndex
CREATE INDEX "testimonials_productId_idx" ON "testimonials"("productId");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_storeId_isActive_idx" ON "newsletter_subscribers"("storeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_storeId_email_key" ON "newsletter_subscribers"("storeId", "email");

-- AddForeignKey
ALTER TABLE "store_benefits" ADD CONSTRAINT "store_benefits_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_sales" ADD CONSTRAINT "flash_sales_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_sale_items" ADD CONSTRAINT "flash_sale_items_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "flash_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flash_sale_items" ADD CONSTRAINT "flash_sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
