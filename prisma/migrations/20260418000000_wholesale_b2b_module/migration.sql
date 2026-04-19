-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'WHOLESALE', 'B2B_VIP');

-- CreateEnum
CREATE TYPE "WholesaleThresholdUnit" AS ENUM ('TOTAL_UNITS', 'UNITS_PER_ORDER', 'ORDER_COUNT');

-- CreateEnum
CREATE TYPE "WholesaleRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WholesaleSenderType" AS ENUM ('MERCHANT', 'BUYER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "B2BQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "B2BOrderStatus" AS ENUM ('AWAITING_CLIENT', 'ACCEPTED', 'PARTIAL_SHIPPED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "B2BPaymentMethod" AS ENUM ('TBD', 'TRANSFER', 'CASH');

-- CreateEnum
CREATE TYPE "StockReservationReason" AS ENUM ('VIP_QUOTE', 'MANUAL_HOLD');

-- CreateEnum
CREATE TYPE "BackorderStatus" AS ENUM ('PENDING', 'PARTIAL_FULFILLED', 'FULFILLED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'DEPOSIT_AWAITING';
ALTER TYPE "PaymentStatus" ADD VALUE 'DEPOSIT_RECEIVED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL_PAID';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "b2bApprovedAt" TIMESTAMP(3),
ADD COLUMN     "b2bApprovedById" TEXT,
ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'RETAIL';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "backorderLeadDays" INTEGER,
ADD COLUMN     "retailReserveQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wholesalePrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "wholesale_settings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "thresholdUnit" "WholesaleThresholdUnit" NOT NULL DEFAULT 'TOTAL_UNITS',
    "thresholdValue" INTEGER NOT NULL DEFAULT 3,
    "reservationDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_requests" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" "WholesaleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "initialMessage" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wholesale_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_chats" (
    "id" TEXT NOT NULL,
    "wholesaleRequestId" TEXT NOT NULL,
    "unreadByMerchant" INTEGER NOT NULL DEFAULT 0,
    "unreadByBuyer" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wholesale_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_chat_messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderType" "WholesaleSenderType" NOT NULL,
    "senderUserId" TEXT,
    "senderBuyerId" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wholesale_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_catalogs" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "minOrderAmount" DECIMAL(10,2),
    "minOrderQuantity" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_catalog_items" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_quotes" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "B2BQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_quote_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "b2b_quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_orders" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "B2BOrderStatus" NOT NULL DEFAULT 'AWAITING_CLIENT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "B2BPaymentMethod" NOT NULL DEFAULT 'TBD',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "depositAmount" DECIMAL(10,2),
    "depositPaidAt" TIMESTAMP(3),
    "remainingAmount" DECIMAL(10,2),
    "paidAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "StockReservationReason" NOT NULL,
    "sourceId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backorders" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fulfilledQty" INTEGER NOT NULL DEFAULT 0,
    "estimatedDate" TIMESTAMP(3),
    "status" "BackorderStatus" NOT NULL DEFAULT 'PENDING',
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backorders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_settings_storeId_key" ON "wholesale_settings"("storeId");

-- CreateIndex
CREATE INDEX "wholesale_requests_storeId_status_idx" ON "wholesale_requests"("storeId", "status");

-- CreateIndex
CREATE INDEX "wholesale_requests_buyerUserId_idx" ON "wholesale_requests"("buyerUserId");

-- CreateIndex
CREATE INDEX "wholesale_requests_assignedToId_idx" ON "wholesale_requests"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_chats_wholesaleRequestId_key" ON "wholesale_chats"("wholesaleRequestId");

-- CreateIndex
CREATE INDEX "wholesale_chats_lastMessageAt_idx" ON "wholesale_chats"("lastMessageAt");

-- CreateIndex
CREATE INDEX "wholesale_chat_messages_chatId_createdAt_idx" ON "wholesale_chat_messages"("chatId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_catalogs_customerId_key" ON "b2b_catalogs"("customerId");

-- CreateIndex
CREATE INDEX "b2b_catalogs_storeId_idx" ON "b2b_catalogs"("storeId");

-- CreateIndex
CREATE INDEX "b2b_catalog_items_catalogId_enabled_idx" ON "b2b_catalog_items"("catalogId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_catalog_items_catalogId_productId_key" ON "b2b_catalog_items"("catalogId", "productId");

-- CreateIndex
CREATE INDEX "b2b_quotes_storeId_status_idx" ON "b2b_quotes"("storeId", "status");

-- CreateIndex
CREATE INDEX "b2b_quotes_customerId_idx" ON "b2b_quotes"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_quotes_storeId_number_key" ON "b2b_quotes"("storeId", "number");

-- CreateIndex
CREATE INDEX "b2b_quote_items_quoteId_idx" ON "b2b_quote_items"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_orders_quoteId_key" ON "b2b_orders"("quoteId");

-- CreateIndex
CREATE INDEX "b2b_orders_storeId_status_idx" ON "b2b_orders"("storeId", "status");

-- CreateIndex
CREATE INDEX "b2b_orders_customerId_idx" ON "b2b_orders"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_orders_storeId_number_key" ON "b2b_orders"("storeId", "number");

-- CreateIndex
CREATE INDEX "stock_reservations_productId_releasedAt_expiresAt_idx" ON "stock_reservations"("productId", "releasedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "stock_reservations_customerId_idx" ON "stock_reservations"("customerId");

-- CreateIndex
CREATE INDEX "stock_reservations_storeId_idx" ON "stock_reservations"("storeId");

-- CreateIndex
CREATE INDEX "backorders_storeId_status_idx" ON "backorders"("storeId", "status");

-- CreateIndex
CREATE INDEX "backorders_productId_status_idx" ON "backorders"("productId", "status");

-- CreateIndex
CREATE INDEX "customers_storeId_customerType_idx" ON "customers"("storeId", "customerType");

-- AddForeignKey
ALTER TABLE "wholesale_settings" ADD CONSTRAINT "wholesale_settings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_requests" ADD CONSTRAINT "wholesale_requests_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_requests" ADD CONSTRAINT "wholesale_requests_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "buyer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_requests" ADD CONSTRAINT "wholesale_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_chats" ADD CONSTRAINT "wholesale_chats_wholesaleRequestId_fkey" FOREIGN KEY ("wholesaleRequestId") REFERENCES "wholesale_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_chat_messages" ADD CONSTRAINT "wholesale_chat_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "wholesale_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_catalogs" ADD CONSTRAINT "b2b_catalogs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_catalogs" ADD CONSTRAINT "b2b_catalogs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_catalog_items" ADD CONSTRAINT "b2b_catalog_items_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "b2b_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_catalog_items" ADD CONSTRAINT "b2b_catalog_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_quotes" ADD CONSTRAINT "b2b_quotes_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_quotes" ADD CONSTRAINT "b2b_quotes_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "b2b_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_quotes" ADD CONSTRAINT "b2b_quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_quote_items" ADD CONSTRAINT "b2b_quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "b2b_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_quote_items" ADD CONSTRAINT "b2b_quote_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_orders" ADD CONSTRAINT "b2b_orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_orders" ADD CONSTRAINT "b2b_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_orders" ADD CONSTRAINT "b2b_orders_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "b2b_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "b2b_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

