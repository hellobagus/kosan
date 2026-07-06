import { NextRequest, NextResponse } from "next/server";
import { requireProjectContext } from "@/lib/project-context";
import { prisma } from "@/lib/prisma";
import { listBuildings } from "@/lib/organization-service";

export async function GET() {
  const auth = await requireProjectContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const buildings = await listBuildings(auth.context.projectId);
  return NextResponse.json(buildings);
}

export async function POST(request: NextRequest) {
  const auth = await requireProjectContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  if (!body.name || !body.code) {
    return NextResponse.json({ error: "Nama dan kode wajib diisi" }, { status: 400 });
  }

  const building = await prisma.building.create({
    data: {
      projectId: auth.context.projectId,
      name: body.name,
      code: String(body.code).toUpperCase(),
      address: body.address || null,
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : 0,
    },
  });

  return NextResponse.json(building, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await requireProjectContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const id = parseInt(body.id, 10);
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const existing = await prisma.building.findFirst({
    where: { id, projectId: auth.context.projectId },
  });
  if (!existing) return NextResponse.json({ error: "Gedung tidak ditemukan" }, { status: 404 });

  const building = await prisma.building.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code ? String(body.code).toUpperCase() : undefined,
      address: body.address,
      sortOrder: body.sortOrder != null ? parseInt(body.sortOrder, 10) : undefined,
      active: body.active,
    },
  });

  return NextResponse.json(building);
}
