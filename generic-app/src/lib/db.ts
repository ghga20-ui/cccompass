import { PrismaClient } from "@prisma/client";
import { createE2eJsonPrisma } from "./e2e-json-prisma";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const e2eJsonDbPath = process.env.E2E_JSON_DB_PATH;

export const prisma =
  globalForPrisma.prisma ??
  (e2eJsonDbPath ? createE2eJsonPrisma(e2eJsonDbPath) : new PrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
