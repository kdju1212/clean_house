-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'COMPANY';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMPANY_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE 'COMPANY_REACTIVATED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "suspendedReason" TEXT;
