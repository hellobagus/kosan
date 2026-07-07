import { getSession, type SessionPayload } from "@/lib/auth";
import { getProjectContextForUser, type ProjectContext } from "@/lib/project-context";
import { hasModuleAction, type PermissionAction } from "@/lib/permission-service";
import {
  hasModuleAccess,
  isStaffRole,
  type AccessLevel,
  type ModuleKey,
} from "@/lib/rbac";

export type AuthFailure = { error: string; status: number };

function accessLevelToAction(minimum: AccessLevel): PermissionAction {
  if (minimum === "full") return "delete";
  if (minimum === "create") return "update";
  return "view";
}

export function authFailure(error: string, status: number): AuthFailure {
  return { error, status };
}

export function isAuthFailure(
  value: SessionPayload | AuthFailure
): value is AuthFailure {
  return "error" in value && "status" in value;
}

export async function requireSession(): Promise<SessionPayload | AuthFailure> {
  const session = await getSession();
  if (!session) return authFailure("Unauthorized", 401);
  return session;
}

export async function requireModule(
  session: SessionPayload,
  module: ModuleKey,
  minimum: AccessLevel = "view"
): Promise<AuthFailure | null> {
  const allowed = await hasModuleAction(session.role, module, accessLevelToAction(minimum));
  if (!allowed) return authFailure("Forbidden", 403);
  return null;
}

export async function requireStaffModule(
  module: ModuleKey,
  minimum: AccessLevel = "view"
): Promise<{ session: SessionPayload; context: ProjectContext } | AuthFailure> {
  const session = await requireSession();
  if (isAuthFailure(session)) return session;
  if (!isStaffRole(session.role)) return authFailure("Unauthorized", 401);

  const denied = await requireModule(session, module, minimum);
  if (denied) return denied;

  const context = await getProjectContextForUser(session);
  if (!context) {
    return authFailure("Tidak ada entity/project yang dapat diakses", 403);
  }

  return { session, context };
}

export function isTenantSelf(session: SessionPayload, tenantUserId: number) {
  return session.role === "TENANT" && session.userId === tenantUserId;
}

export function canAccessTenantRecord(
  session: SessionPayload,
  tenantUserId: number,
  staffMinimum: AccessLevel = "view"
) {
  if (isTenantSelf(session, tenantUserId)) {
    return hasModuleAccess(session.role, "tenant", "self");
  }
  return isStaffRole(session.role) && hasModuleAccess(session.role, "tenant", staffMinimum);
}

export function canAccessContractRecord(
  session: SessionPayload,
  tenantUserId: number,
  staffMinimum: AccessLevel = "view"
) {
  if (isTenantSelf(session, tenantUserId)) {
    return hasModuleAccess(session.role, "contract", "self");
  }
  return isStaffRole(session.role) && hasModuleAccess(session.role, "contract", staffMinimum);
}

export function canAccessBillingRecord(
  session: SessionPayload,
  tenantUserId: number,
  staffMinimum: AccessLevel = "view"
) {
  if (isTenantSelf(session, tenantUserId)) {
    return hasModuleAccess(session.role, "billing", "self");
  }
  return isStaffRole(session.role) && hasModuleAccess(session.role, "billing", staffMinimum);
}
