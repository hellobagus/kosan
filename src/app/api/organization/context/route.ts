import { NextRequest, NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import {
  getAccessibleEntities,
  getAccessibleProjects,
} from "@/lib/access-control";
import {
  getProjectContextForUser,
  setProjectContextCookies,
} from "@/lib/project-context";
import { ensureDefaultOrganization } from "@/lib/organization-service";

export async function GET() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultOrganization();

  const entities = await getAccessibleEntities(session.userId, session.role);
  const context = await getProjectContextForUser(session);
  const projects = context
    ? await getAccessibleProjects(session.userId, session.role, context.entityId)
    : await getAccessibleProjects(session.userId, session.role);

  return NextResponse.json({
    context,
    entities: entities.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      holdingId: e.holdingId,
      holdingName: e.holding.name,
    })),
    projects: projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      entityId: p.entityId,
    })),
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const entityId = parseInt(body.entityId, 10);
  const projectId = parseInt(body.projectId, 10);

  if (!entityId || !projectId) {
    return NextResponse.json({ error: "Entity dan project wajib dipilih" }, { status: 400 });
  }

  try {
    await setProjectContextCookies(entityId, projectId);
    const context = await getProjectContextForUser(session);
    return NextResponse.json({ success: true, context });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengubah konteks";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
