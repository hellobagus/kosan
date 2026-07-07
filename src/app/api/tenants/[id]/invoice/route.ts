import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessBillingRecord, isAuthFailure, requireSession } from "@/lib/api-auth";
import { buildInvoiceBreakdown } from "@/lib/utility-invoice-service";
import { getProjectProfileForRoom, getBankAccounts } from "@/lib/settings-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const { id } = await params;
    const tenantId = parseInt(id, 10);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, userId: true, roomId: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Penghuni tidak ditemukan" }, { status: 404 });
    }
    if (!canAccessBillingRecord(session, tenant.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await getProjectProfileForRoom(tenant.roomId);
    const [breakdown, bankAccounts] = await Promise.all([
      buildInvoiceBreakdown(tenantId),
      getBankAccounts(profile.entityId),
    ]);

    return NextResponse.json({
      ...breakdown,
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
    });
  } catch (error) {
    console.error("Invoice GET error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
