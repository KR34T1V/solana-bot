-- DropIndex
DROP INDEX "ApiKey_userId_idx";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "lastVerified" DATETIME;

-- CreateIndex
CREATE INDEX "ApiKey_provider_idx" ON "ApiKey"("provider");
