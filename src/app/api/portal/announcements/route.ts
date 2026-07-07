import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireSession, requireStaffModule } from "@/lib/api-auth";
import { getTenantProjectId, requireTenantPortalSession } from "@/lib/tenant-portal-service";

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

    const projectId = getTenantProjectId(auth.tenant);
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [{ projectId: null }, { projectId: projectId ?? undefined }],
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("Portal announcements GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffModule("announcement", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { title, content, audience, expiresAt } = body;
    if (!title || !content) {
      return NextResponse.json({ error: "Judul dan isi wajib diisi" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        projectId: auth.context.projectId,
        title: String(title).trim(),
        content: String(content).trim(),
        audience: audience || "TENANT",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: auth.session.userId,
        createdByName: auth.session.name,
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("Portal announcements POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
