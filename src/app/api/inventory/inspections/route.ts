import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessTenantRecord,
  isAuthFailure,
  isTenantSelf,
  requireSession,
  requireStaffModule,
} from "@/lib/api-auth";
import { hasModuleAccess, isStaffRole } from "@/lib/rbac";
import { roomProjectFilter } from "@/lib/project-context";
import { inspectCheckoutAssets } from "@/lib/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    const where: { tenantId?: number; tenant?: { room: ReturnType<typeof roomProjectFilter> } } = {};

    if (isStaffRole(session.role)) {
      const auth = await requireStaffModule("maintenance", "view");
      if ("error" in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      where.tenant = { room: roomProjectFilter(auth.context.projectId) };
      if (tenantId) where.tenantId = parseInt(tenantId);
    } else {
      if (!tenantId) {
        return NextResponse.json({ error: "tenantId wajib" }, { status: 400 });
      }
      const tenant = await prisma.tenant.findUnique({
        where: { id: parseInt(tenantId) },
        select: { userId: true },
      });
      if (!tenant || !canAccessTenantRecord(session, tenant.userId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      where.tenantId = parseInt(tenantId);
    }

    const inspections = await prisma.checkoutInspection.findMany({
      where,
      include: {
        tenant: { include: { user: true } },
        room: true,
        asset: { include: { item: true } },
        inspectedByUser: true,
      },
      orderBy: { inspectedAt: "desc" },
    });
    return NextResponse.json(inspections);
  } catch (error) {
    console.error("Inspections GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const { tenantId, inspections } = await request.json();
    if (!tenantId || !inspections || inspections.length === 0) {
      return NextResponse.json({ error: "Data inspeksi wajib diisi" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(tenantId) },
      select: { userId: true },
    });
    if (!tenant) return NextResponse.json({ error: "Penghuni tidak ditemukan" }, { status: 404 });

    if (isStaffRole(session.role)) {
      const auth = await requireStaffModule("maintenance", "create");
      if ("error" in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    } else if (
      !isTenantSelf(session, tenant.userId) ||
      !hasModuleAccess(session.role, "maintenance", "create")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await inspectCheckoutAssets(
      parseInt(tenantId),
      inspections,
      session.userId
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Inspections POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
