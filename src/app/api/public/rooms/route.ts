import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseFacilityLines,
  parseSuggestedDeposit,
  resolvePublicProject,
} from "@/lib/public-project";
import { resolveRoomZone } from "@/lib/room-zones";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("project");
    const roomId = searchParams.get("id");
    const project = await resolvePublicProject(code);
    if (!project) {
      return NextResponse.json({ error: "Kosan belum dikonfigurasi" }, { status: 404 });
    }

    if (roomId) {
      const room = await prisma.room.findFirst({
        where: {
          id: parseInt(roomId, 10),
          floorRef: { building: { projectId: project.id } },
        },
        include: {
          floorRef: { select: { name: true, level: true } },
          template: { select: { name: true } },
        },
      });
      if (!room) {
        return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json(serializeRoom(room));
    }

    const rooms = await prisma.room.findMany({
      where: {
        status: "AVAILABLE",
        price: { gt: 0 },
        floorRef: { building: { projectId: project.id } },
      },
      include: {
        floorRef: { select: { name: true, level: true } },
        template: { select: { name: true } },
      },
      orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
    });

    return NextResponse.json({
      projectCode: project.code,
      projectName: project.name,
      rooms: rooms.map(serializeRoom),
    });
  } catch (error) {
    console.error("Public rooms error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function serializeRoom(room: {
  id: number;
  roomNumber: string;
  floor: number;
  price: { toString(): string };
  dailyPrice: { toString(): string } | null;
  facilities: string | null;
  equipment: string | null;
  description: string | null;
  status: string;
  floorRef: { name: string; level: number } | null;
  template: { name: string } | null;
}) {
  const zone = resolveRoomZone({
    floorName: room.floorRef?.name,
    floorLevel: room.floorRef?.level ?? room.floor,
    roomNumber: room.roomNumber,
  });

  return {
    id: room.id,
    roomNumber: room.roomNumber,
    floor: room.floor,
    floorName: room.floorRef?.name || null,
    price: room.price.toString(),
    dailyPrice: room.dailyPrice?.toString() ?? null,
    facilities: parseFacilityLines(room.facilities),
    facilitiesRaw: room.facilities,
    equipment: room.equipment,
    description: room.description,
    status: room.status,
    type: room.template?.name || null,
    suggestedDeposit: parseSuggestedDeposit(room.equipment),
    zone: {
      key: zone.key,
      label: zone.label,
      hex: zone.hex,
    },
  };
}
