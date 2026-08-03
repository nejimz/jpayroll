-- AlterEnum
ALTER TYPE "PunchSource" ADD VALUE 'KIOSK';

-- AlterTable Company
ALTER TABLE "Company" ADD COLUMN "kioskEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "kioskAllowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable Employee
ALTER TABLE "Employee" ADD COLUMN "badgeCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_badgeCode_key" ON "Employee"("companyId", "badgeCode");
