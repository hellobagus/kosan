import { NextRequest, NextResponse } from "next/server";
import type { RepairCategory } from "@prisma/client";
import { isAuthFailure, requireSession } from "@/lib/api-auth";
import { parsePhotoUrls } from "@/lib/file-upload";
import { REPAIR_CATEGORY_LABELS } from "@/lib/repair-request-constants";
import {
  REPAIR_REQUEST_INCLUDE,
  cancelTenantRepairRequest,
  createTenantRepairRequest,
} from "@/lib/repair-request-service";
import { prisma } from "@/lib/prisma";
import { getTenantProjectId, requireTenantPortalSession } from "@/lib/tenant-portal-service";

const VALID_CATEGORIES = Object.keys(REPAIR_CATEGORY_LABELS) as RepairCategory[];

export async function GET() {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const auth = await requireTenantPortalSession(session);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const requests = await prisma.tenantRepairRequest.findMany({
      where: { tenantId: auth.tenant.id },
      include: REPAIR_REQUEST_INCLUDE,
      orderBy: { reportedAt: "desc" },
    });

    return NextResponse.json({
      requests,
      categories: VALID_CATEGORIES.map((value) => ({
        value,
        label: REPAIR_CATEGORY_LABELS[value],
      })),
      room: {
        id: auth.tenant.roomId,
        roomNumber: auth.tenant.room.roomNumber,
        floor: auth.tenant.room.floor,
      },
    });
  } catch (error) {
    console.error("Portal repairs GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const auth = await requireTenantPortalSession(session);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { category, title, description, priority, photoUrls: rawPhotos } = body;
    const photoUrls = parsePhotoUrls(rawPhotos).slice(0, 3);

    if (!category || !title?.trim()) {
      return NextResponse.json({ error: "Kategori dan judul permintaan wajib diisi" }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
    }

    const openRequest = await prisma.tenantRepairRequest.findFirst({
      where: {
        tenantId: auth.tenant.id,
        status: { in: ["REQUESTED", "INSPECTING", "IN_PROGRESS"] },
      },
    });
    if (openRequest) {
      return NextResponse.json(
        { error: "Masih ada permintaan perbaikan yang belum selesai. Tunggu hingga selesai atau dibatalkan." },
        { status: 400 }
      );
    }

    const repair = await createTenantRepairRequest({
      tenantId: auth.tenant.id,
      roomId: auth.tenant.roomId,
      projectId: getTenantProjectId(auth.tenant),
      category,
      title: title.trim(),
      description: description?.trim(),
      priority: priority === "URGENT" ? "URGENT" : "NORMAL",
      photoUrls,
      userId: session.userId,
    });

    return NextResponse.json(repair, { status: 201 });
  } catch (error) {
    console.error("Portal repairs POST error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const auth = await requireTenantPortalSession(session);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, action, reason } = await request.json();
    if (!id || action !== "cancel") {
      return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
    }

    const existing = await prisma.tenantRepairRequest.findFirst({
      where: { id: parseInt(String(id), 10), tenantId: auth.tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Permintaan tidak ditemukan" }, { status: 404 });
    }
    if (existing.status !== "REQUESTED") {
      return NextResponse.json(
        { error: "Hanya permintaan yang masih menunggu tinjauan yang bisa dibatalkan" },
        { status: 400 }
      );
    }

    const updated = await cancelTenantRepairRequest(existing.id, session.userId, reason);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Portal repairs PUT error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
