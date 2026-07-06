import { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function nextDocumentNumber(
  entityId: number,
  projectId: number,
  docType: DocumentType,
  year?: number
): Promise<string> {
  const y = year ?? new Date().getFullYear();

  const result = await prisma.$transaction(async (tx) => {
    const entity = await tx.entity.findUniqueOrThrow({
      where: { id: entityId },
      select: { code: true },
    });
    const project = await tx.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { code: true, entityId: true },
    });

    if (project.entityId !== entityId) {
      throw new Error("Project tidak termasuk entity");
    }

    const seq = await tx.documentSequence.upsert({
      where: {
        entityId_projectId_docType_year: {
          entityId,
          projectId,
          docType,
          year: y,
        },
      },
      create: { entityId, projectId, docType, year: y, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });

    const running = String(seq.lastNumber).padStart(5, "0");
    return `${entity.code}-${project.code}-${y}-${running}`;
  });

  return result;
}

export async function generateInvoiceNumber(
  entityId: number,
  projectId: number
): Promise<string> {
  return nextDocumentNumber(entityId, projectId, DocumentType.INVOICE);
}

export async function generatePurchaseNumber(
  entityId: number,
  projectId: number
): Promise<string> {
  return nextDocumentNumber(entityId, projectId, DocumentType.PURCHASE);
}

export async function generateTransferLetterNumber(
  entityId: number,
  projectId: number
): Promise<string> {
  return nextDocumentNumber(entityId, projectId, DocumentType.TRANSFER_LETTER);
}

export async function resolveProjectFromRoom(roomId: number) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      floorRef: { include: { building: { select: { projectId: true, project: { select: { entityId: true } } } } } },
    },
  });
  if (!room?.floorRef?.building) return null;
  return {
    projectId: room.floorRef.building.projectId,
    entityId: room.floorRef.building.project.entityId,
  };
}
