import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/** Bump after schema migrations so a running Node process does not reuse a stale client. */
const PRISMA_SCHEMA_REV = "employee-name-parts-v1";

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
  if (globalForPrisma.prisma && globalForPrisma.prismaRev === PRISMA_SCHEMA_REV) {
    return globalForPrisma.prisma;
  }
  const client = createPrisma();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaRev = PRISMA_SCHEMA_REV;
  }
  return client;
}

export const prisma = getPrisma();
