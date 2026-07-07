import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createRoomTransferRequest, listRoomTransfers } from "@/lib/room-transfer-service";
import { requireProjectContext } from "@/lib/project-context";
import { hasModuleAccess } from "@/lib/rbac";

export async function GET() {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const transfers = await listRoomTransfers(auth.context.projectId);
    return NextResponse.json(transfers);
  } catch (error) {
    console.error("RoomTransfers GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasModuleAccess(session.role, "tenant", "create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const transfer = await createRoomTransferRequest({
      tenantId: parseInt(String(body.tenantId)),
      toRoomId: parseInt(String(body.toRoomId)),
      effectiveDate: body.effectiveDate,
      reason: body.reason,
      requestedBy: session.userId,
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error("RoomTransfers POST error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
