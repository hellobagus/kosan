import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AccessibleProject = {
  id: number;
  code: string;
  name: string;
  entityId: number;
  entityCode: string;
  entityName: string;
  holdingId: number;
  holdingName: string;
};

export async function getAccessibleEntities(userId: number, role: UserRole) {
  if (role === "OWNER") {
    return prisma.entity.findMany({
      where: { active: true },
      include: { holding: { select: { id: true, name: true, code: true } } },
      orderBy: [{ holding: { name: "asc" } }, { name: "asc" }],
    });
  }

  const access = await prisma.userEntityAccess.findMany({
    where: { userId },
    include: {
      entity: {
        include: { holding: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  return access
    .map((a) => a.entity)
    .filter((e) => e.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAccessibleProjects(
  userId: number,
  role: UserRole,
  entityId?: number
): Promise<AccessibleProject[]> {
  if (role === "OWNER") {
    const projects = await prisma.project.findMany({
      where: {
        active: true,
        ...(entityId ? { entityId } : {}),
      },
      include: {
        entity: { include: { holding: true } },
      },
      orderBy: { name: "asc" },
    });
    return projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      entityId: p.entityId,
      entityCode: p.entity.code,
      entityName: p.entity.name,
      holdingId: p.entity.holdingId,
      holdingName: p.entity.holding.name,
    }));
  }

  const direct = await prisma.userProjectAccess.findMany({
    where: {
      userId,
      ...(entityId ? { project: { entityId } } : {}),
    },
    include: {
      project: {
        include: { entity: { include: { holding: true } } },
      },
    },
  });

  const entityIds = (
    await prisma.userEntityAccess.findMany({
      where: { userId, ...(entityId ? { entityId } : {}) },
      select: { entityId: true },
    })
  ).map((e) => e.entityId);

  const viaEntity =
    entityIds.length > 0
      ? await prisma.project.findMany({
          where: {
            active: true,
            entityId: { in: entityIds },
            ...(entityId ? { entityId } : {}),
          },
          include: {
            entity: { include: { holding: true } },
          },
        })
      : [];

  const map = new Map<number, AccessibleProject>();
  for (const row of direct) {
    const p = row.project;
    if (!p.active) continue;
    map.set(p.id, {
      id: p.id,
      code: p.code,
      name: p.name,
      entityId: p.entityId,
      entityCode: p.entity.code,
      entityName: p.entity.name,
      holdingId: p.entity.holdingId,
      holdingName: p.entity.holding.name,
    });
  }
  for (const p of viaEntity) {
    if (!p.active) continue;
    map.set(p.id, {
      id: p.id,
      code: p.code,
      name: p.name,
      entityId: p.entityId,
      entityCode: p.entity.code,
      entityName: p.entity.name,
      holdingId: p.entity.holdingId,
      holdingName: p.entity.holding.name,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function userCanAccessProject(
  userId: number,
  role: UserRole,
  projectId: number
): Promise<boolean> {
  const projects = await getAccessibleProjects(userId, role);
  return projects.some((p) => p.id === projectId);
}

export async function userCanAccessEntity(
  userId: number,
  role: UserRole,
  entityId: number
): Promise<boolean> {
  const entities = await getAccessibleEntities(userId, role);
  return entities.some((e) => e.id === entityId);
}
