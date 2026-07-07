import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireSession } from "@/lib/api-auth";
import { getPaymentMethodLabel } from "@/lib/payment-service";
import { parseAmount } from "@/lib/tenant-utils";
import { requireTenantPortalSession } from "@/lib/tenant-portal-service";

export async function GET() {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const auth = await requireTenantPortalSession(session);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { tenant } = auth;

    const [payments, utilityBillings] = await Promise.all([
      prisma.payment.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.utilityBilling.findMany({
        where: { tenantId: tenant.id },
        include: { utility: true },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        take: 36,
      }),
    ]);

    return NextResponse.json({
      invoiceNumber: tenant.invoiceNumber,
      currentPaymentStatus: tenant.paymentStatus,
      lastPaymentDate: tenant.lastPaymentDate,
      payments: payments.map((p) => ({
        id: p.id,
        amount: parseAmount(p.amount),
        method: p.method,
        methodLabel: getPaymentMethodLabel(p.method),
        status: p.status,
        orderId: p.orderId,
        notes: p.notes,
        createdAt: p.createdAt,
        approvedAt: p.approvedAt,
      })),
      utilityBillings: utilityBillings.map((b) => ({
        id: b.id,
        utilityName: b.utility.utilityName,
        periodMonth: b.periodMonth,
        periodYear: b.periodYear,
        totalAmount: parseAmount(b.totalAmount),
        paidAmount: parseAmount(b.paidAmount),
        paymentStatus: b.paymentStatus,
        invoicedAt: b.invoicedAt,
      })),
    });
  } catch (error) {
    console.error("Portal billing history GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
