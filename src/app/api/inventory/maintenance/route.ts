import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { completeMaintenance, reportAssetDamage } from "@/lib/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where = status
      ? { status: status as "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }
      : {};

    const maintenances = await prisma.assetMaintenance.findMany({
      where,
      include: {
        asset: { include: { item: true } },
        room: true,
        tenant: { include: { user: true } },
        createdByUser: true,
      },
      orderBy: { reportedAt: "desc" },
    });
    return NextResponse.json(maintenances);
  } catch (error) {
    console.error("Maintenance GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { assetId, title, description, tenantId } = await request.json();
    if (!assetId || !title) return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });

    const maintenance = await reportAssetDamage(parseInt(assetId), {
      title,
      description,
      tenantId: tenantId ? parseInt(tenantId) : undefined,
      userId: session.userId,
    });
    return NextResponse.json(maintenance, { status: 201 });
  } catch (error) {
    console.error("Maintenance POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, action, cost, status } = await request.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    if (action === "complete") {
      await completeMaintenance(parseInt(id), { cost: cost ? parseFloat(cost) : undefined, userId: session.userId });
      const maintenance = await prisma.assetMaintenance.findUnique({
        where: { id: parseInt(id) },
        include: { asset: { include: { item: true } }, room: true },
      });
      return NextResponse.json(maintenance);
    }

    if (action === "start") {
      const maintenance = await prisma.assetMaintenance.update({
        where: { id: parseInt(id) },
        data: { status: "IN_PROGRESS" },
        include: { asset: { include: { item: true } }, room: true },
      });
      await prisma.roomAsset.update({
        where: { id: maintenance.assetId },
        data: { status: "MAINTENANCE" },
      });
      return NextResponse.json(maintenance);
    }

    if (status) {
      const maintenance = await prisma.assetMaintenance.update({
        where: { id: parseInt(id) },
        data: { status },
        include: { asset: { include: { item: true } }, room: true },
      });
      return NextResponse.json(maintenance);
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("Maintenance PUT error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
