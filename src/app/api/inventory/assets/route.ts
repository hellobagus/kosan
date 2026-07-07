import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffModule } from "@/lib/api-auth";
import { deployAssetToRoom, deployAssetToSharedArea } from "@/lib/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffModule("inventory", "view");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const roomId = searchParams.get("roomId");
    const sharedAreaId = searchParams.get("sharedAreaId");
    const locationType = searchParams.get("locationType");

    const where: Record<string, unknown> = {
      item: { projectId: auth.context.projectId },
    };
    if (status) where.status = status;
    if (roomId) where.roomId = parseInt(roomId);
    if (sharedAreaId) where.sharedAreaId = parseInt(sharedAreaId);
    if (locationType) where.item = { locationType };

    const assets = await prisma.roomAsset.findMany({
      where,
      include: {
        item: { include: { category: true } },
        room: true,
        sharedArea: true,
        tenant: { include: { user: true } },
        utility: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assets);
  } catch (error) {
    console.error("Assets GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireStaffModule("inventory", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.session;

    const { id, action, roomId, sharedAreaId, utilityId } = await request.json();
    if (!id || !action) return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });

    if (action === "deploy") {
      if (!roomId) return NextResponse.json({ error: "Kamar wajib dipilih" }, { status: 400 });
      const asset = await deployAssetToRoom(
        parseInt(id),
        parseInt(roomId),
        utilityId ? parseInt(utilityId) : undefined,
        session.userId
      );
      return NextResponse.json(asset);
    }

    if (action === "deploy_shared") {
      if (!sharedAreaId) return NextResponse.json({ error: "Area bersama wajib dipilih" }, { status: 400 });
      const asset = await deployAssetToSharedArea(
        parseInt(id),
        parseInt(sharedAreaId),
        session.userId
      );
      return NextResponse.json(asset);
    }

    if (action === "reactivate") {
      const { reactivateAsset } = await import("@/lib/inventory-service");
      const asset = await reactivateAsset(parseInt(id), session.userId);
      return NextResponse.json(asset);
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Assets PUT error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
