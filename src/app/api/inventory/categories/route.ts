import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectContext } from "@/lib/project-context";

export async function GET() {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const categories = await prisma.inventoryCategory.findMany({
      where: { projectId: auth.context.projectId },
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
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { name, description, locationType } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });

    const category = await prisma.inventoryCategory.create({
      data: {
        projectId: auth.context.projectId,
        name,
        description: description || null,
        locationType: locationType || "ROOM",
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Categories POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, name, description, locationType } = await request.json();
    if (!id || !name) return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });

    const existing = await prisma.inventoryCategory.findFirst({
      where: { id: parseInt(id), projectId: auth.context.projectId },
    });
    if (!existing) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });

    const category = await prisma.inventoryCategory.update({
      where: { id: parseInt(id) },
      data: { name, description: description || null, locationType: locationType || undefined },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("Categories PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await prisma.inventoryCategory.findFirst({
      where: { id: parseInt(id), projectId: auth.context.projectId },
    });
    if (!existing) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });

    await prisma.inventoryCategory.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Kategori berhasil dihapus" });
  } catch (error) {
    console.error("Categories DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
