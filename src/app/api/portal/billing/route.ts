import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireSession } from "@/lib/api-auth";
import { buildInvoiceBreakdown } from "@/lib/utility-invoice-service";
import { parseAmount } from "@/lib/tenant-utils";
import {
  getTenantEntityId,
  getTenantProjectId,
  requireTenantPortalSession,
} from "@/lib/tenant-portal-service";
import { getBankAccounts, getProjectProfileForRoom } from "@/lib/settings-service";

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
    const projectId = getTenantProjectId(tenant);
    const entityId = getTenantEntityId(tenant);
    const project = tenant.room.floorRef?.building.project;
    const entity = project?.entity;

    const [invoiceBreakdown, utilityBillings, profile] = await Promise.all([
      buildInvoiceBreakdown(tenant.id),
      prisma.utilityBilling.findMany({
        where: { tenantId: tenant.id },
        include: { utility: true, room: { select: { roomNumber: true } } },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        take: 24,
      }),
      getProjectProfileForRoom(tenant.roomId),
    ]);
    const bankAccounts = await getBankAccounts(entityId ?? profile.entityId);

    const schedule = utilityBillings.map((bill) => ({
      id: bill.id,
      periodMonth: bill.periodMonth,
      periodYear: bill.periodYear,
      utilityName: bill.utility.utilityName,
      totalAmount: parseAmount(bill.totalAmount),
      paidAmount: parseAmount(bill.paidAmount),
      paymentStatus: bill.paymentStatus,
      status: bill.invoicedAt ? "TERAPKAN_KE_INVOICE" : "TERCATAT",
      dueLabel: `${bill.periodMonth}/${bill.periodYear}`,
    }));

    const invoice = {
      ...invoiceBreakdown,
      profile: {
        name: profile.name,
        code: profile.code,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        logoUrl: profile.logoUrl,
        paymentNotes: profile.paymentNotes,
      },
      bankAccounts: bankAccounts.map((b) => ({
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        accountHolder: b.accountHolder,
      })),
    };

    return NextResponse.json({
      tenantId: tenant.id,
      tenant: {
        id: tenant.id,
        name: tenant.user.name,
        roomNumber: tenant.room.roomNumber,
        checkIn: tenant.checkIn,
        dueDate: tenant.dueDate,
        leaseDuration: tenant.leaseDuration,
        paymentStatus: tenant.paymentStatus,
        paidAmount: tenant.paidAmount,
        totalAmount: tenant.totalAmount,
        monthlyRent: tenant.monthlyRent,
        invoiceNumber: tenant.invoiceNumber,
      },
      invoice,
      schedule,
      summary: {
        rentDue: invoiceBreakdown.lines.rent,
        utilityDue: invoiceBreakdown.lines.utilityFees.reduce((s, f) => s + f.amount, 0),
        grandTotal: invoiceBreakdown.total,
        paidAmount: invoiceBreakdown.paid,
        remaining: invoiceBreakdown.remaining,
        paymentStatus: tenant.paymentStatus,
        dueDate: tenant.dueDate,
      },
      organization: {
        entityId,
        projectId,
        entityName: entity?.name ?? null,
        entityCode: entity?.code ?? null,
        projectName: project?.name ?? null,
        projectCode: project?.code ?? null,
      },
    });
  } catch (error) {
    console.error("Portal billing GET error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
