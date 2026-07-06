import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession, isStaff, type SessionPayload } from "@/lib/auth";
import { getAccessibleProjects, userCanAccessProject } from "@/lib/access-control";

export const ENTITY_COOKIE = "kosanku_entity_id";
export const PROJECT_COOKIE = "kosanku_project_id";

export type ProjectContext = {
  entityId: number;
  projectId: number;
  entity: { id: number; code: string; name: string };
  project: { id: number; code: string; name: string; entityId: number };
};

export function roomProjectFilter(projectId: number) {
  return {
    floorRef: {
      building: { projectId },
    },
  };
}

export async function getProjectContextForUser(
  session: SessionPayload
): Promise<ProjectContext | null> {
  const cookieStore = await cookies();
  const entityCookie = cookieStore.get(ENTITY_COOKIE)?.value;
  const projectCookie = cookieStore.get(PROJECT_COOKIE)?.value;

  const accessible = await getAccessibleProjects(session.userId, session.role);

  if (accessible.length === 0) return null;

  let projectId = projectCookie ? parseInt(projectCookie, 10) : NaN;
  if (!projectId || !accessible.some((p) => p.id === projectId)) {
    projectId = accessible[0].id;
  }

  const project = accessible.find((p) => p.id === projectId)!;

  let entityId = entityCookie ? parseInt(entityCookie, 10) : NaN;
  if (!entityId || project.entityId !== entityId) {
    entityId = project.entityId;
  }

  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { id: true, code: true, name: true },
  });

  if (!entity) return null;

  return {
    entityId: entity.id,
    projectId: project.id,
    entity,
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      entityId: project.entityId,
    },
  };
}

export async function requireProjectContext(): Promise<
  { session: SessionPayload; context: ProjectContext } | { error: string; status: number }
> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized", status: 401 };
  if (!isStaff(session.role)) return { error: "Unauthorized", status: 401 };

  const context = await getProjectContextForUser(session);
  if (!context) {
    return { error: "Tidak ada entity/project yang dapat diakses", status: 403 };
  }

  return { session, context };
}

export async function setProjectContextCookies(entityId: number, projectId: number) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    throw new Error("Unauthorized");
  }

  const allowed = await userCanAccessProject(session.userId, session.role, projectId);
  if (!allowed) throw new Error("Akses project ditolak");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { entityId: true },
  });
  if (!project || project.entityId !== entityId) {
    throw new Error("Entity dan project tidak cocok");
  }

  const cookieStore = await cookies();
  cookieStore.set(ENTITY_COOKIE, String(entityId), {
    httpOnly: false,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  cookieStore.set(PROJECT_COOKIE, String(projectId), {
    httpOnly: false,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
