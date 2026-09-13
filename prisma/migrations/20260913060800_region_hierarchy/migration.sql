-- CreateEnum
CREATE TYPE "RegionLevel" AS ENUM ('SIDO', 'SIGUNGU', 'EUPMYEONDONG');

-- DropIndex
DROP INDEX "Region_name_key";

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "level" "RegionLevel" NOT NULL DEFAULT 'EUPMYEONDONG',
ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Region_parentId_idx" ON "Region"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_parentId_name_key" ON "Region"("parentId", "name");

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;
