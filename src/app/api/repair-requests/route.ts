import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireProjectContext } from "@/lib/project-context";
import {
  REPAIR_REQUEST_INCLUDE,
  assertRepairInProject,
  cancelTenantRepairRequest,
  completeTenantRepair,
  scheduleRepairInspection,
  startTenantRepair,
} from "@/lib/repair-request-service";
import { prisma } from "@/lib/prisma";
import { hasModuleAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasModuleAccess(session.role, "maintenance", "view")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const requests = await prisma.tenantRepairRequest.findMany({
      where: {
        projectId: auth.context.projectId,
        ...(status ? { status: status as "REQUESTED" | "INSPECTING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" } : {}),
      },
      include: REPAIR_REQUEST_INCLUDE,
      orderBy: [{ status: "asc" }, { reportedAt: "desc" }],
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Repair requests GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasModuleAccess(session.role, "maintenance", "create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, action, inspectionNotes, resolutionNotes, cost } = body;
    if (!id || !action) {
      return NextResponse.json({ error: "ID dan action wajib" }, { status: 400 });
    }

    const requestId = parseInt(String(id), 10);
    await assertRepairInProject(requestId, auth.context.projectId);

    if (action === "inspect") {
      const updated = await scheduleRepairInspection(requestId, {
        inspectionNotes,
        userId: session.userId,
      });
      return NextResponse.json(updated);
    }

    if (action === "start") {
      const updated = await startTenantRepair(requestId, session.userId);
      return NextResponse.json(updated);
    }

    if (action === "complete") {
      const updated = await completeTenantRepair(requestId, {
        resolutionNotes,
        cost: cost != null ? parseFloat(String(cost)) : undefined,
        userId: session.userId,
      });
      return NextResponse.json(updated);
    }

    if (action === "cancel") {
      const updated = await cancelTenantRepairRequest(requestId, session.userId, resolutionNotes);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Repair requests PUT error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
