import type { RepairCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  notifyStaffNewRepairRequest,
  notifyTenantRepairStatusUpdate,
} from "@/lib/whatsapp-service";
import {
  REPAIR_CATEGORY_LABELS,
  REPAIR_FLOW_STEPS,
  REPAIR_STATUS_LABELS,
} from "@/lib/repair-request-constants";

export { REPAIR_CATEGORY_LABELS, REPAIR_FLOW_STEPS, REPAIR_STATUS_LABELS };

async function resolveActorName(userId?: number) {
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? null;
}

export const REPAIR_REQUEST_INCLUDE = {
  tenant: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  room: { select: { id: true, roomNumber: true, floor: true } },
  project: { select: { id: true, name: true, code: true } },
  inspectedByUser: { select: { id: true, name: true } },
} as const;

export async function createTenantRepairRequest(input: {
  tenantId: number;
  roomId: number;
  projectId?: number | null;
  category: RepairCategory;
  title: string;
  description?: string;
  priority?: string;
  photoUrls?: string[];
  userId?: number;
}) {
  const actorName = await resolveActorName(input.userId);
  const repair = await prisma.tenantRepairRequest.create({
    data: {
      tenantId: input.tenantId,
      roomId: input.roomId,
      projectId: input.projectId ?? null,
      category: input.category,
      title: input.title,
      description: input.description || null,
      priority: input.priority || "NORMAL",
      photoUrls: input.photoUrls?.length ? input.photoUrls : undefined,
      status: "REQUESTED",
      createdBy: input.userId,
      createdByName: actorName,
      updatedByName: actorName,
    },
    include: REPAIR_REQUEST_INCLUDE,
  });

  void notifyStaffNewRepairRequest(repair).catch((err) => {
    console.error("Repair WA notify (staff) error:", err);
  });

  return repair;
}

export async function scheduleRepairInspection(
  requestId: number,
  data: { inspectionNotes?: string; userId?: number }
) {
  const actorName = await resolveActorName(data.userId);
  const repair = await prisma.tenantRepairRequest.update({
    where: { id: requestId },
    data: {
      status: "INSPECTING",
      inspectionAt: new Date(),
      inspectionNotes: data.inspectionNotes || null,
      inspectedBy: data.userId,
      inspectedByName: actorName,
      updatedByName: actorName,
    },
    include: REPAIR_REQUEST_INCLUDE,
  });

  void notifyTenantRepairStatusUpdate(repair).catch((err) => {
    console.error("Repair WA notify (tenant inspect) error:", err);
  });

  return repair;
}

export async function startTenantRepair(requestId: number, userId?: number) {
  const actorName = await resolveActorName(userId);
  const repair = await prisma.tenantRepairRequest.update({
    where: { id: requestId },
    data: {
      status: "IN_PROGRESS",
      updatedByName: actorName,
    },
    include: REPAIR_REQUEST_INCLUDE,
  });

  void notifyTenantRepairStatusUpdate(repair).catch((err) => {
    console.error("Repair WA notify (tenant progress) error:", err);
  });

  return repair;
}

export async function completeTenantRepair(
  requestId: number,
  data: { resolutionNotes?: string; cost?: number; userId?: number }
) {
  const actorName = await resolveActorName(data.userId);
  const request = await prisma.tenantRepairRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Permintaan perbaikan tidak ditemukan");

  const cost = data.cost ?? Number(request.cost);

  return prisma.$transaction(async (tx) => {
    let financeId: number | undefined;
    if (cost > 0) {
      const finance = await tx.finance.create({
        data: {
          type: "EXPENSE",
          amount: cost,
          description: `Perbaikan unit: ${request.title}`,
          category: "Maintenance Unit",
          projectId: request.projectId,
          roomId: request.roomId,
          tenantId: request.tenantId,
          createdBy: data.userId,
          createdByName: actorName,
          updatedByName: actorName,
        },
      });
      financeId = finance.id;
    }

    const repair = await tx.tenantRepairRequest.update({
      where: { id: requestId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedByName: actorName,
        resolutionNotes: data.resolutionNotes || null,
        cost,
        financeId,
        updatedByName: actorName,
      },
      include: REPAIR_REQUEST_INCLUDE,
    });

    void notifyTenantRepairStatusUpdate(repair).catch((err) => {
      console.error("Repair WA notify (tenant complete) error:", err);
    });

    return repair;
  });
}

export async function cancelTenantRepairRequest(requestId: number, userId?: number, reason?: string) {
  const actorName = await resolveActorName(userId);
  const repair = await prisma.tenantRepairRequest.update({
    where: { id: requestId },
    data: {
      status: "CANCELLED",
      resolutionNotes: reason || null,
      updatedByName: actorName,
    },
    include: REPAIR_REQUEST_INCLUDE,
  });

  void notifyTenantRepairStatusUpdate(repair, reason).catch((err) => {
    console.error("Repair WA notify (tenant cancel) error:", err);
  });

  return repair;
}

export function getTenantRepairProjectId(
  tenant: { room: { floorRef?: { building: { projectId: number } } | null } }
) {
  return tenant.room.floorRef?.building.projectId ?? null;
}

export async function assertRepairInProject(requestId: number, projectId: number) {
  const request = await prisma.tenantRepairRequest.findFirst({
    where: { id: requestId, projectId },
    select: { id: true },
  });
  if (!request) throw new Error("Permintaan tidak termasuk project aktif");
}
