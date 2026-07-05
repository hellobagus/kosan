import { prisma } from "@/lib/prisma";
import { parseAmount } from "@/lib/tenant-utils";
import { getMonthName } from "@/lib/utils";
import {
  calcUtilityAmount,
  endOfCalendarMonth,
  getNextMonth,
  getPreviousMonth,
  resolveRate,
  startOfCalendarMonth,
} from "@/lib/utility-service";
import { applyUtilityBillsToInvoice } from "@/lib/utility-invoice-service";

export interface BillingPeriod {
  month: number;
  year: number;
  label: string;
}

export function getBillingPeriods(invoiceMonth: number, invoiceYear: number) {
  const usage = getPreviousMonth(invoiceMonth, invoiceYear);
  return {
    usagePeriod: {
      month: usage.month,
      year: usage.year,
      label: `${getMonthName(usage.month)} ${usage.year}`,
    } as BillingPeriod,
    invoicePeriod: {
      month: invoiceMonth,
      year: invoiceYear,
      label: `${getMonthName(invoiceMonth)} ${invoiceYear}`,
    } as BillingPeriod,
  };
}

/**
 * Penghuni boleh ditagih utility periode pemakaian jika:
 * - Sudah masuk sebelum/selama akhir bulan pemakaian
 * - Invoice bulan adalah bulan SETELAH bulan masuk (tagih bulan depan)
 */
export function isTenantEligibleForUsagePeriod(
  checkIn: Date,
  usageMonth: number,
  usageYear: number
): { eligible: boolean; reason?: string; isNewTenant: boolean } {
  const checkInDate = new Date(checkIn);
  checkInDate.setHours(0, 0, 0, 0);

  const usageEnd = endOfCalendarMonth(usageMonth, usageYear);
  usageEnd.setHours(23, 59, 59, 999);

  if (checkInDate > usageEnd) {
    return {
      eligible: false,
      isNewTenant: false,
      reason: "Belum masuk pada periode pemakaian ini",
    };
  }

  const invoicePeriod = getNextMonth(usageMonth, usageYear);
  const invoiceStart = startOfCalendarMonth(invoicePeriod.month, invoicePeriod.year);

  if (checkInDate >= invoiceStart) {
    return {
      eligible: false,
      isNewTenant: false,
      reason: "Utility ditagih bulan depan setelah masuk",
    };
  }

  const checkInMonth = checkInDate.getMonth() + 1;
  const checkInYear = checkInDate.getFullYear();
  const isNewTenant = checkInMonth === usageMonth && checkInYear === usageYear;

  return {
    eligible: true,
    isNewTenant,
    reason: isNewTenant ? "Penghuni baru bulan ini" : undefined,
  };
}

export async function getWizardData(invoiceMonth: number, invoiceYear: number) {
  const { usagePeriod, invoicePeriod } = getBillingPeriods(invoiceMonth, invoiceYear);
  const um = usagePeriod.month;
  const uy = usagePeriod.year;

  const [roomUtilities, billings, activeTenants] = await Promise.all([
    prisma.roomUtility.findMany({
      where: { active: true, utility: { active: true } },
      include: {
        room: { select: { id: true, roomNumber: true, floor: true, status: true } },
        utility: true,
      },
      orderBy: [{ room: { floor: "asc" } }, { room: { roomNumber: "asc" } }],
    }),
    prisma.utilityBilling.findMany({
      where: { periodMonth: um, periodYear: uy },
      include: {
        utility: true,
        tenant: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const tenantByRoom = new Map(activeTenants.map((t) => [t.roomId, t]));
  const billingMap = new Map(
    billings.map((b) => [`${b.roomId}-${b.utilityId}`, b])
  );

  const meterRows = roomUtilities
    .filter((ru) => ru.utility.billingMethod === "METER")
    .map((ru) => {
      const tenant = tenantByRoom.get(ru.roomId);
      const billing = billingMap.get(`${ru.roomId}-${ru.utilityId}`);
      const eligibility = tenant
        ? isTenantEligibleForUsagePeriod(tenant.checkIn, um, uy)
        : { eligible: false, reason: "Kamar kosong", isNewTenant: false };

      const prevReading = billing?.prevReading != null
        ? parseAmount(billing.prevReading)
        : parseAmount(ru.lastReading);

      return {
        roomUtilityId: ru.id,
        roomId: ru.roomId,
        utilityId: ru.utility.id,
        roomNumber: ru.room.roomNumber,
        floor: ru.room.floor,
        tenantName: tenant?.user.name || null,
        tenantId: tenant?.id || null,
        tenantEligible: eligibility.eligible,
        tenantNote: eligibility.reason || null,
        isNewTenant: eligibility.isNewTenant,
        utilityName: ru.utility.utilityName,
        utilityType: ru.utility.utilityType,
        unitLabel: ru.utility.unitLabel,
        rate: resolveRate(parseAmount(ru.utility.amount), parseAmount(ru.customAmount)),
        prevReading,
        currReading: billing?.currReading != null ? parseAmount(billing.currReading) : null,
        usage: billing?.usage != null ? parseAmount(billing.usage) : null,
        totalAmount: billing ? parseAmount(billing.totalAmount) : null,
        billingId: billing?.id || null,
        invoicedAt: billing?.invoicedAt || null,
        status: billing?.currReading != null ? "done" : "pending",
      };
    });

  const lumpSumRows = roomUtilities
    .filter((ru) => ru.utility.billingMethod === "LUMPSUM")
    .map((ru) => {
      const tenant = tenantByRoom.get(ru.roomId);
      const billing = billingMap.get(`${ru.roomId}-${ru.utilityId}`);
      const eligibility = tenant
        ? isTenantEligibleForUsagePeriod(tenant.checkIn, um, uy)
        : { eligible: false, reason: "Kamar kosong", isNewTenant: false };

      return {
        roomId: ru.roomId,
        utilityId: ru.utility.id,
        roomNumber: ru.room.roomNumber,
        tenantName: tenant?.user.name || null,
        tenantEligible: eligibility.eligible,
        tenantNote: eligibility.reason || null,
        utilityName: ru.utility.utilityName,
        rate: resolveRate(parseAmount(ru.utility.amount), parseAmount(ru.customAmount)),
        totalAmount: billing ? parseAmount(billing.totalAmount) : null,
        billingId: billing?.id || null,
        invoicedAt: billing?.invoicedAt || null,
        status: billing ? "done" : "pending",
      };
    });

  const reviewByRoom = new Map<
    number,
    {
      roomNumber: string;
      floor: number;
      tenantName: string | null;
      tenantEligible: boolean;
      tenantNote: string | null;
      items: Array<{
        utilityName: string;
        amount: number;
        usage: number | null;
        unitLabel: string | null;
        invoiced: boolean;
      }>;
      total: number;
    }
  >();

  for (const b of billings) {
    const ru = roomUtilities.find((r) => r.roomId === b.roomId && r.utilityId === b.utilityId);
    if (!ru) continue;
    const tenant = tenantByRoom.get(b.roomId);
    const eligibility = tenant
      ? isTenantEligibleForUsagePeriod(tenant.checkIn, um, uy)
      : { eligible: false, reason: "Kamar kosong", isNewTenant: false };

    if (!reviewByRoom.has(b.roomId)) {
      reviewByRoom.set(b.roomId, {
        roomNumber: ru.room.roomNumber,
        floor: ru.room.floor,
        tenantName: tenant?.user.name || null,
        tenantEligible: eligibility.eligible,
        tenantNote: eligibility.reason || null,
        items: [],
        total: 0,
      });
    }
    const room = reviewByRoom.get(b.roomId)!;
    const amt = parseAmount(b.totalAmount);
    room.items.push({
      utilityName: b.utility.utilityName,
      amount: amt,
      usage: b.usage != null ? parseAmount(b.usage) : null,
      unitLabel: b.utility.unitLabel,
      invoiced: b.invoicedAt != null,
    });
    room.total += amt;
  }

  const meterDone = meterRows.filter((r) => r.status === "done").length;
  const meterTotal = meterRows.length;
  const lumpDone = lumpSumRows.filter((r) => r.status === "done").length;
  const lumpTotal = lumpSumRows.length;
  const reviewRooms = Array.from(reviewByRoom.values()).sort((a, b) =>
    a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
  );
  const invoiceReady = billings.filter((b) => !b.invoicedAt).length;
  const invoiceApplied = billings.filter((b) => b.invoicedAt).length;
  const grandTotal = billings.reduce((s, b) => s + parseAmount(b.totalAmount), 0);

  return {
    usagePeriod,
    invoicePeriod,
    meterRows,
    lumpSumRows,
    reviewRooms,
    summary: {
      meterDone,
      meterTotal,
      meterPending: meterTotal - meterDone,
      lumpDone,
      lumpTotal,
      lumpPending: lumpTotal - lumpDone,
      invoiceReady,
      invoiceApplied,
      grandTotal,
      billingCount: billings.length,
    },
  };
}

export async function bulkSaveMeterReadings(params: {
  usageMonth: number;
  usageYear: number;
  readings: Array<{ roomId: number; utilityId: number; currReading: number }>;
}) {
  const results: Array<{ roomId: number; utilityId: number; success: boolean; error?: string }> = [];

  for (const reading of params.readings) {
    try {
      const roomUtility = await prisma.roomUtility.findUnique({
        where: {
          roomId_utilityId: {
            roomId: reading.roomId,
            utilityId: reading.utilityId,
          },
        },
        include: { utility: true },
      });

      if (!roomUtility?.active) {
        results.push({ ...reading, success: false, error: "Utility tidak aktif" });
        continue;
      }

      const utility = roomUtility.utility;
      const rate = resolveRate(parseAmount(utility.amount), parseAmount(roomUtility.customAmount));
      const prevReading = parseAmount(roomUtility.lastReading);

      const calc = calcUtilityAmount({
        billingMethod: "METER",
        ratePerUnit: rate,
        prevReading,
        currReading: reading.currReading,
      });

      if (calc.currReading! < calc.prevReading!) {
        results.push({ ...reading, success: false, error: "Meter turun" });
        continue;
      }

      const activeTenant = await prisma.tenant.findFirst({
        where: { roomId: reading.roomId, status: "ACTIVE" },
      });

      await prisma.$transaction(async (tx) => {
        await tx.utilityBilling.upsert({
          where: {
            roomId_utilityId_periodMonth_periodYear: {
              roomId: reading.roomId,
              utilityId: reading.utilityId,
              periodMonth: params.usageMonth,
              periodYear: params.usageYear,
            },
          },
          create: {
            roomId: reading.roomId,
            utilityId: reading.utilityId,
            tenantId: activeTenant?.id || null,
            periodMonth: params.usageMonth,
            periodYear: params.usageYear,
            prevReading: calc.prevReading,
            currReading: calc.currReading,
            usage: calc.usage,
            ratePerUnit: rate,
            totalAmount: calc.totalAmount,
          },
          update: {
            tenantId: activeTenant?.id || null,
            prevReading: calc.prevReading,
            currReading: calc.currReading,
            usage: calc.usage,
            ratePerUnit: rate,
            totalAmount: calc.totalAmount,
          },
        });

        await tx.roomUtility.update({
          where: { id: roomUtility.id },
          data: { lastReading: calc.currReading },
        });
      });

      results.push({ ...reading, success: true });
    } catch (e) {
      results.push({
        ...reading,
        success: false,
        error: e instanceof Error ? e.message : "Gagal",
      });
    }
  }

  const saved = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);
  return { saved, failed: failed.length, results, errors: failed };
}

export async function generateLumpSumForPeriod(usageMonth: number, usageYear: number) {
  const roomUtilities = await prisma.roomUtility.findMany({
    where: { active: true, utility: { active: true, billingMethod: "LUMPSUM" } },
    include: { utility: true, room: true },
  });

  let created = 0;
  let skipped = 0;

  for (const ru of roomUtilities) {
    const existing = await prisma.utilityBilling.findUnique({
      where: {
        roomId_utilityId_periodMonth_periodYear: {
          roomId: ru.roomId,
          utilityId: ru.utilityId,
          periodMonth: usageMonth,
          periodYear: usageYear,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const activeTenant = await prisma.tenant.findFirst({
      where: { roomId: ru.roomId, status: "ACTIVE" },
    });

    if (activeTenant) {
      const eligibility = isTenantEligibleForUsagePeriod(
        activeTenant.checkIn,
        usageMonth,
        usageYear
      );
      if (!eligibility.eligible) {
        skipped++;
        continue;
      }
    }

    const rate = resolveRate(parseAmount(ru.utility.amount), parseAmount(ru.customAmount));
    const calc = calcUtilityAmount({ billingMethod: "LUMPSUM", ratePerUnit: rate });

    await prisma.utilityBilling.create({
      data: {
        roomId: ru.roomId,
        utilityId: ru.utilityId,
        tenantId: activeTenant?.id || null,
        periodMonth: usageMonth,
        periodYear: usageYear,
        ratePerUnit: rate,
        totalAmount: calc.totalAmount,
        notes: "Auto-generate lump sum",
      },
    });
    created++;
  }

  return { created, skipped };
}

export async function applyAllToInvoiceForPeriod(usageMonth: number, usageYear: number) {
  const activeTenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    include: { user: { select: { name: true } } },
  });

  let applied = 0;
  let skipped = 0;
  const results: Array<{ tenantId: number; name: string; roomNumber?: string; addedAmount: number }> = [];
  const skipReasons: Array<{ name: string; reason: string }> = [];

  for (const tenant of activeTenants) {
    const eligibility = isTenantEligibleForUsagePeriod(
      tenant.checkIn,
      usageMonth,
      usageYear
    );

    if (!eligibility.eligible) {
      skipped++;
      skipReasons.push({
        name: tenant.user.name,
        reason: eligibility.reason || "Tidak eligible",
      });
      continue;
    }

    try {
      const result = await applyUtilityBillsToInvoice({
        tenantId: tenant.id,
        periodMonth: usageMonth,
        periodYear: usageYear,
      });
      applied++;
      results.push({
        tenantId: tenant.id,
        name: tenant.user.name,
        addedAmount: result.addedAmount,
      });
    } catch (e) {
      skipped++;
      skipReasons.push({
        name: tenant.user.name,
        reason: e instanceof Error ? e.message : "Gagal",
      });
    }
  }

  const invoicePeriod = getNextMonth(usageMonth, usageYear);
  return {
    applied,
    skipped,
    results,
    skipReasons,
    invoicePeriodLabel: `${getMonthName(invoicePeriod.month)} ${invoicePeriod.year}`,
  };
}
