import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildInventoryTextLines, deployInventoryItemsToRoom } from "@/lib/inventory-service";
import { requireProjectContext, roomProjectFilter } from "@/lib/project-context";

async function resolveInventoryTexts(
  body: {
    facilities?: string;
    equipment?: string;
    inventoryFacilities?: Array<{ itemId: number; quantity: number }>;
    inventoryEquipment?: Array<{ itemId: number; quantity: number }>;
    customFacilities?: string;
    customEquipment?: string;
  }
) {
  const hasInventory = (body.inventoryFacilities?.length || 0) > 0 || (body.inventoryEquipment?.length || 0) > 0;
  if (!hasInventory) {
    return {
      facilities: body.facilities || null,
      equipment: body.equipment || null,
      deployItems: [] as Array<{ itemId: number; quantity: number }>,
    };
  }

  const itemIds = [
    ...(body.inventoryFacilities || []).map((i) => i.itemId),
    ...(body.inventoryEquipment || []).map((i) => i.itemId),
  ];
  const items = itemIds.length
    ? await prisma.inventoryItem.findMany({ where: { id: { in: itemIds } } })
    : [];
  const nameMap = new Map(items.map((i) => [i.id, i.name]));

  const facilityLines = (body.inventoryFacilities || []).map((s) => ({
    name: nameMap.get(s.itemId) || `Item #${s.itemId}`,
    quantity: s.quantity,
  }));
  const equipmentLines = (body.inventoryEquipment || []).map((s) => ({
    name: nameMap.get(s.itemId) || `Item #${s.itemId}`,
    quantity: s.quantity,
  }));

  const deployItems = [
    ...(body.inventoryFacilities || []),
    ...(body.inventoryEquipment || []),
  ];

  return {
    facilities: buildInventoryTextLines(facilityLines, body.customFacilities) || body.facilities || null,
    equipment: buildInventoryTextLines(equipmentLines, body.customEquipment) || body.equipment || null,
    deployItems,
  };
}

async function resolveFloorId(
  projectId: number,
  floorId?: number | string,
  floorLevel?: number | string
): Promise<number | null> {
  if (floorId) {
    const floor = await prisma.floor.findFirst({
      where: { id: parseInt(String(floorId), 10), building: { projectId } },
    });
    return floor?.id ?? null;
  }
  const level = parseInt(String(floorLevel || 1), 10);
  const floor = await prisma.floor.findFirst({
    where: { level, building: { projectId } },
    orderBy: { id: "asc" },
  });
  return floor?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      ...roomProjectFilter(auth.context.projectId),
    };
    if (status) where.status = status;

    const rooms = await prisma.room.findMany({
      where,
      include: {
        template: { select: { id: true, name: true } },
        floorRef: { select: { id: true, name: true, level: true, building: { select: { id: true, name: true, code: true } } } },
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
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      roomNumber, floor, floorId, price, dailyPrice, facilities, equipment, description,
      templateId, inventoryFacilities, inventoryEquipment, customFacilities, customEquipment, autoDeploy,
    } = body;

    if (!roomNumber || !price) {
      return NextResponse.json({ error: "Nomor kamar dan harga wajib diisi" }, { status: 400 });
    }

    const resolvedFloorId = await resolveFloorId(auth.context.projectId, floorId, floor);
    if (!resolvedFloorId) {
      return NextResponse.json({ error: "Lantai tidak ditemukan. Buat gedung/lantai di Pengaturan > Struktur Organisasi" }, { status: 400 });
    }

    const floorRow = await prisma.floor.findUnique({ where: { id: resolvedFloorId } });
    const existing = await prisma.room.findFirst({
      where: { floorId: resolvedFloorId, roomNumber },
    });
    if (existing) {
      return NextResponse.json({ error: "Nomor kamar sudah ada di lantai ini" }, { status: 400 });
    }

    const resolved = await resolveInventoryTexts({
      facilities, equipment, inventoryFacilities, inventoryEquipment, customFacilities, customEquipment,
    });

    const room = await prisma.room.create({
      data: {
        roomNumber,
        floorId: resolvedFloorId,
        floor: floorRow?.level || parseInt(floor) || 1,
        price: parseFloat(price),
        dailyPrice: dailyPrice ? parseFloat(dailyPrice) : null,
        facilities: resolved.facilities,
        equipment: resolved.equipment,
        description: description || null,
        templateId: templateId ? parseInt(templateId) : null,
      },
      include: {
        template: { select: { id: true, name: true } },
        floorRef: { select: { id: true, name: true, level: true } },
      },
    });

    let deployResult = null;
    if (autoDeploy && resolved.deployItems.length > 0) {
      deployResult = await deployInventoryItemsToRoom(room.id, resolved.deployItems, auth.session.userId);
    }

    return NextResponse.json({ ...room, deployResult }, { status: 201 });
  } catch (error) {
    console.error("Rooms POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { id, templateId, floorId, inventoryFacilities, inventoryEquipment, customFacilities, customEquipment, autoDeploy, ...data } = body;

    const roomCheck = await prisma.room.findFirst({
      where: { id: parseInt(id), ...roomProjectFilter(auth.context.projectId) },
    });
    if (!roomCheck) return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 404 });

    const resolved = await resolveInventoryTexts({
      facilities: data.facilities,
      equipment: data.equipment,
      inventoryFacilities,
      inventoryEquipment,
      customFacilities,
      customEquipment,
    });

    let newFloorId = roomCheck.floorId;
    if (floorId || data.floor) {
      const resolvedFloorId = await resolveFloorId(auth.context.projectId, floorId, data.floor);
      if (resolvedFloorId) newFloorId = resolvedFloorId;
    }
    const floorRow = newFloorId ? await prisma.floor.findUnique({ where: { id: newFloorId } }) : null;

    const room = await prisma.room.update({
      where: { id: parseInt(id) },
      data: {
        roomNumber: data.roomNumber,
        floorId: newFloorId,
        floor: floorRow?.level ?? (data.floor ? parseInt(data.floor) : undefined),
        price: data.price ? parseFloat(data.price) : undefined,
        dailyPrice: data.dailyPrice !== undefined
          ? (data.dailyPrice ? parseFloat(data.dailyPrice) : null)
          : undefined,
        status: data.status,
        facilities: resolved.facilities !== null ? resolved.facilities : data.facilities,
        equipment: resolved.equipment !== null ? resolved.equipment : data.equipment,
        description: data.description !== undefined ? (data.description || null) : undefined,
        templateId: templateId !== undefined ? (templateId ? parseInt(templateId) : null) : undefined,
      },
      include: {
        template: { select: { id: true, name: true } },
        floorRef: { select: { id: true, name: true, level: true } },
      },
    });

    let deployResult = null;
    if (autoDeploy && resolved.deployItems.length > 0) {
      deployResult = await deployInventoryItemsToRoom(room.id, resolved.deployItems, auth.session.userId);
    }

    return NextResponse.json({ ...room, deployResult });
  } catch (error) {
    console.error("Rooms PUT error:", error);
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

    const roomCheck = await prisma.room.findFirst({
      where: { id: parseInt(id), ...roomProjectFilter(auth.context.projectId) },
    });
    if (!roomCheck) return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 404 });

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
