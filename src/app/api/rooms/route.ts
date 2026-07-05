import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where = status ? { status: status as "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" } : {};

    const rooms = await prisma.room.findMany({
      where,
      include: {
        template: { select: { id: true, name: true } },
        tenants: {
          where: { status: "ACTIVE" },
          include: { user: true },
        },
      },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Rooms GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { roomNumber, floor, price, dailyPrice, facilities, equipment, description } = body;

    if (!roomNumber || !price) {
      return NextResponse.json({ error: "Nomor kamar dan harga wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.room.findUnique({ where: { roomNumber } });
    if (existing) {
      return NextResponse.json({ error: "Nomor kamar sudah ada" }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: {
        roomNumber,
        floor: parseInt(floor) || 1,
        price: parseFloat(price),
        dailyPrice: dailyPrice ? parseFloat(dailyPrice) : null,
        facilities: facilities || null,
        equipment: equipment || null,
        description: description || null,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Rooms POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    const room = await prisma.room.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        price: data.price ? parseFloat(data.price) : undefined,
        dailyPrice: data.dailyPrice !== undefined
          ? (data.dailyPrice ? parseFloat(data.dailyPrice) : null)
          : undefined,
        floor: data.floor ? parseInt(data.floor) : undefined,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("Rooms PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const activeTenant = await prisma.tenant.findFirst({
      where: { roomId: parseInt(id), status: "ACTIVE" },
    });
    if (activeTenant) {
      return NextResponse.json({ error: "Kamar masih ditempati penghuni aktif" }, { status: 400 });
    }

    await prisma.room.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Kamar berhasil dihapus" });
  } catch (error) {
    console.error("Rooms DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
