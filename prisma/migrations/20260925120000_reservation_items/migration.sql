-- CreateTable
CREATE TABLE "ReservationItem" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryAnswers" JSONB,
    "price" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationItem_pkey" PRIMARY KEY ("id")
);

-- Every existing reservation becomes a one-item reservation.
INSERT INTO "ReservationItem" ("id", "reservationId", "categoryId", "categoryAnswers", "price", "order", "createdAt")
SELECT "id" || '_item', "id", "categoryId", "categoryAnswers", "price", 0, "createdAt"
FROM "Reservation";

-- CreateIndex
CREATE UNIQUE INDEX "ReservationItem_reservationId_categoryId_key" ON "ReservationItem"("reservationId", "categoryId");

-- AddForeignKey
ALTER TABLE "ReservationItem" ADD CONSTRAINT "ReservationItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationItem" ADD CONSTRAINT "ReservationItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_categoryId_fkey";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "categoryAnswers",
DROP COLUMN "categoryId";
