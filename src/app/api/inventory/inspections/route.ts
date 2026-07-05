import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { inspectCheckoutAssets } from "@/lib/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    const where = tenantId ? { tenantId: parseInt(tenantId) } : {};

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
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tenantId, inspections } = await request.json();
    if (!tenantId || !inspections || inspections.length === 0) {
      return NextResponse.json({ error: "Data inspeksi wajib diisi" }, { status: 400 });
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
