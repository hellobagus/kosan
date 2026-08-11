import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getAccessLevel,
  hasModuleAccess,
  normalizeRole,
  type AccessLevel,
  type ModuleKey,
} from "@/lib/rbac";

export type PermissionAction = "view" | "create" | "update" | "delete";

export type MenuSeed = {
  key: string;
  name: string;
  href?: string;
  parentKey?: string;
  moduleKey: ModuleKey;
  icon?: string;
  sortOrder: number;
  children?: MenuSeed[];
};

export const DEFAULT_MENU_TREE: MenuSeed[] = [
  { key: "dashboard", name: "Dashboard", href: "/dashboard", moduleKey: "dashboard", icon: "LayoutDashboard", sortOrder: 1 },
  { key: "guide", name: "Panduan Penggunaan", href: "/panduan", moduleKey: "dashboard", icon: "BookOpen", sortOrder: 2 },
  {
    key: "room", name: "Informasi Kamar", moduleKey: "room", icon: "DoorOpen", sortOrder: 3,
    children: [
      { key: "room.all", name: "Semua Kamar", href: "/kamar", moduleKey: "room", sortOrder: 1 },
      { key: "room.new", name: "Input Kamar Baru", href: "/kamar/baru", moduleKey: "room", sortOrder: 2 },
      { key: "room.occupied", name: "Kamar Terisi", href: "/kamar/terisi", moduleKey: "room", sortOrder: 3 },
      { key: "room.available", name: "Kamar Kosong", href: "/kamar/kosong", moduleKey: "room", sortOrder: 4 },
    ],
  },
  {
    key: "tenant", name: "Penghuni", moduleKey: "tenant", icon: "Users", sortOrder: 4,
    children: [
      { key: "tenant.active", name: "Penghuni Aktif", href: "/penghuni/aktif", moduleKey: "tenant", sortOrder: 1 },
      { key: "tenant.transfer", name: "Pindah Unit / Kamar", href: "/penghuni/pindah", moduleKey: "tenant", sortOrder: 2 },
      { key: "tenant.prospect", name: "Calon Penghuni", href: "/penghuni/calon", moduleKey: "tenant", sortOrder: 3 },
      { key: "tenant.reserve", name: "Reservasi", href: "/penghuni/reservasi", moduleKey: "tenant", sortOrder: 4 },
      { key: "tenant.new", name: "Input Penghuni Baru", href: "/penghuni/baru", moduleKey: "tenant", sortOrder: 5 },
      { key: "tenant.completed", name: "Penghuni Selesai", href: "/penghuni/selesai", moduleKey: "tenant", sortOrder: 6 },
    ],
  },
  {
    key: "billing", name: "Keuangan", moduleKey: "billing", icon: "Wallet", sortOrder: 5,
    children: [
      { key: "billing.summary", name: "Ringkasan", href: "/keuangan", moduleKey: "billing", sortOrder: 1 },
      { key: "billing.income", name: "Pemasukan", href: "/keuangan/pemasukan", moduleKey: "billing", sortOrder: 2 },
      { key: "billing.expense", name: "Pengeluaran", href: "/keuangan/pengeluaran", moduleKey: "billing", sortOrder: 3 },
      { key: "billing.accounts", name: "Bagan Akun", href: "/keuangan/akun", moduleKey: "billing", sortOrder: 4 },
      { key: "billing.journal", name: "Jurnal Umum", href: "/keuangan/jurnal", moduleKey: "billing", sortOrder: 5 },
      { key: "billing.ledger", name: "Buku Besar", href: "/keuangan/buku-besar", moduleKey: "billing", sortOrder: 6 },
      { key: "billing.trial", name: "Neraca Saldo", href: "/keuangan/neraca-saldo", moduleKey: "billing", sortOrder: 7 },
      { key: "billing.pnl", name: "Laba Rugi", href: "/keuangan/laba-rugi", moduleKey: "billing", sortOrder: 8 },
      { key: "billing.balance", name: "Neraca", href: "/keuangan/neraca", moduleKey: "billing", sortOrder: 9 },
      { key: "billing.period", name: "Periode & Setup", href: "/keuangan/periode", moduleKey: "billing", sortOrder: 10 },
    ],
  },
  {
    key: "utility", name: "Utilitas", moduleKey: "utility", icon: "Zap", sortOrder: 6,
    children: [
      { key: "utility.list", name: "Daftar Utility", href: "/utilitas", moduleKey: "utility", sortOrder: 1 },
      { key: "utility.room", name: "Utility per Kamar", href: "/utilitas/kamar", moduleKey: "utility", sortOrder: 2 },
      { key: "utility.billing", name: "Tagihan Bulanan", href: "/utilitas/tagihan", moduleKey: "utility", sortOrder: 3 },
    ],
  },
  {
    key: "inventory", name: "Inventaris", moduleKey: "inventory", icon: "Package", sortOrder: 7,
    children: [
      { key: "inventory.summary", name: "Ringkasan", href: "/inventaris", moduleKey: "inventory", sortOrder: 1 },
      { key: "inventory.items", name: "Master Barang", href: "/inventaris/barang", moduleKey: "inventory", sortOrder: 2 },
      { key: "inventory.template", name: "Template Kamar", href: "/inventaris/template", moduleKey: "inventory", sortOrder: 3 },
      { key: "inventory.shared", name: "Area Bersama", href: "/inventaris/area-bersama", moduleKey: "inventory", sortOrder: 4 },
      { key: "inventory.purchase", name: "Pembelian", href: "/inventaris/pembelian", moduleKey: "inventory", sortOrder: 5 },
      { key: "inventory.warehouse", name: "Gudang", href: "/inventaris/gudang", moduleKey: "inventory", sortOrder: 6 },
      { key: "inventory.room", name: "Asset per Kamar", href: "/inventaris/kamar", moduleKey: "inventory", sortOrder: 7 },
      { key: "inventory.maintenance", name: "Maintenance", href: "/inventaris/maintenance", moduleKey: "maintenance", sortOrder: 8 },
      { key: "inventory.inspection", name: "Inspeksi Checkout", href: "/inventaris/inspeksi", moduleKey: "maintenance", sortOrder: 9 },
    ],
  },
  { key: "reporting", name: "Cetak Laporan", href: "/laporan", moduleKey: "reporting", icon: "FileText", sortOrder: 8 },
  {
    key: "settings", name: "Pengaturan", moduleKey: "project", icon: "Settings", sortOrder: 9,
    children: [
      { key: "settings.entity", name: "Entity & Project", href: "/pengaturan/entity-project", moduleKey: "project", sortOrder: 1 },
      { key: "settings.org", name: "Struktur Organisasi", href: "/pengaturan/organisasi", moduleKey: "entity", sortOrder: 2 },
      { key: "settings.profile", name: "Profil Kosan", href: "/pengaturan/profil", moduleKey: "project", sortOrder: 3 },
      { key: "settings.contract", name: "Template Kontrak", href: "/pengaturan/template-kontrak", moduleKey: "project", sortOrder: 4 },
      { key: "settings.kosan", name: "Pengaturan Kosan", href: "/pengaturan/kosan", moduleKey: "project", sortOrder: 5 },
      { key: "settings.rbac", name: "Menu & Hak Akses", href: "/pengaturan/role-permission", moduleKey: "accounts", sortOrder: 6 },
    ],
  },
  {
    key: "accounts", name: "Daftar Akun", moduleKey: "accounts", icon: "UserCog", sortOrder: 10,
    children: [
      { key: "accounts.staff", name: "Pengelola / Pemilik", href: "/akun/pengelola", moduleKey: "accounts", sortOrder: 1 },
      { key: "accounts.tenant", name: "Akun Penghuni", href: "/akun/penghuni", moduleKey: "accounts", sortOrder: 2 },
    ],
  },
];

export const TENANT_PORTAL_MENUS: MenuSeed[] = [
  { key: "portal.home", name: "Beranda", href: "/portal", moduleKey: "dashboard", icon: "LayoutDashboard", sortOrder: 1 },
  { key: "portal.guide", name: "Panduan Penggunaan", href: "/panduan", moduleKey: "dashboard", icon: "BookOpen", sortOrder: 2 },
  { key: "portal.profile", name: "Profil Saya", href: "/portal/profil", moduleKey: "tenant", icon: "User", sortOrder: 3 },
  { key: "portal.billing", name: "Tagihan & Invoice", href: "/portal/tagihan", moduleKey: "billing", icon: "Wallet", sortOrder: 4 },
  { key: "portal.transfer", name: "Permohonan Pindah", href: "/portal/pindah", moduleKey: "tenant", icon: "DoorOpen", sortOrder: 5 },
  { key: "portal.repair", name: "Permintaan Perbaikan", href: "/portal/perbaikan", moduleKey: "maintenance", icon: "Wrench", sortOrder: 6 },
  { key: "portal.announcement", name: "Pengumuman", href: "/portal/pengumuman", moduleKey: "announcement", icon: "Bell", sortOrder: 7 },
];

const TENANT_PORTAL_PERMISSIONS: Record<string, { canView: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }> = {
  "portal.home": { canView: true, canCreate: false, canUpdate: false, canDelete: false },
  "portal.guide": { canView: true, canCreate: false, canUpdate: false, canDelete: false },
  "portal.profile": { canView: true, canCreate: false, canUpdate: false, canDelete: false },
  "portal.billing": { canView: true, canCreate: false, canUpdate: false, canDelete: false },
  "portal.transfer": { canView: true, canCreate: true, canUpdate: false, canDelete: false },
  "portal.repair": { canView: true, canCreate: true, canUpdate: false, canDelete: false },
  "portal.announcement": { canView: true, canCreate: false, canUpdate: false, canDelete: false },
};

export function isTenantPortalMenuKey(menuKey: string) {
  return menuKey.startsWith("portal.");
}

const ALL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ENTITY_MANAGER",
  "PROJECT_MANAGER",
  "FRONT_OFFICE",
  "FINANCE",
  "MAINTENANCE",
  "OWNER",
  "MANAGER",
  "TENANT",
];

type CachedPermission = {
  menuKey: string;
  moduleKey: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

let permissionCache: Map<UserRole, CachedPermission[]> | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

function accessLevelToCrud(level: AccessLevel) {
  switch (level) {
    case "none":
      return { canView: false, canCreate: false, canUpdate: false, canDelete: false };
    case "self":
    case "limited":
      return { canView: true, canCreate: false, canUpdate: false, canDelete: false };
    case "view":
      return { canView: true, canCreate: false, canUpdate: false, canDelete: false };
    case "create":
      return { canView: true, canCreate: true, canUpdate: true, canDelete: false };
    case "full":
      return { canView: true, canCreate: true, canUpdate: true, canDelete: true };
    default:
      return { canView: false, canCreate: false, canUpdate: false, canDelete: false };
  }
}

function flattenMenus(tree: MenuSeed[], parentKey?: string): Array<MenuSeed & { parentKey?: string }> {
  const rows: Array<MenuSeed & { parentKey?: string }> = [];
  for (const item of tree) {
    rows.push({ ...item, parentKey: item.parentKey ?? parentKey });
    if (item.children?.length) {
      rows.push(...flattenMenus(item.children, item.key));
    }
  }
  return rows;
}

export function invalidatePermissionCache() {
  permissionCache = null;
  cacheLoadedAt = 0;
}

async function loadPermissionCache(force = false) {
  const now = Date.now();
  if (!force && permissionCache && now - cacheLoadedAt < CACHE_TTL_MS) {
    return permissionCache;
  }

  const rows = await prisma.roleMenuPermission.findMany({
    include: { menu: { select: { moduleKey: true, isActive: true } } },
  });

  const map = new Map<UserRole, CachedPermission[]>();
  for (const role of ALL_ROLES) {
    map.set(role, []);
  }

  for (const row of rows) {
    if (!row.menu.isActive) continue;
    const list = map.get(row.role) || [];
    list.push({
      menuKey: row.menuKey,
      moduleKey: row.menu.moduleKey,
      canView: row.canView,
      canCreate: row.canCreate,
      canUpdate: row.canUpdate,
      canDelete: row.canDelete,
    });
    map.set(row.role, list);
  }

  permissionCache = map;
  cacheLoadedAt = now;
  return map;
}

export async function ensureRbacSeeded() {
  const count = await prisma.appMenu.count();
  if (count === 0) {
    const flat = flattenMenus(DEFAULT_MENU_TREE);

    await prisma.$transaction(async (tx) => {
      for (const menu of flat) {
        await tx.appMenu.create({
          data: {
            key: menu.key,
            name: menu.name,
            href: menu.href || null,
            parentKey: menu.parentKey || null,
            moduleKey: menu.moduleKey,
            icon: menu.icon || null,
            sortOrder: menu.sortOrder,
            isActive: true,
          },
        });
      }

      for (const menu of flat) {
        for (const role of ALL_ROLES) {
          const level = getAccessLevel(role, menu.moduleKey as ModuleKey);
          const crud =
            menu.key === "guide" && role === "TENANT"
              ? { canView: false, canCreate: false, canUpdate: false, canDelete: false }
              : accessLevelToCrud(level);
          await tx.roleMenuPermission.create({
            data: {
              role,
              menuKey: menu.key,
              ...crud,
            },
          });
        }
      }
    });

    await ensurePortalMenus();
    invalidatePermissionCache();
    return;
  }

  await ensureGuideMenus();
  await ensureAccountingMenus();
  invalidatePermissionCache();
}

/** Pastikan menu Panduan tersedia di DB yang sudah ada (staf + portal). */
export async function ensureGuideMenus() {
  const guideMenu = DEFAULT_MENU_TREE.find((m) => m.key === "guide");
  if (guideMenu) {
    const existing = await prisma.appMenu.findUnique({
      where: { key: "guide" },
      select: { key: true },
    });

    if (!existing) {
      await prisma.appMenu.create({
        data: {
          key: guideMenu.key,
          name: guideMenu.name,
          href: guideMenu.href || null,
          moduleKey: guideMenu.moduleKey,
          icon: guideMenu.icon || null,
          sortOrder: guideMenu.sortOrder,
          isActive: true,
        },
      });

      for (const role of ALL_ROLES) {
        const isTenant = role === "TENANT";
        const level = getAccessLevel(role, "dashboard");
        const crud = isTenant
          ? { canView: false, canCreate: false, canUpdate: false, canDelete: false }
          : accessLevelToCrud(level);
        await prisma.roleMenuPermission.create({
          data: { role, menuKey: "guide", ...crud },
        });
      }
    }
  }

  await ensurePortalMenus();
}

/** Pastikan menu akuntansi tersedia di DB yang sudah ada. */
export async function ensureAccountingMenus() {
  const billing = DEFAULT_MENU_TREE.find((m) => m.key === "billing");
  if (!billing?.children) return;

  for (const child of billing.children) {
    await prisma.appMenu.upsert({
      where: { key: child.key },
      create: {
        key: child.key,
        name: child.name,
        href: child.href || null,
        parentKey: "billing",
        moduleKey: child.moduleKey,
        icon: child.icon || null,
        sortOrder: child.sortOrder,
        isActive: true,
      },
      update: {
        name: child.name,
        href: child.href || null,
        parentKey: "billing",
        moduleKey: child.moduleKey,
        sortOrder: child.sortOrder,
        isActive: true,
      },
    });

    for (const role of ALL_ROLES) {
      if (role === "TENANT") {
        await prisma.roleMenuPermission.upsert({
          where: { role_menuKey: { role, menuKey: child.key } },
          create: {
            role,
            menuKey: child.key,
            canView: false,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
          },
          update: {},
        });
        continue;
      }
      const level = getAccessLevel(role, child.moduleKey as ModuleKey);
      const crud = accessLevelToCrud(level);
      await prisma.roleMenuPermission.upsert({
        where: { role_menuKey: { role, menuKey: child.key } },
        create: { role, menuKey: child.key, ...crud },
        update: {},
      });
    }
  }

  invalidatePermissionCache();
}

export async function ensurePortalMenus() {
  for (const menu of TENANT_PORTAL_MENUS) {
    await prisma.appMenu.upsert({
      where: { key: menu.key },
      create: {
        key: menu.key,
        name: menu.name,
        href: menu.href || null,
        moduleKey: menu.moduleKey,
        icon: menu.icon || null,
        sortOrder: menu.sortOrder,
        isActive: true,
      },
      update: {
        name: menu.name,
        href: menu.href || null,
        moduleKey: menu.moduleKey,
        icon: menu.icon || null,
        sortOrder: menu.sortOrder,
        isActive: true,
      },
    });
  }

  await syncTenantPortalPermissions();
}

export async function syncTenantPortalPermissions() {
  const allMenus = await prisma.appMenu.findMany({ select: { key: true } });

  for (const menu of allMenus) {
    const portalPerm = TENANT_PORTAL_PERMISSIONS[menu.key];
    if (portalPerm) {
      await prisma.roleMenuPermission.upsert({
        where: { role_menuKey: { role: "TENANT", menuKey: menu.key } },
        create: { role: "TENANT", menuKey: menu.key, ...portalPerm },
        update: portalPerm,
      });
      for (const role of ALL_ROLES) {
        if (role === "TENANT") continue;
        await prisma.roleMenuPermission.upsert({
          where: { role_menuKey: { role, menuKey: menu.key } },
          create: { role, menuKey: menu.key, canView: false, canCreate: false, canUpdate: false, canDelete: false },
          update: { canView: false, canCreate: false, canUpdate: false, canDelete: false },
        });
      }
      continue;
    }

    await prisma.roleMenuPermission.upsert({
      where: { role_menuKey: { role: "TENANT", menuKey: menu.key } },
      create: { role: "TENANT", menuKey: menu.key, canView: false, canCreate: false, canUpdate: false, canDelete: false },
      update: { canView: false, canCreate: false, canUpdate: false, canDelete: false },
    });
  }

  invalidatePermissionCache();
}

function fallbackModuleAction(
  role: UserRole | string,
  moduleKey: ModuleKey,
  action: PermissionAction
) {
  const minimum: AccessLevel =
    action === "view" ? "self" :
    action === "create" ? "create" :
    action === "update" ? "create" :
    "full";
  return hasModuleAccess(role, moduleKey, minimum);
}

export async function hasMenuAction(
  role: UserRole | string,
  menuKey: string,
  action: PermissionAction
) {
  await ensureRbacSeeded();
  const cache = await loadPermissionCache();
  const userRole = role as UserRole;
  const perms = cache.get(userRole) || [];
  const row = perms.find((p) => p.menuKey === menuKey);
  if (!row) {
    const menu = await prisma.appMenu.findUnique({ where: { key: menuKey } });
    if (!menu) return false;
    return fallbackModuleAction(role, menu.moduleKey as ModuleKey, action);
  }
  if (action === "view") return row.canView;
  if (action === "create") return row.canCreate;
  if (action === "update") return row.canUpdate;
  return row.canDelete;
}

export async function hasModuleAction(
  role: UserRole | string,
  moduleKey: ModuleKey,
  action: PermissionAction
) {
  await ensureRbacSeeded();
  const cache = await loadPermissionCache();
  const perms = cache.get(role as UserRole) || [];
  const modulePerms = perms.filter((p) => p.moduleKey === moduleKey);
  if (modulePerms.length === 0) {
    return fallbackModuleAction(role, moduleKey, action);
  }
  if (action === "view") return modulePerms.some((p) => p.canView);
  if (action === "create") return modulePerms.some((p) => p.canCreate);
  if (action === "update") return modulePerms.some((p) => p.canUpdate);
  return modulePerms.some((p) => p.canDelete);
}

export async function canAccessPathDb(role: UserRole | string, pathname: string) {
  await ensureRbacSeeded();

  const menus = await prisma.appMenu.findMany({
    where: { isActive: true, href: { not: null } },
    orderBy: { href: "desc" },
  });

  const match = menus.find((m) => m.href && (pathname === m.href || pathname.startsWith(m.href + "/")));
  if (!match) return true;
  return hasMenuAction(role, match.key, "view");
}

export type NavMenuItem = {
  key: string;
  name: string;
  href?: string;
  icon?: string | null;
  moduleKey: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  children?: NavMenuItem[];
};

export async function getNavMenusForRole(role: UserRole | string): Promise<NavMenuItem[]> {
  await ensureRbacSeeded();
  const isTenant = normalizeRole(role) === "TENANT";
  const cache = await loadPermissionCache();
  const perms = cache.get(role as UserRole) || [];
  const permMap = new Map(perms.map((p) => [p.menuKey, p]));

  const menus = await prisma.appMenu.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const byKey = new Map(menus.map((m) => [m.key, m]));
  const childrenMap = new Map<string, typeof menus>();

  for (const menu of menus) {
    if (!menu.parentKey) continue;
    const list = childrenMap.get(menu.parentKey) || [];
    list.push(menu);
    childrenMap.set(menu.parentKey, list);
  }

  function buildNode(menu: (typeof menus)[0]): NavMenuItem | null {
    if (isTenant && !isTenantPortalMenuKey(menu.key)) return null;
    if (!isTenant && isTenantPortalMenuKey(menu.key)) return null;

    const perm = permMap.get(menu.key);
    const childMenus = (childrenMap.get(menu.key) || []).sort((a, b) => a.sortOrder - b.sortOrder);
    const children = childMenus
      .map(buildNode)
      .filter((c): c is NavMenuItem => c !== null);

    const canView = perm?.canView || children.some((c) => c.canView);
    if (!canView) return null;

    return {
      key: menu.key,
      name: menu.name,
      href: menu.href || undefined,
      icon: menu.icon,
      moduleKey: menu.moduleKey,
      canView: perm?.canView ?? children.some((c) => c.canView),
      canCreate: perm?.canCreate ?? false,
      canUpdate: perm?.canUpdate ?? false,
      canDelete: perm?.canDelete ?? false,
      children: children.length > 0 ? children : undefined,
    };
  }

  const roots = menus
    .filter((m) => !m.parentKey || !byKey.has(m.parentKey))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return roots
    .map(buildNode)
    .filter((m): m is NavMenuItem => m !== null);
}

export async function listMenusWithPermissions(role?: UserRole) {
  await ensureRbacSeeded();
  const menus = await prisma.appMenu.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: role
      ? { permissions: { where: { role } } }
      : { permissions: true },
  });
  return menus;
}

export async function upsertMenuPermission(data: {
  role: UserRole;
  menuKey: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const result = await prisma.roleMenuPermission.upsert({
    where: { role_menuKey: { role: data.role, menuKey: data.menuKey } },
    create: data,
    update: {
      canView: data.canView,
      canCreate: data.canCreate,
      canUpdate: data.canUpdate,
      canDelete: data.canDelete,
    },
  });
  invalidatePermissionCache();
  return result;
}

export async function bulkUpsertPermissions(
  items: Array<{
    role: UserRole;
    menuKey: string;
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }>
) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.roleMenuPermission.upsert({
        where: { role_menuKey: { role: item.role, menuKey: item.menuKey } },
        create: item,
        update: {
          canView: item.canView,
          canCreate: item.canCreate,
          canUpdate: item.canUpdate,
          canDelete: item.canDelete,
        },
      })
    )
  );
  invalidatePermissionCache();
}

export function getManageableRoles(): UserRole[] {
  return [...ALL_ROLES];
}

export function getRoleDisplayName(role: UserRole) {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ENTITY_MANAGER: "Entity Manager",
    PROJECT_MANAGER: "Project Manager",
    FRONT_OFFICE: "Front Office / Pengurus",
    FINANCE: "Finance",
    MAINTENANCE: "Maintenance",
    OWNER: "Pemilik / Owner",
    MANAGER: "Manager",
    TENANT: "Penghuni / Penyewa",
  };
  return labels[role] || role;
}

export async function resetPermissionsFromMatrix() {
  const flat = flattenMenus(DEFAULT_MENU_TREE);
  await prisma.$transaction(async (tx) => {
    await tx.roleMenuPermission.deleteMany();
    for (const menu of flat) {
      for (const role of ALL_ROLES) {
        const level = getAccessLevel(role, menu.moduleKey as ModuleKey);
        const crud = accessLevelToCrud(level);
        // Staff guide: hide from TENANT (they use portal.guide)
        const finalCrud =
          menu.key === "guide" && role === "TENANT"
            ? { canView: false, canCreate: false, canUpdate: false, canDelete: false }
            : crud;
        await tx.roleMenuPermission.create({
          data: { role, menuKey: menu.key, ...finalCrud },
        });
      }
    }
  });
  await ensurePortalMenus();
  invalidatePermissionCache();
}

export { normalizeRole };
