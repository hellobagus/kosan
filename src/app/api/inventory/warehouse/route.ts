import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffModule } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireStaffModule("inventory", "view");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const stocks = await prisma.warehouseStock.findMany({
      where: { item: { projectId: auth.context.projectId } },
      include: {
        item: { include: { category: true } },
      },
      orderBy: { item: { name: "asc" } },
    });

    const warehouseAssets = await prisma.roomAsset.findMany({
      where: {
        status: "IN_WAREHOUSE",
        item: { projectId: auth.context.projectId },
      },
      include: {
        item: { include: { category: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const entries = await prisma.warehouseEntry.findMany({
      where: { item: { projectId: auth.context.projectId } },
      include: {
        item: true,
        purchase: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ stocks, warehouseAssets, entries });
  } catch (error) {
    console.error("Warehouse GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
