import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/** Bump after schema migrations so a running Node process does not reuse a stale client. */
const PRISMA_SCHEMA_REV = "departments-v2";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRev: string | undefined;
  pgPool: Pool | undefined;
};

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
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
  const hasDepartment =
    cached != null && typeof (cached as { department?: unknown }).department === "object";
  if (cached && globalForPrisma.prismaRev === PRISMA_SCHEMA_REV && hasDepartment) {
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
