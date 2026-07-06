/**
 * Dummy data: 1 Entity (KOSAN) dengan beberapa Project/Kos.
 * Setiap project punya kamar, penghuni, inventaris, utility sendiri.
 *
 * Jalankan: npm run db:seed:dummy
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calcDueDate, calcTotalAmount } from "../src/lib/tenant-utils";
import { generateInvoiceNumber } from "../src/lib/document-number";
import { ensureDefaultOrganization } from "../src/lib/organization-service";

const prisma = new PrismaClient();

type ProjectSeed = {
  code: string;
  name: string;
  address: string;
  managerName: string;
  building: { code: string; name: string };
  rooms: Array<{
    level: number;
    num: string;
    price: number;
    status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
    deluxe?: boolean;
  }>;
  tenants: Array<{
    email: string;
    name: string;
    roomNum: string;
    status: "ACTIVE" | "RESERVED";
    checkIn: string;
    lease: string;
    monthlyRent: number;
    deposit: number;
    paid: boolean;
    partial?: number;
  }>;
};

const EXTRA_PROJECTS: ProjectSeed[] = [
  {
    code: "GRNVIEW",
    name: "Kos Green View Cimahi",
    address: "Jl. Melati Raya No. 12, Cimahi",
    managerName: "Pak Hendra",
    building: { code: "TWA", name: "Tower Green" },
    rooms: [
      { level: 1, num: "A101", price: 1500000, status: "OCCUPIED", deluxe: true },
      { level: 1, num: "A102", price: 1450000, status: "AVAILABLE" },
      { level: 2, num: "A201", price: 1400000, status: "OCCUPIED", deluxe: true },
      { level: 2, num: "A202", price: 1400000, status: "MAINTENANCE" },
    ],
    tenants: [
      { email: "dika.pratama@email.com", name: "Dika Pratama", roomNum: "A101", status: "ACTIVE", checkIn: "2026-05-01", lease: "3 Bulan", monthlyRent: 1500000, deposit: 1500000, paid: true },
      { email: "siti.rahayu@email.com", name: "Siti Rahayu", roomNum: "A201", status: "ACTIVE", checkIn: "2026-06-01", lease: "1 Bulan", monthlyRent: 1400000, deposit: 1400000, paid: true },
    ],
  },
  {
    code: "KOSBLU",
    name: "Kos Blue Sky Depok",
    address: "Jl. Margonda Raya No. 45, Depok",
    managerName: "Bu Ratna",
    building: { code: "BLU1", name: "Gedung Biru" },
    rooms: [
      { level: 1, num: "B101", price: 1300000, status: "OCCUPIED" },
      { level: 1, num: "B102", price: 1250000, status: "AVAILABLE" },
      { level: 2, num: "B201", price: 1200000, status: "AVAILABLE" },
      { level: 2, num: "B202", price: 1200000, status: "AVAILABLE" },
    ],
    tenants: [
      { email: "roni.saputra@email.com", name: "Roni Saputra", roomNum: "B101", status: "ACTIVE", checkIn: "2026-06-15", lease: "6 Bulan", monthlyRent: 1300000, deposit: 1300000, paid: false, partial: 1300000 },
      { email: "nina.wijaya@email.com", name: "Nina Wijaya", roomNum: "B201", status: "RESERVED", checkIn: "2026-07-10", lease: "1 Bulan", monthlyRent: 1200000, deposit: 500000, paid: true },
    ],
  },
];

async function seedProjectInventory(projectId: number, prefix: string) {
  let cat = await prisma.inventoryCategory.findFirst({
    where: { projectId, name: `Furnitur ${prefix}` },
  });
  if (!cat) {
    cat = await prisma.inventoryCategory.create({
      data: { projectId, name: `Furnitur ${prefix}`, locationType: "ROOM" },
    });
  }

  const sku = `${prefix}-KSR`;
  const item = await prisma.inventoryItem.findFirst({ where: { projectId, sku } })
    || await prisma.inventoryItem.create({
      data: {
        projectId,
        sku,
        name: `Kasur Standard ${prefix}`,
        categoryId: cat.id,
        locationType: "ROOM",
        unitPrice: 1500000,
      },
    });

  await prisma.sharedArea.findFirst({ where: { projectId, name: `Dapur ${prefix}` } })
    || await prisma.sharedArea.create({ data: { projectId, name: `Dapur ${prefix}`, description: "Area bersama" } });

  await prisma.roomTemplate.findFirst({ where: { projectId, name: `Template ${prefix}` } })
    || await prisma.roomTemplate.create({
      data: {
        projectId,
        name: `Template ${prefix}`,
        items: { create: [{ itemId: item.id, quantity: 1, required: true }] },
      },
    });

  for (const u of [
    { utilityName: `Listrik ${prefix}`, utilityType: "ELECTRICITY" as const, billingMethod: "METER" as const, amount: 1600, unitLabel: "kWh" },
    { utilityName: `WiFi ${prefix}`, utilityType: "INTERNET" as const, billingMethod: "LUMPSUM" as const, amount: 100000, unitLabel: null },
  ]) {
    await prisma.utility.findFirst({ where: { projectId, utilityName: u.utilityName } })
      || await prisma.utility.create({ data: { projectId, ...u } });
  }
}

async function seedOneProject(entityId: number, adminId: number, cfg: ProjectSeed) {
  let project = await prisma.project.findFirst({ where: { entityId, code: cfg.code } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        entityId,
        code: cfg.code,
        name: cfg.name,
        address: cfg.address,
        managerName: cfg.managerName,
        contractLocation: cfg.name.split(" ").pop() || "Jakarta",
        gracePeriodDays: 3,
        latePenaltyPerDay: 50000,
      },
    });
  } else {
    await prisma.project.update({
      where: { id: project.id },
      data: { name: cfg.name, address: cfg.address, managerName: cfg.managerName },
    });
  }

  const staff = await prisma.user.findMany({ where: { role: { in: ["OWNER", "MANAGER"] } } });
  for (const user of staff) {
    await prisma.userProjectAccess.upsert({
      where: { userId_projectId: { userId: user.id, projectId: project.id } },
      create: { userId: user.id, projectId: project.id },
      update: {},
    });
  }

  await seedProjectInventory(project.id, cfg.code);

  const building = await prisma.building.upsert({
    where: { projectId_code: { projectId: project.id, code: cfg.building.code } },
    create: { projectId: project.id, code: cfg.building.code, name: cfg.building.name },
    update: { name: cfg.building.name },
  });

  const floorMap = new Map<number, number>();
  for (const level of [...new Set(cfg.rooms.map((r) => r.level))]) {
    const floor = await prisma.floor.upsert({
      where: { buildingId_level: { buildingId: building.id, level } },
      create: { buildingId: building.id, level, name: `Lantai ${level}` },
      update: {},
    });
    floorMap.set(level, floor.id);
  }

  const roomMap = new Map<string, number>();
  for (const r of cfg.rooms) {
    const floorId = floorMap.get(r.level)!;
    const room = await prisma.room.findFirst({ where: { floorId, roomNumber: r.num } })
      || await prisma.room.create({
        data: {
          floorId,
          floor: r.level,
          roomNumber: r.num,
          price: r.price,
          dailyPrice: Math.round(r.price / 10),
          facilities: r.deluxe ? "AC\nKamar mandi dalam\nWiFi" : "Kamar mandi dalam\nWiFi",
          status: r.status,
        },
      });
    await prisma.room.update({
      where: { id: room.id },
      data: {
        price: r.price,
        status: r.status,
        floorId,
        floor: r.level,
      },
    });
    roomMap.set(r.num, room.id);
  }

  const tenantPassword = await bcrypt.hash("penghuni123", 10);
  const utilities = await prisma.utility.findMany({ where: { projectId: project.id } });

  for (const t of cfg.tenants) {
    const roomId = roomMap.get(t.roomNum);
    if (!roomId) continue;

    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name },
      create: {
        name: t.name,
        email: t.email,
        password: tenantPassword,
        role: "TENANT",
      },
    });

    const checkIn = new Date(t.checkIn);
    const dueDate = calcDueDate(checkIn, t.lease);
    const total = calcTotalAmount({
      monthlyRent: t.monthlyRent,
      leaseDuration: t.lease,
      occupantCount: 1,
      discount: 0,
      deposit: t.deposit,
      additionalFees: [],
      checkIn,
      dueDate,
    });
    const paidAmount = t.paid ? total : t.partial || 0;
    const paymentStatus = paidAmount >= total ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";
    const invoiceNumber = await generateInvoiceNumber(entityId, project.id);

    const existing = await prisma.tenant.findFirst({
      where: { userId: user.id, roomId },
    });

    const tenant = existing
      ? await prisma.tenant.update({
          where: { id: existing.id },
          data: { status: t.status, totalAmount: total, paidAmount, paymentStatus, invoiceNumber, checkIn, dueDate, monthlyRent: t.monthlyRent, deposit: t.deposit, leaseDuration: t.lease },
        })
      : await prisma.tenant.create({
          data: {
            userId: user.id,
            roomId,
            checkIn,
            dueDate,
            monthlyRent: t.monthlyRent,
            deposit: t.deposit,
            status: t.status,
            leaseDuration: t.lease,
            occupantCount: 1,
            totalAmount: total,
            paidAmount,
            paymentStatus,
            invoiceNumber,
            termsAcceptedAt: new Date(),
          },
        });

    if (t.status === "ACTIVE") {
      await prisma.room.update({ where: { id: roomId }, data: { status: "OCCUPIED" } });
      for (const utility of utilities) {
        await prisma.roomUtility.upsert({
          where: { roomId_utilityId: { roomId, utilityId: utility.id } },
          create: { roomId, utilityId: utility.id, lastReading: 100 },
          update: {},
        });
      }
    }

    if (paidAmount > 0 && !await prisma.finance.findFirst({ where: { projectId: project.id, tenantId: tenant.id } })) {
      await prisma.finance.create({
        data: {
          projectId: project.id,
          type: "INCOME",
          amount: paidAmount,
          description: `Sewa - ${t.name} (${cfg.code} / ${t.roomNum})`,
          category: "Sewa",
          transactionDate: checkIn,
          tenantId: tenant.id,
          roomId,
          createdBy: adminId,
        },
      });
    }
  }

  return project;
}

async function main() {
  console.log("Seeding dummy: 1 entity, beberapa project...\n");

  await ensureDefaultOrganization();
  const admin = await prisma.user.findUnique({ where: { email: "admin@kosanku.com" } });
  if (!admin) {
    console.error("Jalankan dulu: npm run db:seed");
    process.exit(1);
  }

  const entity = await prisma.entity.findFirst({ where: { code: "KOSAN" } });
  if (!entity) {
    console.error("Entity KOSAN tidak ditemukan");
    process.exit(1);
  }

  // Pindahkan project yang salah entity (mis. GRNVIEW di GRN) ke KOSAN
  for (const code of ["GRNVIEW", "KOSBLU"]) {
    const misplaced = await prisma.project.findFirst({ where: { code, NOT: { entityId: entity.id } } });
    if (misplaced) {
      await prisma.project.update({ where: { id: misplaced.id }, data: { entityId: entity.id } });
      console.log(`↳ Project ${code} dipindah ke entity KOSAN`);
    }
  }

  const mainProject = await prisma.project.findFirst({ where: { entityId: entity.id, code: "MAIN" } });
  if (mainProject) {
    await prisma.project.update({
      where: { id: mainProject.id },
      data: { name: "KosanKu Jakarta (MAIN)" },
    });
  }

  const created = [];
  for (const cfg of EXTRA_PROJECTS) {
    const p = await seedOneProject(entity.id, admin.id, cfg);
    created.push(p);
    console.log(`✓ Project ${p.code} — ${p.name}`);
  }

  console.log("\n─── Satu Entity, Beberapa Kos ───");
  console.log(`Entity: ${entity.code} — ${entity.name}`);
  const allProjects = await prisma.project.findMany({
    where: { entityId: entity.id, active: true },
    orderBy: { code: "asc" },
  });
  for (const p of allProjects) {
    const roomCount = await prisma.room.count({
      where: { floorRef: { building: { projectId: p.id } } },
    });
    const tenantCount = await prisma.tenant.count({
      where: { status: "ACTIVE", room: { floorRef: { building: { projectId: p.id } } } },
    });
    console.log(`  • ${p.code} — ${p.name} (${roomCount} kamar, ${tenantCount} penghuni aktif)`);
  }

  console.log("\n─── Cara uji ───");
  console.log("1. Login admin, pilih Entity KOSAN di header");
  console.log("2. Ganti Project: MAIN → GRNVIEW → KOSBLU, klik Terapkan");
  console.log("3. Dashboard, kamar, penghuni, keuangan ikut berubah per project");
  console.log("\nPenghuni dummy password: penghuni123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
