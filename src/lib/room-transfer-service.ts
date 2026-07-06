import { Prisma, RoomTransferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getKosanProfile } from "@/lib/settings-service";
import { activateRoomAssetsForTenant, getTenantCheckoutAssets, inspectCheckoutAssets } from "@/lib/inventory-service";
import { parseAmount } from "@/lib/tenant-utils";
import { calcUtilityAmount, resolveRate } from "@/lib/utility-service";

export const ROOM_TRANSFER_STATUS_LABELS: Record<RoomTransferStatus, string> = {
  REQUESTED: "Pengajuan Pindah",
  APPROVED: "Approval Admin",
  FINANCIAL_CALCULATED: "Selisih Sewa & Deposit",
  LETTER_GENERATED: "Surat Pindah",
  OLD_ROOM_INSPECTED: "Inspeksi Kamar Lama",
  OLD_METER_CLOSED: "Closing Meter Lama",
  NEW_ROOM_HANDOVER: "Serah Terima Kamar Baru",
  NEW_METER_OPENED: "Opening Meter Baru",
  CONTRACT_UPDATED: "Update Kontrak",
  BILLING_UPDATED: "Update Billing",
  COMPLETED: "Pindah Selesai",
  CANCELLED: "Dibatalkan",
};

const TRANSFER_INCLUDE = {
  tenant: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      room: {
        select: {
          id: true,
          roomNumber: true,
          floor: true,
          price: true,
          status: true,
        },
      },
    },
  },
  fromRoom: {
    select: {
      id: true,
      roomNumber: true,
      floor: true,
      price: true,
      status: true,
    },
  },
  toRoom: {
    select: {
      id: true,
      roomNumber: true,
      floor: true,
      price: true,
      status: true,
    },
  },
  requestedByUser: {
    select: {
      id: true,
      name: true,
    },
  },
  approvedByUser: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.RoomTransferInclude;

type TransferWithRelations = Prisma.RoomTransferGetPayload<{ include: typeof TRANSFER_INCLUDE }>;

type MeterReadingInput = {
  utilityId: number;
  reading: number;
  notes?: string;
};

type InspectionInput = {
  assetId: number;
  result: "OK" | "DAMAGED" | "MISSING";
  damageCost?: number;
  notes?: string;
};

function startOfDay(value: Date | string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function diffDaysInclusive(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

function ensureStep(current: RoomTransferStatus, allowed: RoomTransferStatus[]) {
  if (!allowed.includes(current)) {
    throw new Error(`Tahap transfer tidak valid untuk aksi ini: ${ROOM_TRANSFER_STATUS_LABELS[current]}`);
  }
}

async function getTransferOrThrow(id: number) {
  const transfer = await prisma.roomTransfer.findUnique({
    where: { id },
    include: TRANSFER_INCLUDE,
  });
  if (!transfer) throw new Error("Data pindah kamar tidak ditemukan");
  return transfer;
}

async function ensureTargetRoomAvailable(tx: Prisma.TransactionClient, transfer: TransferWithRelations) {
  const targetRoom = await tx.room.findUnique({
    where: { id: transfer.toRoomId },
    include: {
      tenants: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
  });
  if (!targetRoom) throw new Error("Kamar tujuan tidak ditemukan");
  if (targetRoom.id !== transfer.fromRoomId && targetRoom.tenants.length > 0) {
    throw new Error("Kamar tujuan masih ditempati penghuni aktif");
  }
  if (targetRoom.status === "MAINTENANCE") {
    throw new Error("Kamar tujuan sedang maintenance");
  }
}

function buildTransferLetterNumber(id: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `SP-${y}${m}-${String(id).padStart(4, "0")}`;
}

export async function listRoomTransfers() {
  return prisma.roomTransfer.findMany({
    include: TRANSFER_INCLUDE,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function createRoomTransferRequest(input: {
  tenantId: number;
  toRoomId: number;
  effectiveDate: Date | string;
  reason?: string;
  requestedBy?: number;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    include: { room: true },
  });
  if (!tenant) throw new Error("Penghuni tidak ditemukan");
  if (tenant.status !== "ACTIVE") throw new Error("Hanya penghuni aktif yang bisa dipindahkan");
  if (tenant.roomId === input.toRoomId) throw new Error("Kamar tujuan harus berbeda dengan kamar saat ini");

  const targetRoom = await prisma.room.findUnique({
    where: { id: input.toRoomId },
    include: {
      tenants: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
  });
  if (!targetRoom) throw new Error("Kamar tujuan tidak ditemukan");
  if (targetRoom.tenants.length > 0) throw new Error("Kamar tujuan masih ditempati penghuni aktif");
  if (targetRoom.status === "MAINTENANCE") throw new Error("Kamar tujuan sedang maintenance");

  const openTransfer = await prisma.roomTransfer.findFirst({
    where: {
      tenantId: input.tenantId,
      status: {
        notIn: ["COMPLETED", "CANCELLED"],
      },
    },
  });
  if (openTransfer) throw new Error("Penghuni ini masih memiliki proses pindah yang belum selesai");

  return prisma.roomTransfer.create({
    data: {
      tenantId: input.tenantId,
      fromRoomId: tenant.roomId,
      toRoomId: input.toRoomId,
      requestedBy: input.requestedBy,
      effectiveDate: startOfDay(input.effectiveDate),
      reason: input.reason || null,
      currentMonthlyRent: tenant.monthlyRent,
      newMonthlyRent: targetRoom.price,
      currentDeposit: tenant.deposit,
      newDeposit: targetRoom.price,
    },
    include: TRANSFER_INCLUDE,
  });
}

export async function approveRoomTransfer(id: number, userId: number, adminNotes?: string) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["REQUESTED"]);

  const updated = await prisma.$transaction(async (tx) => {
    const activeTenant = await tx.tenant.findUnique({ where: { id: transfer.tenantId } });
    if (!activeTenant || activeTenant.status !== "ACTIVE") {
      throw new Error("Penghuni sudah tidak aktif");
    }
    await ensureTargetRoomAvailable(tx, transfer);

    return tx.roomTransfer.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: userId,
        adminNotes: adminNotes || transfer.adminNotes,
      },
      include: TRANSFER_INCLUDE,
    });
  });

  return updated;
}

export async function calculateRoomTransferFinancials(id: number) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["APPROVED", "FINANCIAL_CALCULATED"]);

  const tenant = await prisma.tenant.findUnique({
    where: { id: transfer.tenantId },
    include: { room: true },
  });
  if (!tenant) throw new Error("Penghuni tidak ditemukan");

  const days = diffDaysInclusive(transfer.effectiveDate, tenant.dueDate || transfer.effectiveDate);
  const currentRent = parseAmount(transfer.currentMonthlyRent);
  const newRent = parseAmount(transfer.newMonthlyRent);
  const rentDifference = Math.round(((newRent - currentRent) / 30) * days);
  const depositDifference = Math.round(parseAmount(transfer.newDeposit) - parseAmount(transfer.currentDeposit));
  const financeAdjustmentAmount = rentDifference + depositDifference;

  return prisma.roomTransfer.update({
    where: { id },
    data: {
      prorataDays: days,
      rentDifference,
      depositDifference,
      financeAdjustmentAmount,
      financialCalculatedAt: new Date(),
      status: "FINANCIAL_CALCULATED",
    },
    include: TRANSFER_INCLUDE,
  });
}

export async function generateRoomTransferLetter(id: number) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["FINANCIAL_CALCULATED", "LETTER_GENERATED"]);

  return prisma.roomTransfer.update({
    where: { id },
    data: {
      status: "LETTER_GENERATED",
      letterGeneratedAt: new Date(),
      letterNumber: transfer.letterNumber || buildTransferLetterNumber(id),
    },
    include: TRANSFER_INCLUDE,
  });
}

export async function inspectOldRoomForTransfer(id: number, inspections: InspectionInput[], userId?: number) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["LETTER_GENERATED", "OLD_ROOM_INSPECTED"]);

  const readiness = await getTenantCheckoutAssets(transfer.tenantId);
  if (readiness.requiresInspection && inspections.length === 0) {
    throw new Error("Inspeksi kamar lama wajib dilakukan");
  }

  let totalDeduction = 0;
  if (readiness.requiresInspection && inspections.length > 0) {
    const result = await inspectCheckoutAssets(transfer.tenantId, inspections, userId);
    totalDeduction = result.totalDeduction;
  }

  const updated = await prisma.roomTransfer.update({
    where: { id },
    data: {
      status: "OLD_ROOM_INSPECTED",
      oldRoomInspectedAt: new Date(),
    },
    include: TRANSFER_INCLUDE,
  });

  return { transfer: updated, totalDeduction };
}

export async function closeOldRoomMeters(id: number, readings: MeterReadingInput[]) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["OLD_ROOM_INSPECTED", "OLD_METER_CLOSED"]);

  const roomUtilities = await prisma.roomUtility.findMany({
    where: {
      roomId: transfer.fromRoomId,
      active: true,
      utility: { billingMethod: "METER" },
    },
    include: { utility: true },
  });

  const requiredIds = new Set(roomUtilities.map((item) => item.utilityId));
  if (requiredIds.size > 0) {
    const providedIds = new Set(readings.map((item) => item.utilityId));
    for (const utilityId of requiredIds) {
      if (!providedIds.has(utilityId)) {
        throw new Error("Semua meter kamar lama wajib di-closing");
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const roomUtility of roomUtilities) {
      const input = readings.find((item) => item.utilityId === roomUtility.utilityId);
      if (!input) continue;
      const rate = resolveRate(parseAmount(roomUtility.utility.amount), parseAmount(roomUtility.customAmount));
      const calc = calcUtilityAmount({
        billingMethod: roomUtility.utility.billingMethod,
        ratePerUnit: rate,
        prevReading: parseAmount(roomUtility.lastReading),
        currReading: input.reading,
      });

      if (calc.currReading == null || calc.currReading < (calc.prevReading || 0)) {
        throw new Error(`Meter akhir ${roomUtility.utility.utilityName} tidak valid`);
      }

      await tx.utilityBilling.upsert({
        where: {
          roomId_utilityId_periodMonth_periodYear: {
            roomId: transfer.fromRoomId,
            utilityId: roomUtility.utilityId,
            periodMonth: transfer.effectiveDate.getMonth() + 1,
            periodYear: transfer.effectiveDate.getFullYear(),
          },
        },
        create: {
          roomId: transfer.fromRoomId,
          utilityId: roomUtility.utilityId,
          tenantId: transfer.tenantId,
          periodMonth: transfer.effectiveDate.getMonth() + 1,
          periodYear: transfer.effectiveDate.getFullYear(),
          prevReading: calc.prevReading,
          currReading: calc.currReading,
          usage: calc.usage,
          ratePerUnit: rate,
          totalAmount: calc.totalAmount,
          notes: input.notes || `Closing meter pindah kamar #${transfer.id}`,
        },
        update: {
          tenantId: transfer.tenantId,
          prevReading: calc.prevReading,
          currReading: calc.currReading,
          usage: calc.usage,
          ratePerUnit: rate,
          totalAmount: calc.totalAmount,
          notes: input.notes || `Closing meter pindah kamar #${transfer.id}`,
        },
      });

      await tx.roomUtility.update({
        where: { id: roomUtility.id },
        data: { lastReading: calc.currReading },
      });
    }

    await tx.roomTransfer.update({
      where: { id },
      data: {
        status: "OLD_METER_CLOSED",
        oldMetersClosedAt: new Date(),
      },
    });
  });

  return getTransferOrThrow(id);
}

export async function handoverNewRoom(id: number, userId?: number) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["OLD_METER_CLOSED", "NEW_ROOM_HANDOVER"]);

  await ensureTargetRoomAvailable(prisma, transfer);
  await activateRoomAssetsForTenant(transfer.toRoomId, transfer.tenantId, userId).catch(() => {});

  return prisma.roomTransfer.update({
    where: { id },
    data: {
      status: "NEW_ROOM_HANDOVER",
      newRoomHandoverAt: new Date(),
    },
    include: TRANSFER_INCLUDE,
  });
}

export async function openNewRoomMeters(id: number, readings: MeterReadingInput[]) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["NEW_ROOM_HANDOVER", "NEW_METER_OPENED"]);

  const roomUtilities = await prisma.roomUtility.findMany({
    where: {
      roomId: transfer.toRoomId,
      active: true,
      utility: { billingMethod: "METER" },
    },
    include: { utility: true },
  });

  const requiredIds = new Set(roomUtilities.map((item) => item.utilityId));
  if (requiredIds.size > 0) {
    const providedIds = new Set(readings.map((item) => item.utilityId));
    for (const utilityId of requiredIds) {
      if (!providedIds.has(utilityId)) {
        throw new Error("Semua meter kamar baru wajib di-opening");
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const roomUtility of roomUtilities) {
      const input = readings.find((item) => item.utilityId === roomUtility.utilityId);
      if (!input) continue;
      await tx.roomUtility.update({
        where: { id: roomUtility.id },
        data: { lastReading: input.reading },
      });
    }

    await tx.roomTransfer.update({
      where: { id },
      data: {
        status: "NEW_METER_OPENED",
        newMetersOpenedAt: new Date(),
      },
    });
  });

  return getTransferOrThrow(id);
}

export async function updateTransferContract(id: number) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["NEW_METER_OPENED", "CONTRACT_UPDATED"]);

  return prisma.roomTransfer.update({
    where: { id },
    data: {
      status: "CONTRACT_UPDATED",
      contractUpdatedAt: new Date(),
    },
    include: TRANSFER_INCLUDE,
  });
}

export async function updateTransferBilling(id: number, userId?: number) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["CONTRACT_UPDATED", "BILLING_UPDATED"]);

  const amount = parseAmount(transfer.financeAdjustmentAmount);
  await prisma.$transaction(async (tx) => {
    if (amount !== 0) {
      await tx.finance.create({
        data: {
          type: amount > 0 ? "INCOME" : "EXPENSE",
          amount: Math.abs(amount),
          description:
            amount > 0
              ? `Selisih pindah kamar - ${transfer.tenant.user.name} (${transfer.fromRoom.roomNumber} ke ${transfer.toRoom.roomNumber})`
              : `Refund selisih pindah kamar - ${transfer.tenant.user.name} (${transfer.fromRoom.roomNumber} ke ${transfer.toRoom.roomNumber})`,
          category: "Pindah Kamar",
          transactionDate: new Date(),
          tenantId: transfer.tenantId,
          roomId: transfer.toRoomId,
          createdBy: userId,
        },
      });
    }

    await tx.roomTransfer.update({
      where: { id },
      data: {
        status: "BILLING_UPDATED",
        billingUpdatedAt: new Date(),
      },
    });
  });

  return getTransferOrThrow(id);
}

export async function completeRoomTransfer(id: number) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, ["BILLING_UPDATED", "COMPLETED"]);

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: transfer.tenantId },
    });
    if (!tenant || tenant.status !== "ACTIVE") {
      throw new Error("Penghuni sudah tidak aktif");
    }

    await ensureTargetRoomAvailable(tx, transfer);

    const updatedTransfer = await tx.roomTransfer.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    await tx.tenant.update({
      where: { id: transfer.tenantId },
      data: {
        roomId: transfer.toRoomId,
        monthlyRent: transfer.newMonthlyRent,
        deposit: transfer.newDeposit,
        invoiceNumber: tenant.invoiceNumber,
        notes: [
          tenant.notes,
          `Pindah kamar dari ${transfer.fromRoom.roomNumber} ke ${transfer.toRoom.roomNumber} efektif ${transfer.effectiveDate.toISOString().slice(0, 10)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });

    await tx.room.update({
      where: { id: transfer.fromRoomId },
      data: { status: "AVAILABLE" },
    });

    await tx.room.update({
      where: { id: transfer.toRoomId },
      data: { status: "OCCUPIED" },
    });

    await tx.roomAsset.updateMany({
      where: {
        roomId: transfer.toRoomId,
        tenantId: null,
        status: { in: ["DEPLOYED", "IN_USE"] },
      },
      data: {
        tenantId: transfer.tenantId,
        status: "IN_USE",
      },
    });

    return tx.roomTransfer.findUniqueOrThrow({
      where: { id: updatedTransfer.id },
      include: TRANSFER_INCLUDE,
    });
  });
}

export async function cancelRoomTransfer(id: number, notes?: string) {
  const transfer = await getTransferOrThrow(id);
  ensureStep(transfer.status, [
    "REQUESTED",
    "APPROVED",
    "FINANCIAL_CALCULATED",
    "LETTER_GENERATED",
    "OLD_ROOM_INSPECTED",
    "OLD_METER_CLOSED",
    "NEW_ROOM_HANDOVER",
    "NEW_METER_OPENED",
    "CONTRACT_UPDATED",
    "BILLING_UPDATED",
  ]);

  return prisma.roomTransfer.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      adminNotes: notes ? [transfer.adminNotes, notes].filter(Boolean).join("\n") : transfer.adminNotes,
    },
    include: TRANSFER_INCLUDE,
  });
}

function formatIdr(amount: number) {
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

function formatIdDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const TRANSFER_LETTER_STYLES = `
  @page { size: A4; margin: 2.54cm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
  }
  h1 { text-align: center; font-size: 13pt; font-weight: bold; margin: 0 0 14px; text-transform: uppercase; }
  .kosan-name { text-align: center; font-size: 14pt; font-weight: bold; margin: 0 0 6px; }
  .kosan-address { text-align: center; font-size: 10pt; margin: 0 0 18px; }
  .meta { margin: 16px 0 24px; }
  .meta p { margin: 4px 0; }
  p { margin: 8px 0; text-align: justify; }
  .field-table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; }
  .field-table td { padding: 5px 8px; vertical-align: top; border: 1px solid #000; }
  .field-table .label { width: 180px; font-weight: bold; background: #f8f8f8; }
  .section-title { font-weight: bold; margin: 18px 0 8px; }
  .signature { margin-top: 48px; display: table; width: 100%; table-layout: fixed; }
  .signature-box { display: table-cell; width: 50%; text-align: center; vertical-align: top; padding: 0 12px; }
  .signature-line { margin-top: 72px; border-top: 1px solid #000; display: inline-block; min-width: 200px; }
  .materai { color: #c00; font-style: italic; font-size: 10pt; margin-top: 8px; }
`;

export async function buildRoomTransferLetterHtml(id: number) {
  const transfer = await getTransferOrThrow(id);
  const profile = await getKosanProfile();
  const letterNo = transfer.letterNumber || buildTransferLetterNumber(transfer.id);
  const signDate = transfer.letterGeneratedAt || transfer.approvedAt || new Date();
  const rentDiff = parseAmount(transfer.rentDifference);
  const depositDiff = parseAmount(transfer.depositDifference);
  const totalAdj = parseAmount(transfer.financeAdjustmentAmount);

  const body = `
  <div class="kosan-name">${profile.name}</div>
  ${profile.address ? `<div class="kosan-address">${profile.address}</div>` : ""}
  <h1>Surat Pindah Kamar / Unit</h1>

  <div class="meta">
    <p>Nomor&nbsp;&nbsp;&nbsp;&nbsp;: ${letterNo}</p>
    <p>Tanggal&nbsp;&nbsp;: ${formatIdDate(signDate)}</p>
  </div>

  <p>Yang bertanda tangan di bawah ini, Pengelola <strong>${profile.name}</strong>, dengan ini menerangkan bahwa:</p>

  <table class="field-table">
    <tr><td class="label">Nama Penghuni</td><td>${transfer.tenant.user.name}</td></tr>
    <tr><td class="label">No. HP</td><td>${transfer.tenant.user.phone || "-"}</td></tr>
    <tr><td class="label">Kamar Lama</td><td>Kamar ${transfer.fromRoom.roomNumber} (Lantai ${transfer.fromRoom.floor})</td></tr>
    <tr><td class="label">Kamar Baru</td><td>Kamar ${transfer.toRoom.roomNumber} (Lantai ${transfer.toRoom.floor})</td></tr>
    <tr><td class="label">Tanggal Efektif</td><td>${formatIdDate(transfer.effectiveDate)}</td></tr>
    <tr><td class="label">Alasan Pindah</td><td>${transfer.reason || "-"}</td></tr>
  </table>

  <p class="section-title">Penyesuaian Biaya Sewa &amp; Deposit</p>
  <table class="field-table">
    <tr><td class="label">Sewa Lama</td><td>${formatIdr(parseAmount(transfer.currentMonthlyRent))} / bulan</td></tr>
    <tr><td class="label">Sewa Baru</td><td>${formatIdr(parseAmount(transfer.newMonthlyRent))} / bulan</td></tr>
    <tr><td class="label">Deposit Lama</td><td>${formatIdr(parseAmount(transfer.currentDeposit))}</td></tr>
    <tr><td class="label">Deposit Baru</td><td>${formatIdr(parseAmount(transfer.newDeposit))}</td></tr>
    <tr><td class="label">Prorata (${transfer.prorataDays} hari)</td><td>${formatIdr(rentDiff)}</td></tr>
    <tr><td class="label">Selisih Deposit</td><td>${formatIdr(depositDiff)}</td></tr>
    <tr><td class="label">Total Penyesuaian</td><td><strong>${formatIdr(totalAdj)}</strong></td></tr>
  </table>

  <p>Surat ini menjadi dasar administrasi untuk perpindahan kamar, pembaruan kontrak sewa, penyesuaian billing, serta serah terima inventaris dan utility meter sesuai prosedur yang berlaku di ${profile.name}.</p>

  <p>Demikian surat pindah kamar ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>

  <div class="signature">
    <div class="signature-box">
      <p>Penghuni,</p>
      <div class="signature-line"></div>
      <p><strong>${transfer.tenant.user.name}</strong></p>
      <p class="materai">Materai Rp10.000</p>
    </div>
    <div class="signature-box">
      <p>Pengelola,</p>
      <div class="signature-line"></div>
      <p><strong>${transfer.approvedByUser?.name || "(________________)"}</strong></p>
      <p class="materai">Materai Rp10.000</p>
    </div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Surat Pindah Kamar - ${transfer.tenant.user.name}</title>
  <style>${TRANSFER_LETTER_STYLES}</style>
</head>
<body>
${body}
</body>
</html>`;
}
