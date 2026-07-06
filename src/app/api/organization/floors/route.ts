import { NextRequest, NextResponse } from "next/server";
import { requireProjectContext } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await requireProjectContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const buildingId = parseInt(body.buildingId, 10);
  const level = parseInt(body.level, 10);

  if (!buildingId || !body.name || !level) {
    return NextResponse.json({ error: "Gedung, nama, dan level wajib diisi" }, { status: 400 });
  }

  const building = await prisma.building.findFirst({
    where: { id: buildingId, projectId: auth.context.projectId },
  });
  if (!building) return NextResponse.json({ error: "Gedung tidak ditemukan" }, { status: 404 });

  const floor = await prisma.floor.create({
    data: {
      buildingId,
      name: body.name,
      level,
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : level,
    },
  });

  return NextResponse.json(floor, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await requireProjectContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const id = parseInt(body.id, 10);
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const existing = await prisma.floor.findFirst({
    where: {
      id,
      building: { projectId: auth.context.projectId },
    },
  });
  if (!existing) return NextResponse.json({ error: "Lantai tidak ditemukan" }, { status: 404 });

  const floor = await prisma.floor.update({
    where: { id },
    data: {
      name: body.name,
      level: body.level != null ? parseInt(body.level, 10) : undefined,
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : undefined,
      active: body.active,
    },
  });

  return NextResponse.json(floor);
}
