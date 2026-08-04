import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Bump after schema migrations so a running Node process does not reuse a stale client.
 * After `prisma generate`, restart `next dev` — Node keeps the old @prisma/client module in memory.
 */
const PRISMA_SCHEMA_REV = "employee-photo-v2";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRev: string | undefined;
  pgPool: Pool | undefined;
};

function employeeHasField(field: string): boolean {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "Employee");
  return Boolean(model?.fields.some((f) => f.name === field));
}

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!employeeHasField("photoUrl")) {
    throw new Error(
      "Prisma Client is missing Employee.photoUrl. Run `npx prisma generate` and restart the Next.js dev server."
    );
  }

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
    });
  if (process.env.NODE_ENV !== "production") globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrisma() {
  const cached = globalForPrisma.prisma;
  if (cached && globalForPrisma.prismaRev === PRISMA_SCHEMA_REV) {
    return cached;
  }
  const client = createPrisma();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaRev = PRISMA_SCHEMA_REV;
  }
  return client;
}

export const prisma = getPrisma();
