-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_NO_SHOW';

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'NO_SHOW';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
