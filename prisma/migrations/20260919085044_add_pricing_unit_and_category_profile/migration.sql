-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('FLAT', 'PER_UNIT');

-- AlterTable
ALTER TABLE "CompanyService" ADD COLUMN     "pricingUnit" "PricingUnit" NOT NULL DEFAULT 'FLAT';

-- CreateTable
CREATE TABLE "CategoryProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryProfile_customerId_categoryId_key" ON "CategoryProfile"("customerId", "categoryId");

-- AddForeignKey
ALTER TABLE "CategoryProfile" ADD CONSTRAINT "CategoryProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryProfile" ADD CONSTRAINT "CategoryProfile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
