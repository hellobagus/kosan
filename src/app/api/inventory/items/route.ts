import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationType = searchParams.get("locationType");

    const where = locationType ? { locationType: locationType as "WAREHOUSE" | "ROOM" | "SHARED" | "BUILDING" } : {};

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        category: true,
        warehouseStock: true,
        _count: { select: { assets: true } },
      },
      orderBy: [{ locationType: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Items GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sku, name, categoryId, locationType, unit, unitPrice, description, active } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama barang wajib diisi" }, { status: 400 });

    const item = await prisma.inventoryItem.create({
      data: {
        sku: sku || null,
        name,
        categoryId: categoryId ? parseInt(categoryId) : null,
        locationType: locationType || "ROOM",
        unit: unit || "unit",
        unitPrice: parseFloat(unitPrice || 0),
        description: description || null,
        active: active !== false,
      },
      include: { category: true },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Items POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, sku, name, categoryId, locationType, unit, unitPrice, description, active } = await request.json();
    if (!id || !name) return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });

    const item = await prisma.inventoryItem.update({
      where: { id: parseInt(id) },
      data: {
        sku: sku || null,
        name,
        categoryId: categoryId ? parseInt(categoryId) : null,
        locationType: locationType || undefined,
        unit: unit || "unit",
        unitPrice: parseFloat(unitPrice || 0),
        description: description || null,
        active: active !== false,
      },
      include: { category: true, warehouseStock: true },
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error("Items PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.inventoryItem.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Barang berhasil dihapus" });
  } catch (error) {
    console.error("Items DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
