import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";
import { isStaffRole } from "@/lib/rbac";

export async function getActiveTenantForUser(userId: number) {
  return prisma.tenant.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "RESERVED", "CHECKOUT_PENDING", "CONTRACT_SIGNED", "CONTRACT_SENT", "APPROVED"] },
    },
    include: {
      user: true,
      room: { include: { floorRef: { include: { building: { include: { project: { include: { entity: true } } } } } } } },
    },
    orderBy: { id: "desc" },
  });
}

export async function requireTenantPortalSession(session: SessionPayload) {
  if (isStaffRole(session.role)) {
    return { error: "Halaman ini khusus penghuni", status: 403 } as const;
  }
  const tenant = await getActiveTenantForUser(session.userId);
  if (!tenant) {
    return { error: "Data penghuni aktif tidak ditemukan", status: 404 } as const;
  }
  return { session, tenant } as const;
}

export function getTenantProjectId(tenant: NonNullable<Awaited<ReturnType<typeof getActiveTenantForUser>>>) {
  return tenant.room.floorRef?.building.projectId ?? null;
}

export function getTenantEntityId(tenant: NonNullable<Awaited<ReturnType<typeof getActiveTenantForUser>>>) {
  return tenant.room.floorRef?.building.project?.entityId ?? null;
}

export async function getAvailableRoomsForTenantTransfer(
  tenant: NonNullable<Awaited<ReturnType<typeof getActiveTenantForUser>>>
) {
  const projectId = getTenantProjectId(tenant);
  if (!projectId) return [];

  const rooms = await prisma.room.findMany({
    where: {
      status: "AVAILABLE",
      id: { not: tenant.roomId },
      floorRef: { building: { projectId } },
      tenants: { none: { status: "ACTIVE" } },
    },
    include: {
      floorRef: {
        include: {
          building: {
            include: {
              project: {
                include: { entity: { select: { id: true, name: true, code: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: [{ floor: "asc" }, { roomNumber: "asc" }],
  });

  return rooms.map((room) => {
    const building = room.floorRef?.building;
    const project = building?.project;
    const entity = project?.entity;
    return {
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      price: room.price,
      status: room.status,
      buildingName: building?.name ?? null,
      buildingCode: building?.code ?? null,
      projectName: project?.name ?? null,
      projectCode: project?.code ?? null,
      entityName: entity?.name ?? null,
      entityCode: entity?.code ?? null,
    };
  });
}
