import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isClientStale(client: PrismaClient) {
  // Setelah migrasi akuntansi, client lama di globalThis tidak punya model baru.
  const c = client as unknown as Record<string, unknown>;
  return typeof c.account !== "object" || typeof c.journalEntry !== "object";
}

function getPrisma() {
  const existing = globalForPrisma.prisma;
  if (existing && !isClientStale(existing)) {
    return existing;
  }
  if (existing) {
    void existing.$disconnect().catch(() => undefined);
  }
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma = getPrisma();
