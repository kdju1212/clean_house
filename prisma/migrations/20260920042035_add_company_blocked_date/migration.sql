-- CreateTable
CREATE TABLE "CompanyBlockedDate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBlockedDate_companyId_date_key" ON "CompanyBlockedDate"("companyId", "date");

-- AddForeignKey
ALTER TABLE "CompanyBlockedDate" ADD CONSTRAINT "CompanyBlockedDate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

