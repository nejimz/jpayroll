-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_companyId_name_key" ON "Department"("companyId", "name");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: add departmentId before backfill
ALTER TABLE "Employee" ADD COLUMN "departmentId" TEXT;

-- Backfill departments from existing free-text values
INSERT INTO "Department" ("id", "companyId", "name", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "companyId",
  TRIM("department"),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Employee"
WHERE "department" IS NOT NULL AND TRIM("department") <> ''
GROUP BY "companyId", TRIM("department");

UPDATE "Employee" AS e
SET "departmentId" = d."id"
FROM "Department" AS d
WHERE e."companyId" = d."companyId"
  AND e."department" IS NOT NULL
  AND TRIM(e."department") = d."name";

-- Drop old free-text column
ALTER TABLE "Employee" DROP COLUMN "department";

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
