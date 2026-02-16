-- AlterEnum
ALTER TYPE "GlobalRole" ADD VALUE 'BUYER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "store_customer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "acceptsMarketing" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastOrderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_customer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_addresses" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_customer_profiles_userId_idx" ON "store_customer_profiles"("userId");

-- CreateIndex
CREATE INDEX "store_customer_profiles_storeId_idx" ON "store_customer_profiles"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_customer_profiles_userId_storeId_key" ON "store_customer_profiles"("userId", "storeId");

-- CreateIndex
CREATE INDEX "buyer_addresses_profileId_idx" ON "buyer_addresses"("profileId");

-- AddForeignKey
ALTER TABLE "store_customer_profiles" ADD CONSTRAINT "store_customer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_customer_profiles" ADD CONSTRAINT "store_customer_profiles_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_addresses" ADD CONSTRAINT "buyer_addresses_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "store_customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
