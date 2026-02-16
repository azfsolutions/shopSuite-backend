-- AlterEnum
ALTER TYPE "InvitationStatus" ADD VALUE 'REJECTED';

-- DropIndex
DROP INDEX "store_invitations_email_idx";

-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "backgroundColor" TEXT,
ADD COLUMN     "backgroundImage" TEXT,
ADD COLUMN     "backgroundOpacity" DOUBLE PRECISION,
ADD COLUMN     "backgroundOverlay" TEXT,
ADD COLUMN     "backgroundSize" TEXT,
ADD COLUMN     "backgroundType" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "fallbackColor" TEXT,
ADD COLUMN     "gradientAngle" INTEGER,
ADD COLUMN     "gradientColor1" TEXT,
ADD COLUMN     "gradientColor2" TEXT,
ADD COLUMN     "gradientType" TEXT,
ADD COLUMN     "videoMuted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "videoOpacity" DOUBLE PRECISION,
ADD COLUMN     "videoOverlay" TEXT,
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "imageDesktop" DROP NOT NULL,
ALTER COLUMN "imageMobile" DROP NOT NULL,
ALTER COLUMN "ctaText" DROP NOT NULL,
ALTER COLUMN "ctaLink" DROP NOT NULL;

-- AlterTable
ALTER TABLE "store_invitations" ADD COLUMN     "message" TEXT;

-- AlterTable
ALTER TABLE "testimonials" ADD COLUMN     "customerEmail" TEXT;

-- CreateIndex
CREATE INDEX "store_invitations_email_status_idx" ON "store_invitations"("email", "status");
