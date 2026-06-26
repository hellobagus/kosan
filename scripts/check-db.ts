import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("Memeriksa koneksi database...\n");

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✓ Koneksi database berhasil");

    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists
    `;

    const tablesExist = result[0]?.exists;

    if (tablesExist) {
      console.log("✓ Tabel sudah ada — siap digunakan");
      console.log("\nJalankan: npm run db:seed");
    } else {
      console.log("✗ Tabel BELUM ada di database");
      console.log("\n--- Cara memperbaiki ---\n");
      console.log("OPSI A — Database remote (43.173.1.89):");
      console.log("  Minta admin DB jalankan: database/setup-by-admin.sql");
      console.log("  Lalu: npm run db:seed\n");
      console.log("OPSI B — Database lokal (disarankan untuk development):");
      console.log("  docker compose up -d");
      console.log("  cp .env.local.example .env");
      console.log("  npx prisma db push");
      console.log("  npm run db:seed");
      process.exit(1);
    }
  } catch (error) {
    console.error("✗ Gagal koneksi ke database:");
    console.error(error instanceof Error ? error.message : error);
    console.log("\nPeriksa DATABASE_URL di file .env");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
