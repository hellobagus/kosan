/**
 * Reset organisasi lalu seed kosan "Sixty Six - Home Sweet Home"
 * dari data price list (1 Aug 2026).
 *
 * - Hapus semua Entity & Project (beserta data operasional)
 * - Akun demo tetap dipertahankan
 * - Buat ulang Holding → Entity → Project + 18 unit + fasilitas + promo + catatan
 *
 * Jalankan: yarn db:seed:sixtysix
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { DEMO_ACCOUNTS } from "../src/lib/demo-accounts";
import { ROLE_OPTIONS } from "../src/lib/rbac";

const prisma = new PrismaClient();

const DEMO_EMAILS = DEMO_ACCOUNTS.map((a) => a.email.toLowerCase());

const KOSAN_NAME = "Sixty Six - Home Sweet Home";
const KOSAN_CODE = "SX66";
const ENTITY_CODE = "SX66";
const HOLDING_CODE = "HOLD66";

const TERMS = [
  "Harga sewa belum termasuk pemakaian listrik & air.",
  "Harga sewa di atas hanya untuk 1 orang penghuni.",
  "Tambah penghuni dikenakan biaya Rp500.000 / bulan.",
  "Maksimum penambahan 1 orang (pasutri / saudara kandung).",
  "Hal-hal lain diatur dalam perjanjian sewa.",
  "Bersedia mengikuti Tata Tertib Penghuni.",
].join("\n");

const PAYMENT_NOTES = [
  "PROMO ++",
  "PLUS + 1 BULAN: Bayar sewa 6 bulan — pemakaian 7 bulan.",
  "PLUS + 2 BULAN: Bayar sewa 12 bulan — pemakaian 14 bulan.",
  "",
  "Fasilitas umum:",
  "1. Full WIFI",
  "2. Free Air Minum (filter)",
  "3. CCTV 24 jam",
  "4. Akses Card System",
  "5. Cleaning Service / 2 minggu",
].join("\n");

const LEASE_PACKAGES = [
  { months: 1, gift: "", bonusMonths: 0 },
  { months: 3, gift: "", bonusMonths: 0 },
  { months: 6, gift: "PLUS +1 BULAN (bayar 6 pakai 7)", bonusMonths: 1 },
  { months: 12, gift: "PLUS +2 BULAN (bayar 12 pakai 14)", bonusMonths: 2 },
];

const COMMON_FACILITIES = [
  "Full WIFI",
  "Free Air Minum (filter)",
  "CCTV 24 jam",
  "Akses Card System",
  "Cleaning Service / 2 minggu",
];

type UnitSeed = {
  roomNumber: string;
  wing: "Purple" | "Green" | "Blue";
  type: "Penthouse" | "Deluxe" | "Superior" | "Standart";
  ampere: 4 | 6;
  deposit: number;
  price: number;
  priceTwoOccupants: number;
  level: number;
  facilities: {
    kamarMandi: boolean;
    ac: boolean;
    waterHeater: boolean;
    dapur: boolean;
    extraLarge: boolean;
  };
};

function buildFacilitiesText(unit: UnitSeed): string {
  const unitFacilities: string[] = [];
  if (unit.facilities.kamarMandi) unitFacilities.push("Kamar Mandi");
  if (unit.facilities.ac) unitFacilities.push("AC");
  if (unit.facilities.waterHeater) unitFacilities.push("Water Heater");
  if (unit.facilities.dapur) unitFacilities.push("Dapur");
  if (unit.facilities.extraLarge) unitFacilities.push("Extra Large");
  unitFacilities.push(`Listrik ${unit.ampere} Ampere`);
  return [...unitFacilities, "", "Fasilitas umum:", ...COMMON_FACILITIES].join("\n");
}

function buildDescription(unit: UnitSeed): string {
  return [
    `Tipe: ${unit.type}`,
    `Colour: ${unit.wing}`,
    `Ampere: ${unit.ampere}A`,
    `Deposit sewa: Rp${unit.deposit.toLocaleString("id-ID")}`,
    `Harga sewa / bulan (1 orang): Rp${unit.price.toLocaleString("id-ID")}`,
    `Harga sewa / bulan (2 orang): Rp${unit.priceTwoOccupants.toLocaleString("id-ID")}`,
    "Tambah penghuni: Rp500.000 / bulan (maks. +1 orang)",
  ].join("\n");
}

const ALL_FACILITIES = {
  kamarMandi: true,
  ac: true,
  waterHeater: true,
  dapur: true,
  extraLarge: true,
};

/** Data dari price list Sixty Six (1 Aug 2026) — 18 unit */
const UNITS: UnitSeed[] = [
  // Purple — Penthouse (5 unit)
  ...[1, 2, 3, 4, 5].map((n) => ({
    roomNumber: `U-${String(n).padStart(2, "0")}`,
    wing: "Purple" as const,
    type: "Penthouse" as const,
    ampere: 6 as const,
    deposit: 1_500_000,
    price: 2_300_000,
    priceTwoOccupants: 2_800_000,
    level: 3,
    facilities: ALL_FACILITIES,
  })),
  // Green — Deluxe (5 unit)
  ...[1, 2, 3, 4, 5].map((n) => ({
    roomNumber: `H-${String(n).padStart(2, "0")}`,
    wing: "Green" as const,
    type: "Deluxe" as const,
    ampere: 6 as const,
    deposit: 1_500_000,
    price: 2_350_000,
    priceTwoOccupants: 2_850_000,
    level: 2,
    facilities: ALL_FACILITIES,
  })),
  // Blue — 8 unit (bervariasi)
  {
    roomNumber: "B-01",
    wing: "Blue",
    type: "Superior",
    ampere: 4,
    deposit: 1_000_000,
    price: 1_900_000,
    priceTwoOccupants: 2_400_000,
    level: 1,
    facilities: { kamarMandi: true, ac: true, waterHeater: false, dapur: true, extraLarge: false },
  },
  {
    roomNumber: "B-02",
    wing: "Blue",
    type: "Standart",
    ampere: 4,
    deposit: 1_000_000,
    price: 1_600_000,
    priceTwoOccupants: 2_100_000,
    level: 1,
    facilities: { kamarMandi: true, ac: true, waterHeater: false, dapur: false, extraLarge: false },
  },
  {
    roomNumber: "B-03",
    wing: "Blue",
    type: "Superior",
    ampere: 6,
    deposit: 1_000_000,
    price: 1_800_000,
    priceTwoOccupants: 2_300_000,
    level: 1,
    facilities: { kamarMandi: true, ac: true, waterHeater: false, dapur: false, extraLarge: true },
  },
  ...[4, 5, 6, 7, 8].map((n) => ({
    roomNumber: `B-${String(n).padStart(2, "0")}`,
    wing: "Blue" as const,
    type: "Standart" as const,
    ampere: 4 as const,
    deposit: 1_000_000,
    price: 1_500_000,
    priceTwoOccupants: 2_000_000,
    level: 1,
    facilities: { kamarMandi: true, ac: true, waterHeater: false, dapur: false, extraLarge: false },
  })),
];

async function wipeOperational(tx: Prisma.TransactionClient) {
  await tx.checkoutInspection.deleteMany();
  await tx.assetTransaction.deleteMany();
  await tx.assetMaintenance.deleteMany();
  await tx.roomAsset.deleteMany();
  await tx.warehouseEntry.deleteMany();
  await tx.purchaseItem.deleteMany();
  await tx.purchase.deleteMany();
  await tx.warehouseStock.deleteMany();
  await tx.roomTemplateItem.deleteMany();
  await tx.utilityBilling.deleteMany();
  await tx.roomUtility.deleteMany();
  await tx.payment.deleteMany();
  await tx.roomTransfer.deleteMany();
  await tx.tenantRepairRequest.deleteMany();
  await tx.announcement.deleteMany();
  await tx.finance.deleteMany();
  await tx.tenant.deleteMany();
  await tx.room.updateMany({ data: { templateId: null } });
  await tx.room.deleteMany();
  await tx.roomTemplate.deleteMany();
  await tx.sharedArea.deleteMany();
  await tx.inventoryItem.deleteMany();
  await tx.inventoryCategory.deleteMany();
  await tx.supplier.deleteMany();
  await tx.utility.deleteMany();
  await tx.documentSequence.deleteMany();
  await tx.floor.deleteMany();
  await tx.building.deleteMany();
}

async function wipeOrganization(tx: Prisma.TransactionClient) {
  await tx.userProjectAccess.deleteMany();
  await tx.userEntityAccess.deleteMany();
  await tx.bankAccount.deleteMany();
  await tx.galleryImage.deleteMany();
  await tx.project.deleteMany();
  await tx.entity.deleteMany();
  await tx.holding.deleteMany();
}

async function main() {
  console.log("=== Seed Sixty Six - Home Sweet Home ===\n");

  await prisma.$transaction(
    async (tx) => {
      console.log("1) Menghapus data operasional + semua Entity/Project...");
      await wipeOperational(tx);
      await wipeOrganization(tx);

      const deletedUsers = await tx.user.deleteMany({
        where: { NOT: { email: { in: DEMO_EMAILS, mode: "insensitive" } } },
      });
      console.log(`   User non-demo dihapus: ${deletedUsers.count}`);

      console.log("2) Membuat Holding / Entity / Project...");
      const holding = await tx.holding.create({
        data: {
          name: "Sixty Six Group",
          code: HOLDING_CODE,
          description: "Holding Sixty Six - Home Sweet Home",
        },
      });

      const entity = await tx.entity.create({
        data: {
          holdingId: holding.id,
          name: KOSAN_NAME,
          code: ENTITY_CODE,
          legalName: KOSAN_NAME,
        },
      });

      const project = await tx.project.create({
        data: {
          entityId: entity.id,
          name: KOSAN_NAME,
          code: KOSAN_CODE,
          managerName: "Pengelola Sixty Six",
          contractLocation: "Jakarta",
          gracePeriodDays: 3,
          latePenaltyPerDay: 50_000,
          termsAndConditions: TERMS,
          paymentNotes: PAYMENT_NOTES,
          yearlyLeaseBonusEnabled: true,
          yearlyLeaseBonusMonths: 2,
          leasePackages: LEASE_PACKAGES as unknown as Prisma.InputJsonValue,
          leaseBonusRules: [
            { leaseDuration: "6 Bulan", bonusMonths: 1, enabled: true },
            { leaseDuration: "1 Tahun", bonusMonths: 2, enabled: true },
            { leaseDuration: "12 Bulan", bonusMonths: 2, enabled: true },
          ] as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.kosanProfile.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          name: KOSAN_NAME,
          termsAndConditions: TERMS,
          paymentNotes: PAYMENT_NOTES,
          gracePeriodDays: 3,
          latePenaltyPerDay: 50_000,
          yearlyLeaseBonusEnabled: true,
          yearlyLeaseBonusMonths: 2,
          leasePackages: LEASE_PACKAGES as unknown as Prisma.InputJsonValue,
          managerName: "Pengelola Sixty Six",
          contractLocation: "Jakarta",
        },
        update: {
          name: KOSAN_NAME,
          termsAndConditions: TERMS,
          paymentNotes: PAYMENT_NOTES,
          gracePeriodDays: 3,
          latePenaltyPerDay: 50_000,
          yearlyLeaseBonusEnabled: true,
          yearlyLeaseBonusMonths: 2,
          leasePackages: LEASE_PACKAGES as unknown as Prisma.InputJsonValue,
          managerName: "Pengelola Sixty Six",
          contractLocation: "Jakarta",
        },
      });

      console.log("3) Memberi akses staf demo ke Entity/Project...");
      const staff = await tx.user.findMany({
        where: { role: { in: ROLE_OPTIONS.filter((r) => r !== "TENANT") } },
      });
      for (const user of staff) {
        await tx.userEntityAccess.create({
          data: { userId: user.id, entityId: entity.id },
        });
        await tx.userProjectAccess.create({
          data: { userId: user.id, projectId: project.id },
        });
      }

      console.log("4) Membuat gedung, lantai, template tipe kamar...");
      const building = await tx.building.create({
        data: {
          projectId: project.id,
          name: "Sixty Six Main",
          code: "SX66-MAIN",
          sortOrder: 0,
        },
      });

      const levels = [...new Set(UNITS.map((u) => u.level))].sort((a, b) => a - b);
      const floorMap = new Map<number, number>();
      const floorNames: Record<number, string> = {
        1: "Blue",
        2: "Green",
        3: "Purple",
      };
      for (const level of levels) {
        const floor = await tx.floor.create({
          data: {
            buildingId: building.id,
            level,
            name: floorNames[level] || `Zona ${level}`,
            sortOrder: level,
          },
        });
        floorMap.set(level, floor.id);
      }

      const templateNames = ["Penthouse", "Deluxe", "Superior", "Standart"] as const;
      const templateMap = new Map<string, number>();
      for (const name of templateNames) {
        const sample = UNITS.find((u) => u.type === name)!;
        const tpl = await tx.roomTemplate.create({
          data: {
            projectId: project.id,
            name: `Tipe ${name}`,
            description: [
              `Deposit default: Rp${sample.deposit.toLocaleString("id-ID")}`,
              `Sewa 1 orang: Rp${sample.price.toLocaleString("id-ID")}`,
              `Sewa 2 orang: Rp${sample.priceTwoOccupants.toLocaleString("id-ID")}`,
            ].join(" · "),
            active: true,
          },
        });
        templateMap.set(name, tpl.id);
      }

      await tx.sharedArea.createMany({
        data: [
          { projectId: project.id, name: "Area WIFI / Lobby", description: "Full WIFI & akses card" },
          { projectId: project.id, name: "Depot Air Minum", description: "Free air minum (filter)" },
          { projectId: project.id, name: "Area CCTV", description: "CCTV 24 jam" },
        ],
      });

      for (const u of [
        {
          utilityName: "Listrik",
          utilityType: "ELECTRICITY" as const,
          billingMethod: "METER" as const,
          amount: 1600,
          unitLabel: "kWh",
        },
        {
          utilityName: "Air",
          utilityType: "WATER" as const,
          billingMethod: "METER" as const,
          amount: 10000,
          unitLabel: "m3",
        },
        {
          utilityName: "WIFI",
          utilityType: "INTERNET" as const,
          billingMethod: "LUMPSUM" as const,
          amount: 0,
          unitLabel: null,
        },
      ]) {
        await tx.utility.create({ data: { projectId: project.id, ...u, active: true } });
      }

      console.log("5) Membuat 18 unit kamar...");
      for (const unit of UNITS) {
        await tx.room.create({
          data: {
            floorId: floorMap.get(unit.level)!,
            floor: unit.level,
            roomNumber: unit.roomNumber,
            price: unit.price,
            dailyPrice: Math.round(unit.price / 30),
            facilities: buildFacilitiesText(unit),
            description: buildDescription(unit),
            equipment: `Deposit disarankan: Rp${unit.deposit.toLocaleString("id-ID")}`,
            status: "AVAILABLE",
            templateId: templateMap.get(unit.type)!,
          },
        });
      }

      await tx.announcement.create({
        data: {
          projectId: project.id,
          title: "Info Harga & Promo Sixty Six",
          content: [
            `Selamat datang di ${KOSAN_NAME}.`,
            "",
            "Promo:",
            "- Bayar 6 bulan → pemakaian 7 bulan",
            "- Bayar 12 bulan → pemakaian 14 bulan",
            "",
            "Catatan penting:",
            TERMS,
          ].join("\n"),
          publishedAt: new Date("2026-08-01"),
          createdByName: "Pengelola Sixty Six",
        },
      });

      console.log(`\n✓ Selesai.`);
      console.log(`  Project : ${project.name} (${project.code})`);
      console.log(`  Entity  : ${entity.name} (${entity.code})`);
      console.log(`  Unit    : ${UNITS.length} kamar (semua AVAILABLE)`);
      console.log(`  Promo   : 6+1 dan 12+2`);
    },
    { timeout: 180_000 }
  );
}

main()
  .catch((err) => {
    console.error("\n✗ Seed Sixty Six gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
