import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { isSuperAdmin } from "@/lib/rbac";
import { isAuthFailure, requireSession } from "@/lib/api-auth";
import {
  bulkUpsertPermissions,
  ensureRbacSeeded,
  getManageableRoles,
  getRoleDisplayName,
  listMenusWithPermissions,
  resetPermissionsFromMatrix,
  syncTenantPortalPermissions,
} from "@/lib/permission-service";

async function requireRbacAdmin() {
  const session = await requireSession();
  if (isAuthFailure(session)) return session;
  if (!isSuperAdmin(session.role)) {
    return { error: "Hanya Super Admin yang dapat mengelola menu & hak akses", status: 403 };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRbacAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await ensureRbacSeeded();

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role") as UserRole | null;

    const menus = await listMenusWithPermissions(roleParam || undefined);

    const flat = menus.map((menu) => ({
      id: menu.id,
      key: menu.key,
      name: menu.name,
      href: menu.href,
      parentKey: menu.parentKey,
      moduleKey: menu.moduleKey,
      icon: menu.icon,
      sortOrder: menu.sortOrder,
      isActive: menu.isActive,
      permission: menu.permissions[0] || null,
    }));

    return NextResponse.json({
      roles: getManageableRoles().map((role) => ({
        value: role,
        label: getRoleDisplayName(role),
      })),
      menus: flat,
    });
  } catch (error) {
    console.error("RBAC permissions GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireRbacAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action, permissions } = body;

    if (action === "reset_tenant_portal") {
      await syncTenantPortalPermissions();
      return NextResponse.json({ message: "Permission penghuni direset ke portal default" });
    }

    if (action === "reset_matrix") {
      await resetPermissionsFromMatrix();
      return NextResponse.json({ message: "Permission direset ke default matrix" });
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json({ error: "Data permission wajib diisi" }, { status: 400 });
    }

    const items = permissions.map((p: {
      role: UserRole;
      menuKey: string;
      canView: boolean;
      canCreate: boolean;
      canUpdate: boolean;
      canDelete: boolean;
    }) => ({
      role: p.role,
      menuKey: p.menuKey,
      canView: Boolean(p.canView),
      canCreate: Boolean(p.canCreate),
      canUpdate: Boolean(p.canUpdate),
      canDelete: Boolean(p.canDelete),
    }));

    await bulkUpsertPermissions(items);
    return NextResponse.json({ message: "Permission berhasil disimpan", count: items.length });
  } catch (error) {
    console.error("RBAC permissions PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
