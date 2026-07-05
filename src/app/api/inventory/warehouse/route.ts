import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stocks = await prisma.warehouseStock.findMany({
      include: {
        item: { include: { category: true } },
      },
      orderBy: { item: { name: "asc" } },
    });

    const warehouseAssets = await prisma.roomAsset.findMany({
      where: { status: "IN_WAREHOUSE" },
      include: {
        item: { include: { category: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const entries = await prisma.warehouseEntry.findMany({
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
