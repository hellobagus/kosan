import { NextRequest, NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultOrganization } from "@/lib/organization-service";
import { userCanAccessEntity } from "@/lib/access-control";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultOrganization();

  const entityIdParam = request.nextUrl.searchParams.get("entityId");
  const detailId = entityIdParam ? parseInt(entityIdParam, 10) : NaN;

  if (detailId) {
    const allowed = await userCanAccessEntity(session.userId, session.role, detailId);
    if (!allowed) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    const entity = await prisma.entity.findUnique({
      where: { id: detailId },
      include: {
        holding: { select: { id: true, code: true, name: true } },
        projects: {
          where: { active: true },
          orderBy: { code: "asc" },
          include: {
            _count: {
              select: {
                buildings: true,
              },
            },
          },
        },
        bankAccounts: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!entity) return NextResponse.json({ error: "Entity tidak ditemukan" }, { status: 404 });
    return NextResponse.json(entity);
  }

  const holdings = await prisma.holding.findMany({
    where: { active: true },
    include: {
      entities: {
        where: { active: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  if (session.role !== "OWNER") {
    const allowed = await prisma.userEntityAccess.findMany({
      where: { userId: session.userId },
      select: { entityId: true },
    });
    const ids = new Set(allowed.map((a) => a.entityId));
    for (const h of holdings) {
      h.entities = h.entities.filter((e) => ids.has(e.id));
    }
  }

  return NextResponse.json(holdings);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { holdingId, name, code, legalName, address, phone, email, taxId } = body;

  if (!holdingId || !name || !code) {
    return NextResponse.json({ error: "Holding, nama, dan kode wajib diisi" }, { status: 400 });
  }

  const entity = await prisma.entity.create({
    data: {
      holdingId: parseInt(holdingId, 10),
      name,
      code: String(code).toUpperCase(),
      legalName: legalName || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
      taxId: taxId || null,
    },
  });

  return NextResponse.json(entity, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = parseInt(body.id, 10);
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const allowed = await userCanAccessEntity(session.userId, session.role, id);
  if (!allowed) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const entity = await prisma.entity.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code ? String(body.code).toUpperCase() : undefined,
      legalName: body.legalName,
      address: body.address,
      phone: body.phone,
      email: body.email,
      taxId: body.taxId,
      active: body.active,
    },
  });

  return NextResponse.json(entity);
}
