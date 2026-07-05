import { prisma } from "@/lib/prisma";

export async function getKosanProfile() {
  return prisma.kosanProfile.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export async function getBankAccounts() {
  return prisma.bankAccount.findMany({
    orderBy: { sortOrder: "asc" },
  });
}
