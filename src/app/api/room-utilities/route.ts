import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const where = roomId ? { roomId: parseInt(roomId) } : {};

    const roomUtilities = await prisma.roomUtility.findMany({
      where,
      include: {
        room: { select: { id: true, roomNumber: true, floor: true, status: true } },
        utility: true,
      },
      orderBy: [{ room: { floor: "asc" } }, { room: { roomNumber: "asc" } }],
    });

    return NextResponse.json(roomUtilities);
  } catch (error) {
    console.error("RoomUtilities GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { roomId, utilityId, customAmount, lastReading, active } = body;

    if (!roomId || !utilityId) {
      return NextResponse.json({ error: "Kamar dan utility wajib dipilih" }, { status: 400 });
    }

    const utility = await prisma.utility.findUnique({ where: { id: parseInt(utilityId) } });
    if (!utility) return NextResponse.json({ error: "Utility tidak ditemukan" }, { status: 404 });

    const roomUtility = await prisma.roomUtility.upsert({
      where: {
        roomId_utilityId: {
          roomId: parseInt(roomId),
          utilityId: parseInt(utilityId),
        },
      },
      create: {
        roomId: parseInt(roomId),
        utilityId: parseInt(utilityId),
        customAmount: customAmount ? parseFloat(customAmount) : null,
        lastReading:
          utility.billingMethod === "METER" && lastReading != null
            ? parseFloat(lastReading)
            : null,
        active: active !== false,
      },
      update: {
        customAmount: customAmount !== undefined ? (customAmount ? parseFloat(customAmount) : null) : undefined,
        lastReading:
          lastReading !== undefined
            ? lastReading != null
              ? parseFloat(lastReading)
              : null
            : undefined,
        active: active !== undefined ? Boolean(active) : undefined,
      },
      include: {
        room: { select: { id: true, roomNumber: true, floor: true } },
        utility: true,
      },
    });

    return NextResponse.json(roomUtility, { status: 201 });
  } catch (error) {
    console.error("RoomUtilities POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, customAmount, lastReading, active } = body;
    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const roomUtility = await prisma.roomUtility.update({
      where: { id: parseInt(id) },
      data: {
        ...(customAmount !== undefined && { customAmount: customAmount ? parseFloat(customAmount) : null }),
        ...(lastReading !== undefined && { lastReading: lastReading != null ? parseFloat(lastReading) : null }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
      include: {
        room: { select: { id: true, roomNumber: true, floor: true } },
        utility: true,
      },
    });

    return NextResponse.json(roomUtility);
  } catch (error) {
    console.error("RoomUtilities PUT error:", error);
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

    await prisma.roomUtility.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Utility kamar berhasil dihapus" });
  } catch (error) {
    console.error("RoomUtilities DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
