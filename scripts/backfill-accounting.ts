/**
 * Backfill jurnal akuntansi dari baris buku kas (Finance) yang belum terjurnal.
 * Juga memastikan bagan akun default tersedia di setiap project.
 *
 * Usage:
 *   yarn db:accounting:backfill
 *   yarn db:accounting:backfill --project=1
 */

import { PrismaClient } from "@prisma/client";
import {
  backfillFinanceJournals,
  ensureChartOfAccountsForAllProjects,
} from "../src/lib/accounting-service";

const prisma = new PrismaClient();

async function main() {
  const projectArg = process.argv.find((a) => a.startsWith("--project="));
  const projectId = projectArg ? parseInt(projectArg.split("=")[1], 10) : undefined;

  console.log("Memastikan bagan akun...");
  if (projectId) {
    const { ensureChartOfAccounts } = await import("../src/lib/accounting-service");
    await ensureChartOfAccounts(projectId);
  } else {
    await ensureChartOfAccountsForAllProjects();
  }

  console.log("Backfill jurnal dari buku kas...");
  const result = await backfillFinanceJournals(projectId);
  console.table(result);
  console.log("Selesai.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
