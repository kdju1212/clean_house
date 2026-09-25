-- CreateEnum
CREATE TYPE "DetailPageMode" AS ENUM ('CUSTOM_IMAGE', 'SITE_TEMPLATE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "detailPageMode" "DetailPageMode" NOT NULL DEFAULT 'CUSTOM_IMAGE';

-- AlterTable
ALTER TABLE "CompanyPhoto" ADD COLUMN     "caption" TEXT;
