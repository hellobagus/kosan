import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireSession } from "@/lib/api-auth";
import { createRoomTransferRequest } from "@/lib/room-transfer-service";
import { prisma } from "@/lib/prisma";
import {
  getAvailableRoomsForTenantTransfer,
  getTenantProjectId,
  requireTenantPortalSession,
} from "@/lib/tenant-portal-service";

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
    const project = tenant.room.floorRef?.building.project;
    const entity = project?.entity;

    const [transfers, availableRooms] = await Promise.all([
      prisma.roomTransfer.findMany({
        where: { tenantId: tenant.id },
        include: {
          fromRoom: true,
          toRoom: true,
          tenant: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      getAvailableRoomsForTenantTransfer(tenant),
    ]);

    return NextResponse.json({
      transfers,
      availableRooms,
      tenantId: tenant.id,
      currentRoom: {
        id: tenant.roomId,
        roomNumber: tenant.room.roomNumber,
        floor: tenant.room.floor,
      },
      organization: {
        entityName: entity?.name ?? null,
        entityCode: entity?.code ?? null,
        projectName: project?.name ?? null,
        projectCode: project?.code ?? null,
        projectId: getTenantProjectId(tenant),
      },
    });
  } catch (error) {
    console.error("Portal transfers GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const auth = await requireTenantPortalSession(session);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { toRoomId, effectiveDate, reason } = body;
    if (!toRoomId || !effectiveDate) {
      return NextResponse.json({ error: "Kamar tujuan dan tanggal efektif wajib diisi" }, { status: 400 });
    }

    const parsedRoomId = parseInt(String(toRoomId), 10);
    const projectId = getTenantProjectId(auth.tenant);
    if (!projectId) {
      return NextResponse.json({ error: "Project penghuni tidak ditemukan" }, { status: 400 });
    }

    const allowedRooms = await getAvailableRoomsForTenantTransfer(auth.tenant);
    if (!allowedRooms.some((r) => r.id === parsedRoomId)) {
      return NextResponse.json(
        { error: "Kamar tujuan tidak tersedia atau tidak berada di project yang sama" },
        { status: 400 }
      );
    }

    const transfer = await createRoomTransferRequest({
      tenantId: auth.tenant.id,
      toRoomId: parsedRoomId,
      effectiveDate,
      reason: reason || "Permohonan pindah dari portal penghuni",
      requestedBy: session.userId,
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error("Portal transfers POST error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
