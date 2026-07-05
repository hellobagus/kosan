import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.inventoryCategory.findMany({
      include: { _count: { select: { items: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });

    const category = await prisma.inventoryCategory.create({
      data: { name, description: description || null },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Categories POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, description } = await request.json();
    if (!id || !name) return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });

    const category = await prisma.inventoryCategory.update({
      where: { id: parseInt(id) },
      data: { name, description: description || null },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("Categories PUT error:", error);
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

    await prisma.inventoryCategory.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Kategori berhasil dihapus" });
  } catch (error) {
    console.error("Categories DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
