import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  const where = userId ? { userId: parseInt(userId, 10) } : {};

  const [entityAccess, projectAccess] = await Promise.all([
    prisma.userEntityAccess.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } }, entity: true },
    }),
    prisma.userProjectAccess.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        project: { include: { entity: true } },
      },
    }),
  ]);

  return NextResponse.json({ entityAccess, projectAccess });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const userId = parseInt(body.userId, 10);
  if (!userId) return NextResponse.json({ error: "User wajib dipilih" }, { status: 400 });

  if (body.entityId) {
    const entityId = parseInt(body.entityId, 10);
    await prisma.userEntityAccess.upsert({
      where: { userId_entityId: { userId, entityId } },
      create: { userId, entityId },
      update: {},
    });
  }

  if (body.projectId) {
    const projectId = parseInt(body.projectId, 10);
    await prisma.userProjectAccess.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { userId, projectId },
      update: {},
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const userId = parseInt(body.userId, 10);
  if (!userId) return NextResponse.json({ error: "User wajib" }, { status: 400 });

  if (body.entityId) {
    await prisma.userEntityAccess.delete({
      where: { userId_entityId: { userId, entityId: parseInt(body.entityId, 10) } },
    });
  }

  if (body.projectId) {
    await prisma.userProjectAccess.delete({
      where: { userId_projectId: { userId, projectId: parseInt(body.projectId, 10) } },
    });
  }

  return NextResponse.json({ success: true });
}
