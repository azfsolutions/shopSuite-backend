/*
  Warnings:

  - A unique constraint covering the columns `[storeId,productId]` on the table `featured_products` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "featured_products_productId_key";

-- CreateIndex
CREATE UNIQUE INDEX "featured_products_storeId_productId_key" ON "featured_products"("storeId", "productId");
