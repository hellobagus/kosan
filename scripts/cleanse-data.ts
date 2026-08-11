/**
 * Cleansing data operasional, menyisakan akun demo.
 *
 * DISIMPAN:
 * - User dengan email di DEMO_ACCOUNTS
 * - Akses entity/project milik user demo
 * - Struktur organisasi (holding, entity, project, building, floor)
 * - Profil kosan, rekening bank, gallery
 * - Menu & hak akses (RBAC)
 *
 * DIHAPUS:
 * - Semua data operasional (kamar, penghuni, pembayaran, keuangan, inventaris, utilitas, dll.)
 * - Akun user di luar daftar demo
 *
 * Usage:
 *   yarn db:cleanse          # jalankan cleansing
 *   yarn db:cleanse --dry-run  # hanya tampilkan hitungan, tidak menghapus
 */

import { PrismaClient } from "@prisma/client";
import { DEMO_ACCOUNTS } from "../src/lib/demo-accounts";

const prisma = new PrismaClient();

const DEMO_EMAILS = DEMO_ACCOUNTS.map((a) => a.email.toLowerCase());
const dryRun = process.argv.includes("--dry-run");

async function countAll() {
  const [
    users,
    tenants,
    rooms,
    payments,
    finances,
    transfers,
    repairs,
    announcements,
    utilities,
    roomUtilities,
    utilityBillings,
    inventoryCategories,
    inventoryItems,
    sharedAreas,
    roomTemplates,
    roomTemplateItems,
    suppliers,
    purchases,
    purchaseItems,
    warehouseStocks,
    warehouseEntries,
    roomAssets,
    assetMaintenances,
    checkoutInspections,
    assetTransactions,
    documentSequences,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tenant.count(),
    prisma.room.count(),
    prisma.payment.count(),
    prisma.finance.count(),
    prisma.roomTransfer.count(),
    prisma.tenantRepairRequest.count(),
    prisma.announcement.count(),
    prisma.utility.count(),
    prisma.roomUtility.count(),
    prisma.utilityBilling.count(),
    prisma.inventoryCategory.count(),
    prisma.inventoryItem.count(),
    prisma.sharedArea.count(),
    prisma.roomTemplate.count(),
    prisma.roomTemplateItem.count(),
    prisma.supplier.count(),
    prisma.purchase.count(),
    prisma.purchaseItem.count(),
    prisma.warehouseStock.count(),
    prisma.warehouseEntry.count(),
    prisma.roomAsset.count(),
    prisma.assetMaintenance.count(),
    prisma.checkoutInspection.count(),
    prisma.assetTransaction.count(),
    prisma.documentSequence.count(),
  ]);

  const demoUsers = await prisma.user.count({
    where: { email: { in: DEMO_EMAILS, mode: "insensitive" } },
  });
  const otherUsers = users - demoUsers;

  return {
    users,
    demoUsers,
    otherUsers,
    tenants,
    rooms,
    payments,
    finances,
    transfers,
    repairs,
    announcements,
    utilities,
    roomUtilities,
    utilityBillings,
    inventoryCategories,
    inventoryItems,
    sharedAreas,
    roomTemplates,
    roomTemplateItems,
    suppliers,
    purchases,
    purchaseItems,
    warehouseStocks,
    warehouseEntries,
    roomAssets,
    assetMaintenances,
    checkoutInspections,
    assetTransactions,
    documentSequences,
  };
}

function printCounts(label: string, counts: Awaited<ReturnType<typeof countAll>>) {
  console.log(`\n=== ${label} ===`);
  console.table({
    "User (total)": counts.users,
    "User demo (keep)": counts.demoUsers,
    "User non-demo (hapus)": counts.otherUsers,
    Tenants: counts.tenants,
    Rooms: counts.rooms,
    Payments: counts.payments,
    Finances: counts.finances,
    "Room transfers": counts.transfers,
    "Repair requests": counts.repairs,
    Announcements: counts.announcements,
    Utilities: counts.utilities,
    "Inventory items": counts.inventoryItems,
    Purchases: counts.purchases,
    "Room assets": counts.roomAssets,
    "Document sequences": counts.documentSequences,
  });
}

async function cleanse() {
  console.log(dryRun ? "Mode: DRY-RUN (tidak menghapus)\n" : "Mode: CLEANSE (akan menghapus data)\n");
  console.log("Akun demo yang dipertahankan:");
  DEMO_EMAILS.forEach((e) => console.log(`  - ${e}`));

  const before = await countAll();
  printCounts("Sebelum cleansing", before);

  if (dryRun) {
    console.log("\nDry-run selesai. Jalankan tanpa --dry-run untuk menghapus.");
    return;
  }

  console.log("\nMenghapus data operasional...");

  await prisma.$transaction(
    async (tx) => {
      // 1) Anak inventaris / maintenance
      await tx.checkoutInspection.deleteMany();
      await tx.assetTransaction.deleteMany();
      await tx.assetMaintenance.deleteMany();
      await tx.roomAsset.deleteMany();
      await tx.warehouseEntry.deleteMany();
      await tx.purchaseItem.deleteMany();
      await tx.purchase.deleteMany();
      await tx.warehouseStock.deleteMany();
      await tx.roomTemplateItem.deleteMany();

      // 2) Utilitas & billing
      await tx.utilityBilling.deleteMany();
      await tx.roomUtility.deleteMany();

      // 3) Penghuni & terkait
      await tx.payment.deleteMany();
      await tx.roomTransfer.deleteMany();
      await tx.tenantRepairRequest.deleteMany();
      await tx.announcement.deleteMany();

      // Akuntansi (jurnal sebelum finance karena FK)
      await tx.journalLine.deleteMany();
      await tx.journalEntry.deleteMany();
      await tx.accountingPeriod.deleteMany();
      await tx.account.deleteMany();

      // Lepas FK finance dari purchase/maintenance sudah terhapus; hapus finance
      await tx.finance.deleteMany();
      await tx.tenant.deleteMany();

      // 4) Kamar (lepas template dulu)
      await tx.room.updateMany({ data: { templateId: null } });
      await tx.room.deleteMany();

      // 5) Master inventaris / utilitas / supplier
      await tx.roomTemplate.deleteMany();
      await tx.sharedArea.deleteMany();
      await tx.inventoryItem.deleteMany();
      await tx.inventoryCategory.deleteMany();
      await tx.supplier.deleteMany();
      await tx.utility.deleteMany();

      // 6) Reset nomor dokumen
      await tx.documentSequence.deleteMany();

      // 7) Hapus user non-demo (cascade akses entity/project)
      const deletedUsers = await tx.user.deleteMany({
        where: {
          NOT: {
            email: { in: DEMO_EMAILS, mode: "insensitive" },
          },
        },
      });
      console.log(`  User non-demo dihapus: ${deletedUsers.count}`);
    },
    { timeout: 120_000 }
  );

  const after = await countAll();
  printCounts("Sesudah cleansing", after);

  console.log("\n✓ Cleansing selesai.");
  console.log("  Struktur organisasi, RBAC, dan akun demo tetap ada.");
  console.log("  Bila perlu data contoh lagi: yarn db:seed atau yarn db:seed:dummy");
}

cleanse()
  .catch((err) => {
    console.error("\n✗ Cleansing gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
