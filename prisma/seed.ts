import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calcDueDate, calcTotalAmount } from "../src/lib/tenant-utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists
  `;

  if (!tableCheck[0]?.exists) {
    console.error("\n✗ Tabel belum ada! Jalankan dulu:\n");
    console.error("  npx prisma db push\n");
    process.exit(1);
  }

  const adminPassword = await bcrypt.hash("admin123", 10);
  const managerPassword = await bcrypt.hash("manager123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@kosanku.com" },
    update: {},
    create: {
      name: "Admin Pemilik",
      email: "admin@kosanku.com",
      password: adminPassword,
      phone: "081234567890",
      role: "OWNER",
      address: "Jl. Kosan No. 1, Jakarta",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@kosanku.com" },
    update: {},
    create: {
      name: "Budi Pengelola",
      email: "manager@kosanku.com",
      password: managerPassword,
      phone: "081234567891",
      role: "MANAGER",
    },
  });

  const tenantPassword = await bcrypt.hash("penghuni123", 10);

  const rooms = await Promise.all([
    prisma.room.upsert({
      where: { roomNumber: "01" },
      update: { price: 900000, dailyPrice: 100000 },
      create: {
        roomNumber: "01", floor: 1, price: 900000, dailyPrice: 100000,
        facilities: "Kasur 120x200\nAlmari\nMeja kursi\nKamar mandi dalam",
        status: "AVAILABLE",
      },
    }),
    prisma.room.upsert({
      where: { roomNumber: "02" },
      update: {},
      create: {
        roomNumber: "02", floor: 1, price: 900000, dailyPrice: 100000,
        facilities: "Kasur 120x200\nAlmari", status: "AVAILABLE",
      },
    }),
    prisma.room.upsert({
      where: { roomNumber: "03" },
      update: {},
      create: {
        roomNumber: "03", floor: 1, price: 850000, dailyPrice: 95000,
        facilities: "Kasur 120x200\nAlmari", status: "AVAILABLE",
      },
    }),
    prisma.room.upsert({
      where: { roomNumber: "123" },
      update: { price: 1700000, dailyPrice: 70000, status: "OCCUPIED" },
      create: {
        roomNumber: "123", floor: 1, price: 1700000, dailyPrice: 70000,
        facilities: "Kasur 120x200\nAlmari\nAC\nKamar mandi dalam",
        status: "OCCUPIED",
      },
    }),
    prisma.room.upsert({
      where: { roomNumber: "A1" },
      update: { price: 1200000, status: "OCCUPIED" },
      create: {
        roomNumber: "A1", floor: 2, price: 1200000, dailyPrice: 120000,
        facilities: "Kasur 120x200\nAlmari\nAC", status: "OCCUPIED",
      },
    }),
    prisma.room.upsert({
      where: { roomNumber: "B01" },
      update: {},
      create: {
        roomNumber: "B01", floor: 2, price: 1100000, dailyPrice: 110000,
        facilities: "Kasur 120x200\nWiFi", status: "AVAILABLE",
      },
    }),
  ]);

  const room123 = rooms.find((r) => r.roomNumber === "123")!;
  const roomA1 = rooms.find((r) => r.roomNumber === "A1")!;
  const room01 = rooms.find((r) => r.roomNumber === "01")!;

  const adriana = await prisma.user.upsert({
    where: { email: "adriana@email.com" },
    update: { gender: "FEMALE", ktp: "1111111111111111", maritalStatus: "SINGLE", occupation: "Karyawati" },
    create: {
      name: "Adriana", email: "adriana@email.com", password: tenantPassword,
      phone: "080808080808", role: "TENANT", gender: "FEMALE",
      ktp: "1111111111111111", maritalStatus: "SINGLE", occupation: "Karyawati",
    },
  });

  const mirna = await prisma.user.upsert({
    where: { email: "mirna@email.com" },
    update: { gender: "MALE", maritalStatus: "SINGLE", occupation: "Pialang" },
    create: {
      name: "Mirna", email: "mirna@email.com", password: tenantPassword,
      phone: "081111111111", role: "TENANT", gender: "MALE",
      maritalStatus: "SINGLE", occupation: "Pialang",
    },
  });

  const asep = await prisma.user.upsert({
    where: { email: "asep@email.com" },
    update: { gender: "MALE", maritalStatus: "SINGLE", occupation: "Buruh" },
    create: {
      name: "Asep", email: "asep@email.com", password: tenantPassword,
      phone: "082222222222", role: "TENANT", gender: "MALE",
      maritalStatus: "SINGLE", occupation: "Buruh",
    },
  });

  const lala = await prisma.user.upsert({
    where: { email: "lala@email.com" },
    update: { gender: "FEMALE", maritalStatus: "SINGLE", occupation: "Pedagang" },
    create: {
      name: "Lala", email: "lala@email.com", password: tenantPassword,
      phone: "083333333333", role: "TENANT", gender: "FEMALE",
      maritalStatus: "SINGLE", occupation: "Pedagang",
    },
  });

  const checkInAdriana = new Date("2026-04-15");
  const dueAdriana = calcDueDate(checkInAdriana, "1 Bulan");
  const totalAdriana = calcTotalAmount({
    monthlyRent: 1700000, leaseDuration: "1 Bulan", occupantCount: 1,
    discount: 0, deposit: 0, additionalFees: [], checkIn: checkInAdriana, dueDate: dueAdriana,
  });

  await prisma.tenant.upsert({
    where: { id: 1 },
    update: {
      userId: adriana.id, roomId: room123.id,
      checkIn: checkInAdriana, dueDate: dueAdriana,
      monthlyRent: 1700000, status: "ACTIVE",
      leaseDuration: "1 Bulan", occupantCount: 1,
      totalAmount: totalAdriana, paidAmount: totalAdriana, paymentStatus: "PAID",
      invoiceNumber: "#26050014", lastPaymentDate: checkInAdriana,
    },
    create: {
      userId: adriana.id, roomId: room123.id,
      checkIn: checkInAdriana, dueDate: dueAdriana,
      monthlyRent: 1700000, deposit: 0, status: "ACTIVE",
      leaseDuration: "1 Bulan", occupantCount: 1,
      totalAmount: totalAdriana, paidAmount: totalAdriana, paymentStatus: "PAID",
      invoiceNumber: "#26050014", lastPaymentDate: checkInAdriana,
    },
  });

  const checkInMirna = new Date("2026-06-12");
  const dueMirna = calcDueDate(checkInMirna, "1 Bulan");
  const totalMirna = calcTotalAmount({
    monthlyRent: 1200000, leaseDuration: "1 Bulan", occupantCount: 1,
    discount: 0, deposit: 0, additionalFees: [], checkIn: checkInMirna, dueDate: dueMirna,
  });

  await prisma.tenant.upsert({
    where: { id: 2 },
    update: {
      userId: mirna.id, roomId: roomA1.id,
      checkIn: checkInMirna, dueDate: dueMirna,
      monthlyRent: 1200000, status: "ACTIVE",
      leaseDuration: "1 Bulan", occupantCount: 1,
      totalAmount: totalMirna, paidAmount: totalMirna, paymentStatus: "PAID",
      invoiceNumber: "#26060012", lastPaymentDate: checkInMirna,
    },
    create: {
      userId: mirna.id, roomId: roomA1.id,
      checkIn: checkInMirna, dueDate: dueMirna,
      monthlyRent: 1200000, deposit: 0, status: "ACTIVE",
      leaseDuration: "1 Bulan", occupantCount: 1,
      totalAmount: totalMirna, paidAmount: totalMirna, paymentStatus: "PAID",
      invoiceNumber: "#26060012", lastPaymentDate: checkInMirna,
    },
  });

  const checkInAsep = new Date("2026-06-11");
  const dueAsep = calcDueDate(checkInAsep, "1 Hari");
  const totalAsep = 70000;

  await prisma.tenant.upsert({
    where: { id: 3 },
    update: {
      userId: asep.id, roomId: room123.id,
      checkIn: checkInAsep, dueDate: dueAsep,
      monthlyRent: 1700000, status: "RESERVED",
      leaseDuration: "1 Hari", occupantCount: 1, isDaily: true,
      totalAmount: totalAsep, paidAmount: 0, paymentStatus: "UNPAID",
      invoiceNumber: "#26060011",
    },
    create: {
      userId: asep.id, roomId: room123.id,
      checkIn: checkInAsep, dueDate: dueAsep,
      monthlyRent: 1700000, deposit: 0, status: "RESERVED",
      leaseDuration: "1 Hari", occupantCount: 1, isDaily: true,
      totalAmount: totalAsep, paidAmount: 0, paymentStatus: "UNPAID",
      invoiceNumber: "#26060011",
    },
  });

  const checkInLala = new Date("2026-06-22");
  const dueLala = calcDueDate(checkInLala, "1 Bulan");
  const totalLala = 900000;

  await prisma.tenant.upsert({
    where: { id: 4 },
    update: {
      userId: lala.id, roomId: room01.id,
      checkIn: checkInLala, dueDate: dueLala,
      monthlyRent: 900000, status: "RESERVED",
      leaseDuration: "1 Bulan", occupantCount: 1,
      totalAmount: totalLala, paidAmount: totalLala, paymentStatus: "PAID",
      invoiceNumber: "#26060022", lastPaymentDate: new Date("2026-06-14"),
    },
    create: {
      userId: lala.id, roomId: room01.id,
      checkIn: checkInLala, dueDate: dueLala,
      monthlyRent: 900000, deposit: 0, status: "RESERVED",
      leaseDuration: "1 Bulan", occupantCount: 1,
      totalAmount: totalLala, paidAmount: totalLala, paymentStatus: "PAID",
      invoiceNumber: "#26060022", lastPaymentDate: new Date("2026-06-14"),
    },
  });

  await prisma.finance.createMany({
    data: [
      {
        type: "INCOME", amount: totalAdriana,
        description: "Sewa - Adriana (Kamar 123)", category: "Sewa",
        transactionDate: checkInAdriana, tenantId: 1, roomId: room123.id, createdBy: admin.id,
      },
      {
        type: "INCOME", amount: totalMirna,
        description: "Sewa - Mirna (Kamar A1)", category: "Sewa",
        transactionDate: checkInMirna, tenantId: 2, roomId: roomA1.id, createdBy: admin.id,
      },
      {
        type: "INCOME", amount: totalLala,
        description: "Sewa - Lala (Kamar 01)", category: "Sewa",
        transactionDate: new Date("2026-06-14"), tenantId: 4, roomId: room01.id, createdBy: admin.id,
      },
    ],
    skipDuplicates: true,
  });

  const defaultUtilities = [
    { utilityName: "Listrik KWH", utilityType: "ELECTRICITY" as const, billingMethod: "METER" as const, amount: 1500, unitLabel: "kWh" },
    { utilityName: "Air M3", utilityType: "WATER" as const, billingMethod: "METER" as const, amount: 8000, unitLabel: "m³" },
    { utilityName: "Internet WiFi", utilityType: "INTERNET" as const, billingMethod: "LUMPSUM" as const, amount: 100000, unitLabel: null },
    { utilityName: "Service Charge", utilityType: "OTHER" as const, billingMethod: "LUMPSUM" as const, amount: 50000, unitLabel: null },
  ];

  for (const u of defaultUtilities) {
    const existing = await prisma.utility.findFirst({ where: { utilityName: u.utilityName } });
    if (!existing) {
      await prisma.utility.create({ data: u });
    }
  }

  const utilities = await prisma.utility.findMany();
  const occupiedRooms = await prisma.room.findMany({
    where: { status: "OCCUPIED" },
    take: 3,
  });

  for (const room of occupiedRooms) {
    for (const utility of utilities) {
      await prisma.roomUtility.upsert({
        where: { roomId_utilityId: { roomId: room.id, utilityId: utility.id } },
        create: {
          roomId: room.id,
          utilityId: utility.id,
          lastReading: utility.billingMethod === "METER" ? 1000 : null,
        },
        update: {},
      });
    }
  }

  console.log("Seed completed!");
  console.log("Admin: admin@kosanku.com / admin123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
