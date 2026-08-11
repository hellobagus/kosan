import type { UserRole } from "@prisma/client";

export type NormalizedRole =
  | "SUPER_ADMIN"
  | "ENTITY_MANAGER"
  | "PROJECT_MANAGER"
  | "FRONT_OFFICE"
  | "FINANCE"
  | "MAINTENANCE"
  | "TENANT";

export type AccessLevel = "none" | "self" | "limited" | "view" | "create" | "full";

export type ModuleKey =
  | "dashboard"
  | "entity"
  | "project"
  | "room"
  | "tenant"
  | "contract"
  | "inventory"
  | "utility"
  | "billing"
  | "payment"
  | "maintenance"
  | "reporting"
  | "accounts"
  | "announcement";

type PermissionMatrix = Record<ModuleKey, Record<NormalizedRole, AccessLevel>>;

const LEGACY_ROLE_MAP: Partial<Record<UserRole, NormalizedRole>> = {
  OWNER: "SUPER_ADMIN",
  MANAGER: "PROJECT_MANAGER",
  TENANT: "TENANT",
};

const ROLE_LABELS: Record<NormalizedRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ENTITY_MANAGER: "Entity Manager",
  PROJECT_MANAGER: "Project Manager",
  FRONT_OFFICE: "Front Office",
  FINANCE: "Finance",
  MAINTENANCE: "Maintenance",
  TENANT: "Tenant",
};

export const STAFF_ROLES: NormalizedRole[] = [
  "SUPER_ADMIN",
  "ENTITY_MANAGER",
  "PROJECT_MANAGER",
  "FRONT_OFFICE",
  "FINANCE",
  "MAINTENANCE",
];

export const ASSIGNABLE_STAFF_ROLES: NormalizedRole[] = [
  "SUPER_ADMIN",
  "ENTITY_MANAGER",
  "PROJECT_MANAGER",
  "FRONT_OFFICE",
  "FINANCE",
  "MAINTENANCE",
];

export const RBAC_MATRIX: PermissionMatrix = {
  dashboard: {
    SUPER_ADMIN: "view",
    ENTITY_MANAGER: "view",
    PROJECT_MANAGER: "view",
    FRONT_OFFICE: "view",
    FINANCE: "view",
    MAINTENANCE: "view",
    TENANT: "view",
  },
  entity: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "none",
    PROJECT_MANAGER: "none",
    FRONT_OFFICE: "none",
    FINANCE: "none",
    MAINTENANCE: "none",
    TENANT: "none",
  },
  project: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "none",
    FRONT_OFFICE: "none",
    FINANCE: "none",
    MAINTENANCE: "none",
    TENANT: "none",
  },
  room: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "full",
    FRONT_OFFICE: "full",
    FINANCE: "none",
    MAINTENANCE: "view",
    TENANT: "view",
  },
  tenant: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "full",
    FRONT_OFFICE: "full",
    FINANCE: "view",
    MAINTENANCE: "view",
    TENANT: "self",
  },
  contract: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "full",
    FRONT_OFFICE: "full",
    FINANCE: "view",
    MAINTENANCE: "none",
    TENANT: "self",
  },
  inventory: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "full",
    FRONT_OFFICE: "view",
    FINANCE: "none",
    MAINTENANCE: "full",
    TENANT: "none",
  },
  utility: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "full",
    FRONT_OFFICE: "view",
    FINANCE: "view",
    MAINTENANCE: "full",
    TENANT: "self",
  },
  billing: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "view",
    FRONT_OFFICE: "view",
    FINANCE: "full",
    MAINTENANCE: "none",
    TENANT: "self",
  },
  payment: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "view",
    FRONT_OFFICE: "view",
    FINANCE: "full",
    MAINTENANCE: "none",
    TENANT: "self",
  },
  maintenance: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "full",
    FRONT_OFFICE: "full",
    FINANCE: "none",
    MAINTENANCE: "full",
    TENANT: "create",
  },
  reporting: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "full",
    FRONT_OFFICE: "limited",
    FINANCE: "full",
    MAINTENANCE: "limited",
    TENANT: "self",
  },
  accounts: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "full",
    FRONT_OFFICE: "none",
    FINANCE: "none",
    MAINTENANCE: "none",
    TENANT: "none",
  },
  announcement: {
    SUPER_ADMIN: "full",
    ENTITY_MANAGER: "full",
    PROJECT_MANAGER: "full",
    FRONT_OFFICE: "full",
    FINANCE: "full",
    MAINTENANCE: "view",
    TENANT: "self",
  },
};

const ACCESS_RANK: Record<AccessLevel, number> = {
  none: 0,
  self: 1,
  limited: 2,
  view: 3,
  create: 4,
  full: 5,
};

export const ROLE_OPTIONS = [
  "SUPER_ADMIN",
  "ENTITY_MANAGER",
  "PROJECT_MANAGER",
  "FRONT_OFFICE",
  "FINANCE",
  "MAINTENANCE",
  "OWNER",
  "MANAGER",
  "TENANT",
] as const satisfies readonly UserRole[];

export function normalizeRole(role: UserRole | string): NormalizedRole {
  return LEGACY_ROLE_MAP[role as UserRole] || (role as NormalizedRole);
}

export function getRoleLabel(role: UserRole | string) {
  return ROLE_LABELS[normalizeRole(role)] || role;
}

export function isStaffRole(role: UserRole | string) {
  return normalizeRole(role) !== "TENANT";
}

export function isSuperAdmin(role: UserRole | string) {
  return normalizeRole(role) === "SUPER_ADMIN";
}

export function getAccessLevel(role: UserRole | string, module: ModuleKey): AccessLevel {
  return RBAC_MATRIX[module][normalizeRole(role)] ?? "none";
}

export function hasModuleAccess(
  role: UserRole | string,
  module: ModuleKey,
  minimum: AccessLevel = "view"
) {
  return ACCESS_RANK[getAccessLevel(role, module)] >= ACCESS_RANK[minimum];
}

export function canOpenModule(role: UserRole | string, module: ModuleKey) {
  return hasModuleAccess(role, module, "self");
}

export function canManageModule(role: UserRole | string, module: ModuleKey) {
  return hasModuleAccess(role, module, "create");
}

export function canAccessPath(role: UserRole | string, pathname: string) {
  const moduleKey = getModuleFromPath(pathname);
  if (!moduleKey) return true;
  return canOpenModule(role, moduleKey);
}

export function getModuleFromPath(pathname: string): ModuleKey | null {
  if (
    pathname === "/panduan" ||
    pathname.startsWith("/panduan/")
  ) return "dashboard";
  if (
    pathname === "/portal" ||
    pathname.startsWith("/portal/")
  ) {
    if (pathname.startsWith("/portal/pengumuman")) return "announcement";
    if (pathname.startsWith("/portal/tagihan")) return "billing";
    if (pathname.startsWith("/portal/pindah")) return "tenant";
    if (pathname.startsWith("/portal/perbaikan")) return "maintenance";
    if (pathname.startsWith("/portal/profil")) return "tenant";
    return "dashboard";
  }
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  ) return "dashboard";
  if (
    pathname === "/kamar" ||
    pathname.startsWith("/kamar/")
  ) return "room";
  if (
    pathname === "/penghuni" ||
    pathname.startsWith("/penghuni/")
  ) return "tenant";
  if (
    pathname === "/keuangan" ||
    pathname.startsWith("/keuangan/")
  ) return "billing";
  if (
    pathname === "/utilitas" ||
    pathname.startsWith("/utilitas/")
  ) return "utility";
  if (
    pathname === "/inventaris" ||
    pathname.startsWith("/inventaris/")
  ) return pathname.includes("/maintenance") || pathname.includes("/inspeksi")
    ? "maintenance"
    : "inventory";
  if (
    pathname === "/laporan" ||
    pathname.startsWith("/laporan/")
  ) return "reporting";
  if (
    pathname === "/akun" ||
    pathname.startsWith("/akun/")
  ) return "accounts";
  if (
    pathname === "/pengaturan/role-permission" ||
    pathname.startsWith("/pengaturan/role-permission/")
  ) return "accounts";
  if (
    pathname === "/pengaturan/entity-project" ||
    pathname.startsWith("/pengaturan/entity-project")
  ) return "project";
  if (
    pathname === "/pengaturan/organisasi" ||
    pathname.startsWith("/pengaturan/organisasi")
  ) return "entity";
  if (
    pathname === "/pengaturan/profil" ||
    pathname === "/pengaturan/kosan" ||
    pathname.startsWith("/pengaturan/template-kontrak")
  ) return "project";
  return null;
}

export function getApiModule(pathname: string): ModuleKey | null {
  if (pathname.startsWith("/api/dashboard")) return "dashboard";
  if (pathname.startsWith("/api/organization/holdings") || pathname.startsWith("/api/organization/entities")) {
    return "entity";
  }
  if (pathname.startsWith("/api/organization/access")) return "accounts";
  if (
    pathname.startsWith("/api/organization/projects") ||
    pathname.startsWith("/api/organization/context") ||
    pathname.startsWith("/api/organization/buildings") ||
    pathname.startsWith("/api/organization/floors") ||
    pathname.startsWith("/api/settings")
  ) {
    return "project";
  }
  if (pathname.startsWith("/api/rooms")) return "room";
  if (
    pathname.includes("/contract") ||
    pathname.includes("/inventaris-ba")
  ) {
    return "contract";
  }
  if (pathname.includes("/invoice")) return "billing";
  if (pathname.startsWith("/api/tenants")) return "tenant";
  if (pathname.startsWith("/api/finances")) return "billing";
  if (pathname.startsWith("/api/accounting")) return "billing";
  if (pathname.startsWith("/api/payments")) return "payment";
  if (pathname.startsWith("/api/room-transfers")) return "tenant";
  if (
    pathname.startsWith("/api/utility-billings") ||
    pathname.startsWith("/api/room-utilities") ||
    pathname.startsWith("/api/utilities")
  ) {
    return "utility";
  }
  if (
    pathname.startsWith("/api/inventory/maintenance") ||
    pathname.startsWith("/api/inventory/inspections") ||
    pathname.startsWith("/api/inventory/checkout-readiness")
  ) {
    return "maintenance";
  }
  if (pathname.startsWith("/api/inventory/")) return "inventory";
  if (pathname.startsWith("/api/portal/announcements")) return "announcement";
  if (pathname.startsWith("/api/portal/repairs")) return "maintenance";
  if (pathname.startsWith("/api/portal/")) return "tenant";
  if (pathname.startsWith("/api/repair-requests")) return "maintenance";
  if (pathname.startsWith("/api/rbac/my-menus")) return null;
  if (pathname.startsWith("/api/rbac/")) return "accounts";
  if (pathname.startsWith("/api/users")) return "accounts";
  return null;
}

export function getApiMinimumAccess(pathname: string, method: string): AccessLevel {
  if (method === "DELETE") return "full";
  if (pathname.startsWith("/api/payments") && method === "POST") return "self";
  if (method === "GET" || method === "HEAD") return "self";
  return "create";
}
