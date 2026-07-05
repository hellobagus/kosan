import { PaymentStatus, Prisma, UtilityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AdditionalFee,
  calcTotalAmount,
  parseAdditionalFees,
  parseAmount,
} from "@/lib/tenant-utils";
import { getMonthName } from "@/lib/utils";

type TxClient = Prisma.TransactionClient;

const FINANCE_CATEGORY_MAP: Record<UtilityType, string> = {
  ELECTRICITY: "Listrik",
  WATER: "Air",
  INTERNET: "Internet",
  GAS: "Gas",
  OTHER: "Utilitas",
};

export function utilityFeeLabel(
  utilityName: string,
  periodMonth: number,
  periodYear: number
): string {
  return `${utilityName} (${getMonthName(periodMonth)} ${periodYear})`;
}

export function isUtilityFee(fee: AdditionalFee): boolean {
  return fee.utilityBillingId != null && fee.utilityBillingId > 0;
}

export function splitFees(fees: AdditionalFee[]) {
  const utilityFees = fees.filter(isUtilityFee);
  const manualFees = fees.filter((f) => !isUtilityFee(f));
  return { utilityFees, manualFees };
}

export async function getTenantUtilityBillings(
  tenantId: number,
  periodMonth?: number,
  periodYear?: number
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { roomId: true },
  });
  if (!tenant) return [];

  return prisma.utilityBilling.findMany({
    where: {
      roomId: tenant.roomId,
      ...(periodMonth && periodYear
        ? { periodMonth, periodYear }
        : {}),
    },
    include: { utility: true },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { utility: { utilityName: "asc" } }],
  });
}

export async function buildInvoiceBreakdown(tenantId: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { user: true, room: true },
  });
  if (!tenant) throw new Error("Penghuni tidak ditemukan");

  const fees = parseAdditionalFees(tenant.additionalFees);
  const { utilityFees, manualFees } = splitFees(fees);

  const utilityBillings = await prisma.utilityBilling.findMany({
    where: {
      tenantId,
      invoicedAt: { not: null },
    },
    include: { utility: true },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  const monthlyRent = parseAmount(tenant.monthlyRent);
  const deposit = parseAmount(tenant.deposit);
  const discount = parseAmount(tenant.discount);
  const utilityTotal = utilityFees.reduce((s, f) => s + f.amount, 0);
  const manualTotal = manualFees.reduce((s, f) => s + f.amount, 0);
  const total = parseAmount(tenant.totalAmount || tenant.monthlyRent);
  const paid = parseAmount(tenant.paidAmount);
  const rentAndBase = Math.max(0, total - utilityTotal - manualTotal);

  return {
    tenant: {
      id: tenant.id,
      name: tenant.user.name,
      roomNumber: tenant.room.roomNumber,
      invoiceNumber: tenant.invoiceNumber,
      paymentStatus: tenant.paymentStatus,
    },
    lines: {
      rent: rentAndBase,
      deposit,
      discount,
      manualFees,
      utilityFees,
      utilityBillings: utilityBillings.map((b) => ({
        id: b.id,
        name: utilityFeeLabel(b.utility.utilityName, b.periodMonth, b.periodYear),
        amount: parseAmount(b.totalAmount),
        paidAmount: parseAmount(b.paidAmount),
        paymentStatus: b.paymentStatus,
        utilityType: b.utility.utilityType,
        usage: b.usage != null ? parseAmount(b.usage) : null,
        unitLabel: b.utility.unitLabel,
      })),
    },
    total,
    paid,
    remaining: Math.max(0, total - paid),
    monthlyRent,
  };
}

/** Terapkan tagihan utility bulan ini ke invoice penghuni aktif */
export async function applyUtilityBillsToInvoice(params: {
  tenantId?: number;
  roomId?: number;
  periodMonth: number;
  periodYear: number;
}) {
  const { periodMonth, periodYear } = params;

  let tenant;
  if (params.tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
      include: { room: true },
    });
  } else if (params.roomId) {
    tenant = await prisma.tenant.findFirst({
      where: { roomId: params.roomId, status: "ACTIVE" },
      include: { room: true },
    });
  }

  if (!tenant) throw new Error("Penghuni aktif tidak ditemukan untuk kamar ini");
  if (tenant.status !== "ACTIVE") throw new Error("Hanya penghuni aktif yang bisa ditagihkan");

  const pendingBillings = await prisma.utilityBilling.findMany({
    where: {
      roomId: tenant.roomId,
      periodMonth,
      periodYear,
      invoicedAt: null,
    },
    include: { utility: true },
  });

  if (pendingBillings.length === 0) {
    throw new Error("Tidak ada tagihan utility yang belum diterapkan ke invoice");
  }

  return prisma.$transaction(async (tx) => {
    const existingFees = parseAdditionalFees(tenant.additionalFees);
    const { manualFees } = splitFees(existingFees);

    const newUtilityFees: AdditionalFee[] = pendingBillings.map((b) => ({
      name: utilityFeeLabel(b.utility.utilityName, b.periodMonth, b.periodYear),
      amount: parseAmount(b.totalAmount),
      utilityBillingId: b.id,
    }));

    const billingIds = new Set(newUtilityFees.map((f) => f.utilityBillingId));
    const keptUtilityFees = existingFees.filter(
      (f) => f.utilityBillingId && !billingIds.has(f.utilityBillingId)
    );
    const allFees = [...manualFees, ...keptUtilityFees, ...newUtilityFees];

    const total = calcTotalAmount({
      monthlyRent: parseAmount(tenant.monthlyRent),
      dailyPrice: tenant.room.dailyPrice ? parseAmount(tenant.room.dailyPrice) : null,
      isDaily: tenant.isDaily,
      leaseDuration: tenant.leaseDuration || "1 Bulan",
      occupantCount: tenant.occupantCount,
      discount: parseAmount(tenant.discount),
      deposit: parseAmount(tenant.deposit),
      additionalFees: allFees,
      checkIn: tenant.checkIn,
      dueDate: tenant.dueDate,
    });

    const paid = parseAmount(tenant.paidAmount);
    const payStatus: PaymentStatus =
      paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";

    await tx.utilityBilling.updateMany({
      where: { id: { in: pendingBillings.map((b) => b.id) } },
      data: {
        tenantId: tenant.id,
        invoicedAt: new Date(),
      },
    });

    const updated = await tx.tenant.update({
      where: { id: tenant.id },
      data: {
        additionalFees: allFees as unknown as Prisma.InputJsonValue,
        totalAmount: total,
        paymentStatus: payStatus,
      },
      include: { user: true, room: true },
    });

    return {
      tenant: updated,
      appliedCount: pendingBillings.length,
      addedAmount: newUtilityFees.reduce((s, f) => s + f.amount, 0),
      billings: pendingBillings,
    };
  });
}

/** Alokasikan pembayaran ke tagihan utility (dibayar dulu sebelum sewa) */
export async function allocateUtilityPayment(
  tx: TxClient,
  tenantId: number,
  paymentAmount: number
): Promise<{ utilityPaid: number; allocations: Array<{ billingId: number; amount: number; category: string }> }> {
  const billings = await tx.utilityBilling.findMany({
    where: {
      tenantId,
      invoicedAt: { not: null },
      paymentStatus: { not: "PAID" },
    },
    include: { utility: true },
    orderBy: { id: "asc" },
  });

  let remaining = paymentAmount;
  const allocations: Array<{ billingId: number; amount: number; category: string }> = [];
  let utilityPaid = 0;

  for (const bill of billings) {
    if (remaining <= 0) break;
    const owed = Math.max(0, parseAmount(bill.totalAmount) - parseAmount(bill.paidAmount));
    if (owed <= 0) continue;

    const pay = Math.min(remaining, owed);
    const newPaid = parseAmount(bill.paidAmount) + pay;
    const newStatus: PaymentStatus =
      newPaid >= parseAmount(bill.totalAmount) ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

    await tx.utilityBilling.update({
      where: { id: bill.id },
      data: { paidAmount: newPaid, paymentStatus: newStatus },
    });

    allocations.push({
      billingId: bill.id,
      amount: pay,
      category: FINANCE_CATEGORY_MAP[bill.utility.utilityType] || "Utilitas",
    });
    utilityPaid += pay;
    remaining -= pay;
  }

  return { utilityPaid, allocations };
}

export function getFinanceCategoryForUtility(type: UtilityType): string {
  return FINANCE_CATEGORY_MAP[type] || "Utilitas";
}
