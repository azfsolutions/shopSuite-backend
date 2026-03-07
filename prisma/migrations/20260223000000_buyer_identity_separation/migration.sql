-- CreateEnum
CREATE TYPE "BuyerNotificationType" AS ENUM ('ORDER_UPDATE', 'NEWSLETTER', 'PROMOTIONAL');

-- AlterEnum: Remove BUYER from GlobalRole
-- Migrate any BUYER users to USER (buyers will now use BuyerUser model)
UPDATE "users" SET "globalRole" = 'USER' WHERE "globalRole" = 'BUYER';

CREATE TYPE "GlobalRole_new" AS ENUM ('USER', 'SUPER_ADMIN');
ALTER TABLE "users" ALTER COLUMN "globalRole" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "globalRole" TYPE "GlobalRole_new" USING ("globalRole"::text::"GlobalRole_new");
ALTER TYPE "GlobalRole" RENAME TO "GlobalRole_old";
ALTER TYPE "GlobalRole_new" RENAME TO "GlobalRole";
DROP TYPE "GlobalRole_old";
ALTER TABLE "users" ALTER COLUMN "globalRole" SET DEFAULT 'USER';

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_userId_fkey";
ALTER TABLE "store_customer_profiles" DROP CONSTRAINT IF EXISTS "store_customer_profiles_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "customers_userId_idx";
DROP INDEX IF EXISTS "store_customer_profiles_userId_idx";
DROP INDEX IF EXISTS "store_customer_profiles_userId_storeId_key";

-- Clear dev/seed data from store_customer_profiles since existing rows
-- reference old User.id values which won't exist in the new buyer_users table
DELETE FROM "store_customer_profiles";

-- Add buyerUserId to customers (column never existed, customers had no userId)
ALTER TABLE "customers" ADD COLUMN "buyerUserId" TEXT;

-- Rename userId -> buyerUserId in store_customer_profiles (now empty, safe)
ALTER TABLE "store_customer_profiles" RENAME COLUMN "userId" TO "buyerUserId";

-- AlterTable newsletter_subscribers: add new columns
ALTER TABLE "newsletter_subscribers" ADD COLUMN "buyerUserId" TEXT;
ALTER TABLE "newsletter_subscribers" ADD COLUMN "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable buyer_users
CREATE TABLE "buyer_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "buyer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable buyer_sessions
CREATE TABLE "buyer_sessions" (
    "id" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable buyer_notifications
CREATE TABLE "buyer_notifications" (
    "id" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "BuyerNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buyer_users_email_key" ON "buyer_users"("email");
CREATE INDEX "buyer_users_email_idx" ON "buyer_users"("email");
CREATE UNIQUE INDEX "buyer_sessions_token_key" ON "buyer_sessions"("token");
CREATE INDEX "buyer_sessions_buyerUserId_idx" ON "buyer_sessions"("buyerUserId");
CREATE INDEX "buyer_sessions_token_idx" ON "buyer_sessions"("token");
CREATE INDEX "buyer_notifications_buyerUserId_idx" ON "buyer_notifications"("buyerUserId");
CREATE INDEX "buyer_notifications_buyerUserId_isRead_idx" ON "buyer_notifications"("buyerUserId", "isRead");
CREATE INDEX "buyer_notifications_storeId_idx" ON "buyer_notifications"("storeId");
CREATE INDEX "customers_buyerUserId_idx" ON "customers"("buyerUserId");
CREATE INDEX "store_customer_profiles_buyerUserId_idx" ON "store_customer_profiles"("buyerUserId");
CREATE UNIQUE INDEX "store_customer_profiles_buyerUserId_storeId_key" ON "store_customer_profiles"("buyerUserId", "storeId");

-- AddForeignKey
ALTER TABLE "buyer_sessions" ADD CONSTRAINT "buyer_sessions_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "buyer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customers" ADD CONSTRAINT "customers_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "buyer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "store_customer_profiles" ADD CONSTRAINT "store_customer_profiles_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "buyer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "buyer_notifications" ADD CONSTRAINT "buyer_notifications_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "buyer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "buyer_notifications" ADD CONSTRAINT "buyer_notifications_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "buyer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
