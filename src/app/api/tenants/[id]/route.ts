import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  canAccessTenantRecord,
  isAuthFailure,
  requireSession,
} from "@/lib/api-auth";
import { requireProjectContext } from "@/lib/project-context";

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
    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        room: { include: { floorRef: { include: { building: true } } } },
        finances: { orderBy: { transactionDate: "desc" } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Penghuni tidak ditemukan" }, { status: 404 });
    }

    if (!canAccessTenantRecord(session, tenant.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.role !== "TENANT") {
      const auth = await requireProjectContext();
      if ("error" in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      if (tenant.room.floorRef?.building.projectId !== auth.context.projectId) {
        return NextResponse.json({ error: "Penghuni tidak termasuk project aktif" }, { status: 403 });
      }
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Tenant GET by id error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
