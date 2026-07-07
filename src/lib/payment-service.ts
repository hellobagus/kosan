import { PaymentMethod, PaymentRecordStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseAmount } from "@/lib/tenant-utils";
import { allocateUtilityPayment } from "@/lib/utility-invoice-service";

type TxClient = Prisma.TransactionClient;

export function generatePaymentOrderId(tenantId: number): string {
  return `KOSANKU-${tenantId}-${Date.now()}`;
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    CASH: "Tunai",
    TRANSFER: "Transfer",
    MIDTRANS: "Midtrans",
  };
  return labels[method];
}

export async function applySuccessfulPayment(
  tx: TxClient,
  params: {
    tenantId: number;
    amount: number;
    method: PaymentMethod;
    orderId: string;
    transactionId?: string | null;
    notes?: string | null;
    createdBy?: number | null;
    createdByName?: string | null;
  }
) {
  const payment = await tx.payment.findUnique({ where: { orderId: params.orderId } });
  if (!payment) {
    throw new Error("Pembayaran tidak ditemukan");
  }
  if (payment.status === "SUCCESS") {
    return payment;
  }

  const tenant = await tx.tenant.findUnique({
    where: { id: params.tenantId },
    include: { user: true, room: true },
  });
  if (!tenant) {
    throw new Error("Penghuni tidak ditemukan");
  }

  const total = parseAmount(tenant.totalAmount || tenant.monthlyRent);
  const currentPaid = parseAmount(tenant.paidAmount);
  const newPaid = Math.min(currentPaid + params.amount, total);
  const payStatus = newPaid >= total ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCESS",
      transactionId: params.transactionId || payment.transactionId,
      notes: params.notes ?? payment.notes,
      approvedAt: new Date(),
      approvedByName: params.createdByName ?? payment.approvedByName,
      updatedByName: params.createdByName ?? payment.updatedByName,
    },
  });

  await tx.tenant.update({
    where: { id: params.tenantId },
    data: {
      paidAmount: newPaid,
      paymentStatus: payStatus,
      lastPaymentDate: new Date(),
      updatedByName: params.createdByName ?? tenant.updatedByName,
    },
  });

  const { utilityPaid, allocations } = await allocateUtilityPayment(
    tx,
    params.tenantId,
    params.amount
  );
  const rentPaid = Math.max(0, params.amount - utilityPaid);

  if (rentPaid > 0) {
    await tx.finance.create({
      data: {
        type: "INCOME",
        amount: rentPaid,
        description: `Pembayaran ${getPaymentMethodLabel(params.method)} - ${tenant.user.name} (Kamar ${tenant.room.roomNumber})`,
        category: "Sewa",
        transactionDate: new Date(),
        tenantId: params.tenantId,
        roomId: tenant.roomId,
        createdBy: params.createdBy ?? null,
        createdByName: params.createdByName ?? null,
        updatedByName: params.createdByName ?? null,
      },
    });
  }

  for (const alloc of allocations) {
    await tx.finance.create({
      data: {
        type: "INCOME",
        amount: alloc.amount,
        description: `Pembayaran ${alloc.category} - ${tenant.user.name} (Kamar ${tenant.room.roomNumber})`,
        category: alloc.category,
        transactionDate: new Date(),
        tenantId: params.tenantId,
        roomId: tenant.roomId,
        createdBy: params.createdBy ?? null,
        createdByName: params.createdByName ?? null,
        updatedByName: params.createdByName ?? null,
      },
    });
  }

  return tx.payment.findUnique({ where: { id: payment.id } });
}

export async function recordManualPayment(params: {
  tenantId: number;
  amount: number;
  method: "CASH" | "TRANSFER";
  notes?: string;
  createdBy?: number;
  createdByName?: string;
}) {
  if (params.amount <= 0) {
    throw new Error("Nominal pembayaran harus lebih dari 0");
  }

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: params.tenantId },
      include: { user: true, room: true },
    });
    if (!tenant) throw new Error("Penghuni tidak ditemukan");

    const total = parseAmount(tenant.totalAmount || tenant.monthlyRent);
    const currentPaid = parseAmount(tenant.paidAmount);
    const remaining = Math.max(0, total - currentPaid);
    if (remaining <= 0) throw new Error("Tagihan penghuni sudah lunas");
    if (params.amount > remaining) {
      throw new Error(`Nominal melebihi sisa tagihan (${remaining.toLocaleString("id-ID")})`);
    }

    const orderId = generatePaymentOrderId(params.tenantId);
    await tx.payment.create({
      data: {
        tenantId: params.tenantId,
        amount: params.amount,
        method: params.method,
        status: "PENDING",
        orderId,
        notes: params.notes || null,
        createdByName: params.createdByName ?? null,
        updatedByName: params.createdByName ?? null,
      },
    });

    const payment = await applySuccessfulPayment(tx, {
      tenantId: params.tenantId,
      amount: params.amount,
      method: params.method,
      orderId,
      notes: params.notes,
      createdBy: params.createdBy,
      createdByName: params.createdByName,
    });

    const updatedTenant = await tx.tenant.findUnique({
      where: { id: params.tenantId },
      include: { user: true, room: true },
    });

    return { payment, tenant: updatedTenant };
  });
}

export async function createMidtransPayment(params: {
  tenantId: number;
  amount: number;
  notes?: string;
  createdBy?: number;
  createdByName?: string;
}) {
  if (params.amount <= 0) {
    throw new Error("Nominal pembayaran harus lebih dari 0");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    include: { user: true, room: true },
  });
  if (!tenant) throw new Error("Penghuni tidak ditemukan");

  const total = parseAmount(tenant.totalAmount || tenant.monthlyRent);
  const currentPaid = parseAmount(tenant.paidAmount);
  const remaining = Math.max(0, total - currentPaid);
  if (remaining <= 0) throw new Error("Tagihan penghuni sudah lunas");
  if (params.amount > remaining) {
    throw new Error(`Nominal melebihi sisa tagihan (${remaining.toLocaleString("id-ID")})`);
  }

  const orderId = generatePaymentOrderId(params.tenantId);
  const payment = await prisma.payment.create({
    data: {
      tenantId: params.tenantId,
      amount: params.amount,
      method: "MIDTRANS",
      status: "PENDING",
      orderId,
      notes: params.notes || null,
      createdByName: params.createdByName ?? null,
      updatedByName: params.createdByName ?? null,
    },
  });

  return { payment, tenant, orderId };
}

export async function updateMidtransPaymentStatus(params: {
  orderId: string;
  transactionId?: string;
  transactionStatus: string;
  createdBy?: number | null;
  createdByName?: string | null;
}) {
  const payment = await prisma.payment.findUnique({ where: { orderId: params.orderId } });
  if (!payment) return null;
  if (payment.status === "SUCCESS") return payment;

  if (params.transactionStatus === "pending") {
    return prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: params.transactionId || payment.transactionId },
    });
  }

  if (["capture", "settlement"].includes(params.transactionStatus)) {
    return prisma.$transaction((tx) =>
      applySuccessfulPayment(tx, {
        tenantId: payment.tenantId,
        amount: parseAmount(payment.amount),
        method: "MIDTRANS",
        orderId: payment.orderId,
        transactionId: params.transactionId,
        notes: payment.notes,
        createdBy: params.createdBy,
      createdByName: params.createdByName,
      })
    );
  }

  const failedStatus: PaymentRecordStatus =
    params.transactionStatus === "expire" ? "EXPIRED" : "FAILED";

  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: failedStatus,
      transactionId: params.transactionId || payment.transactionId,
      updatedByName: params.createdByName ?? payment.updatedByName,
    },
  });
}
