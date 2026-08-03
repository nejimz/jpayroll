-- AlterTable: split fullName into name parts
ALTER TABLE "Employee" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Employee" ADD COLUMN "middleName" TEXT;
ALTER TABLE "Employee" ADD COLUMN "lastName" TEXT;
ALTER TABLE "Employee" ADD COLUMN "suffix" TEXT;

-- Backfill from existing fullName (first token / last token / middle)
UPDATE "Employee"
SET
  "firstName" = split_part(trim("fullName"), ' ', 1),
  "lastName" = CASE
    WHEN position(' ' in trim("fullName")) = 0 THEN trim("fullName")
    ELSE regexp_replace(trim("fullName"), '^.*\s', '')
  END,
  "middleName" = CASE
    WHEN array_length(regexp_split_to_array(trim("fullName"), '\s+'), 1) > 2
      THEN array_to_string(
        (regexp_split_to_array(trim("fullName"), '\s+'))[2:array_length(regexp_split_to_array(trim("fullName"), '\s+'), 1) - 1],
        ' '
      )
    ELSE NULL
  END;

UPDATE "Employee" SET "firstName" = COALESCE(NULLIF("firstName", ''), 'Unknown') WHERE "firstName" IS NULL OR "firstName" = '';
UPDATE "Employee" SET "lastName" = COALESCE(NULLIF("lastName", ''), 'Unknown') WHERE "lastName" IS NULL OR "lastName" = '';

ALTER TABLE "Employee" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "lastName" SET NOT NULL;

ALTER TABLE "Employee" DROP COLUMN "fullName";
