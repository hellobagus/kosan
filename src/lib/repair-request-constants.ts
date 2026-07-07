import type { RepairCategory, RepairRequestStatus } from "@prisma/client";

export const REPAIR_CATEGORY_LABELS: Record<RepairCategory, string> = {
  PLUMBING: "Pipa & Kran Air",
  AC: "AC / Pendingin",
  ELECTRICAL: "Listrik",
  FURNITURE: "Perabot / Furniture",
  STRUCTURAL: "Struktur Bangunan",
  OTHER: "Lainnya",
};

export const REPAIR_STATUS_LABELS: Record<RepairRequestStatus, string> = {
  REQUESTED: "Menunggu Tinjauan",
  INSPECTING: "Inspeksi Unit",
  IN_PROGRESS: "Sedang Diperbaiki",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const REPAIR_FLOW_STEPS: RepairRequestStatus[] = [
  "REQUESTED",
  "INSPECTING",
  "IN_PROGRESS",
  "COMPLETED",
];
