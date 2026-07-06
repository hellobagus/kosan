import { NextRequest, NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultOrganization } from "@/lib/organization-service";
import { getAccessibleProjects, userCanAccessEntity } from "@/lib/access-control";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultOrganization();

  const { searchParams } = request.nextUrl;
  const entityId = searchParams.get("entityId");
  const projectId = searchParams.get("id");

  if (projectId) {
    const id = parseInt(projectId, 10);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        entity: { select: { id: true, code: true, name: true } },
        buildings: {
          include: { _count: { select: { floors: true } } },
        },
      },
    });
    if (!project) return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });

    const allowed = await userCanAccessEntity(session.userId, session.role, project.entityId);
    if (!allowed) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    return NextResponse.json(project);
  }

  const projects = await getAccessibleProjects(
    session.userId,
    session.role,
    entityId ? parseInt(entityId, 10) : undefined
  );

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const entityId = parseInt(body.entityId, 10);
  if (!entityId || !body.name || !body.code) {
    return NextResponse.json({ error: "Entity, nama, dan kode wajib diisi" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      entityId,
      name: body.name,
      code: String(body.code).toUpperCase(),
      address: body.address || null,
      phone: body.phone || null,
      email: body.email || null,
    },
  });

  await prisma.userProjectAccess.upsert({
    where: { userId_projectId: { userId: session.userId, projectId: project.id } },
    create: { userId: session.userId, projectId: project.id },
    update: {},
  });

  return NextResponse.json(project, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = parseInt(body.id, 10);
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });

  const allowed = await userCanAccessEntity(session.userId, session.role, project.entityId);
  if (!allowed) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code ? String(body.code).toUpperCase() : undefined,
      address: body.address,
      phone: body.phone,
      email: body.email,
      logoUrl: body.logoUrl,
      gracePeriodDays: body.gracePeriodDays != null ? parseInt(body.gracePeriodDays, 10) : undefined,
      latePenaltyPerDay: body.latePenaltyPerDay != null ? parseFloat(body.latePenaltyPerDay) : undefined,
      paymentNotes: body.paymentNotes,
      termsAndConditions: body.termsAndConditions,
      managerName: body.managerName,
      contractLocation: body.contractLocation,
      active: body.active,
    },
  });

  return NextResponse.json(updated);
}
