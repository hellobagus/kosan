import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildInventoryTextLines, deployInventoryItemsToRoom } from "@/lib/inventory-service";

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
    const {
      roomNumber, floor, price, dailyPrice, facilities, equipment, description,
      templateId, inventoryFacilities, inventoryEquipment, customFacilities, customEquipment, autoDeploy,
    } = body;

    if (!roomNumber || !price) {
      return NextResponse.json({ error: "Nomor kamar dan harga wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.room.findUnique({ where: { roomNumber } });
    if (existing) {
      return NextResponse.json({ error: "Nomor kamar sudah ada" }, { status: 400 });
    }

    const resolved = await resolveInventoryTexts({
      facilities, equipment, inventoryFacilities, inventoryEquipment, customFacilities, customEquipment,
    });

    const room = await prisma.room.create({
      data: {
        roomNumber,
        floor: parseInt(floor) || 1,
        price: parseFloat(price),
        dailyPrice: dailyPrice ? parseFloat(dailyPrice) : null,
        facilities: resolved.facilities,
        equipment: resolved.equipment,
        description: description || null,
        templateId: templateId ? parseInt(templateId) : null,
      },
      include: { template: { select: { id: true, name: true } } },
    });

    let deployResult = null;
    if (autoDeploy && resolved.deployItems.length > 0) {
      deployResult = await deployInventoryItemsToRoom(room.id, resolved.deployItems, session.userId);
    }

    return NextResponse.json({ ...room, deployResult }, { status: 201 });
  } catch (error) {
    console.error("Rooms POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, templateId, inventoryFacilities, inventoryEquipment, customFacilities, customEquipment, autoDeploy, ...data } = body;

    const resolved = await resolveInventoryTexts({
      facilities: data.facilities,
      equipment: data.equipment,
      inventoryFacilities,
      inventoryEquipment,
      customFacilities,
      customEquipment,
    });

    const room = await prisma.room.update({
      where: { id: parseInt(id) },
      data: {
        roomNumber: data.roomNumber,
        floor: data.floor ? parseInt(data.floor) : undefined,
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
      include: { template: { select: { id: true, name: true } } },
    });

    let deployResult = null;
    if (autoDeploy && resolved.deployItems.length > 0) {
      deployResult = await deployInventoryItemsToRoom(room.id, resolved.deployItems, session.userId);
    }

    return NextResponse.json({ ...room, deployResult });
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
