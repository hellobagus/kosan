import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const areas = await prisma.sharedArea.findMany({
      include: {
        assets: {
          where: { status: { not: "RETIRED" } },
          include: { item: { include: { category: true } } },
        },
        _count: { select: { assets: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(areas);
  } catch (error) {
    console.error("SharedAreas GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama area wajib diisi" }, { status: 400 });

    const area = await prisma.sharedArea.create({
      data: { name, description: description || null },
    });
    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    console.error("SharedAreas POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, description, active } = await request.json();
    if (!id || !name) return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });

    const area = await prisma.sharedArea.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description: description || null,
        active: active !== false,
      },
    });
    return NextResponse.json(area);
  } catch (error) {
    console.error("SharedAreas PUT error:", error);
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

    const assetCount = await prisma.roomAsset.count({
      where: { sharedAreaId: parseInt(id), status: { not: "RETIRED" } },
    });
    if (assetCount > 0) {
      return NextResponse.json({ error: "Area masih memiliki asset aktif" }, { status: 400 });
    }

    await prisma.sharedArea.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Area berhasil dihapus" });
  } catch (error) {
    console.error("SharedAreas DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
