import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessTenantRecord,
  isAuthFailure,
  requireSession,
  requireStaffModule,
} from "@/lib/api-auth";
import { isStaffRole } from "@/lib/rbac";
import { getTenantCheckoutAssets } from "@/lib/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    if (!tenantId) return NextResponse.json({ error: "tenantId wajib" }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(tenantId) },
      select: { userId: true },
    });
    if (!tenant) return NextResponse.json({ error: "Penghuni tidak ditemukan" }, { status: 404 });

    if (isStaffRole(session.role)) {
      const auth = await requireStaffModule("maintenance", "view");
      if ("error" in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    } else if (!canAccessTenantRecord(session, tenant.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await getTenantCheckoutAssets(parseInt(tenantId));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Checkout readiness GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
