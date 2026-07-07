import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffModule } from "@/lib/api-auth";
import { getRoomTemplateCompliance } from "@/lib/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffModule("inventory", "view");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (roomId) {
      const compliance = await getRoomTemplateCompliance(parseInt(roomId));
      return NextResponse.json(compliance);
    }

    const templates = await prisma.roomTemplate.findMany({
      include: {
        items: { include: { item: { include: { category: true } } } },
        rooms: { select: { id: true, roomNumber: true } },
        _count: { select: { rooms: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Templates GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffModule("inventory", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { name, description, items } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama template wajib diisi" }, { status: 400 });

    const template = await prisma.roomTemplate.create({
      data: {
        name,
        description: description || null,
        items: items?.length
          ? {
              create: items.map((i: { itemId: number; quantity?: number; required?: boolean }) => ({
                itemId: parseInt(String(i.itemId)),
                quantity: parseInt(String(i.quantity || 1)),
                required: i.required !== false,
              })),
            }
          : undefined,
      },
      include: { items: { include: { item: true } } },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Templates POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireStaffModule("inventory", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, name, description, active, items, assignRoomIds } = await request.json();
    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const template = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.roomTemplateItem.deleteMany({ where: { templateId: parseInt(id) } });
        if (items.length > 0) {
          await tx.roomTemplateItem.createMany({
            data: items.map((i: { itemId: number; quantity?: number; required?: boolean }) => ({
              templateId: parseInt(id),
              itemId: parseInt(String(i.itemId)),
              quantity: parseInt(String(i.quantity || 1)),
              required: i.required !== false,
            })),
          });
        }
      }

      if (assignRoomIds) {
        await tx.room.updateMany({
          where: { templateId: parseInt(id) },
          data: { templateId: null },
        });
        if (assignRoomIds.length > 0) {
          await tx.room.updateMany({
            where: { id: { in: assignRoomIds.map((r: number) => parseInt(String(r))) } },
            data: { templateId: parseInt(id) },
          });
        }
      }

      return tx.roomTemplate.update({
        where: { id: parseInt(id) },
        data: {
          name: name || undefined,
          description: description !== undefined ? (description || null) : undefined,
          active: active !== undefined ? active : undefined,
        },
        include: {
          items: { include: { item: true } },
          rooms: { select: { id: true, roomNumber: true } },
        },
      });
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Templates PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireStaffModule("inventory", "full");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.room.updateMany({ where: { templateId: parseInt(id) }, data: { templateId: null } });
      await tx.roomTemplate.delete({ where: { id: parseInt(id) } });
    });
    return NextResponse.json({ message: "Template berhasil dihapus" });
  } catch (error) {
    console.error("Templates DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
