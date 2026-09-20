-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "businessRegistrationNumber" TEXT,
ADD COLUMN     "representativeName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Company_businessRegistrationNumber_key" ON "Company"("businessRegistrationNumber");

