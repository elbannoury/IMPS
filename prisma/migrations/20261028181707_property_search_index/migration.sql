-- AlterTable
ALTER TABLE "Property" ADD COLUMN "primaryPrice" INTEGER;
ALTER TABLE "Property" ADD COLUMN "primaryRentPeriod" TEXT;

-- CreateIndex
CREATE INDEX "Property_primaryPrice_idx" ON "Property"("primaryPrice");
