-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REPLY';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "ownerReply" TEXT,
ADD COLUMN "ownerReplyAt" TIMESTAMP(3);
