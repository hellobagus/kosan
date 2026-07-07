import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/rbac";
import { isAuthFailure, requireSession } from "@/lib/api-auth";
import { ensureRbacSeeded, invalidatePermissionCache } from "@/lib/permission-service";

async function requireRbacAdmin() {
  const session = await requireSession();
  if (isAuthFailure(session)) return session;
  if (!isSuperAdmin(session.role)) {
    return { error: "Hanya Super Admin yang dapat mengelola menu & hak akses", status: 403 };
  }
  return { session };
}

export async function GET() {
  try {
    const auth = await requireRbacAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await ensureRbacSeeded();
    const menus = await prisma.appMenu.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { children: { orderBy: { sortOrder: "asc" } } },
    });

    const roots = menus.filter((m) => !m.parentKey);
    return NextResponse.json(roots);
  } catch (error) {
    console.error("RBAC menus GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRbacAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { key, name, href, parentKey, moduleKey, icon, sortOrder, isActive } = body;

    if (!key || !name || !moduleKey) {
      return NextResponse.json({ error: "Key, nama, dan module wajib diisi" }, { status: 400 });
    }

    await ensureRbacSeeded();

    const menu = await prisma.appMenu.create({
      data: {
        key: String(key).trim(),
        name: String(name).trim(),
        href: href ? String(href).trim() : null,
        parentKey: parentKey || null,
        moduleKey: String(moduleKey).trim(),
        icon: icon || null,
        sortOrder: sortOrder ? parseInt(String(sortOrder), 10) : 0,
        isActive: isActive !== false,
      },
    });

    const roles = Object.values(UserRole);
    await prisma.roleMenuPermission.createMany({
      data: roles.map((role) => ({
        role,
        menuKey: menu.key,
        canView: isSuperAdmin(role),
        canCreate: isSuperAdmin(role),
        canUpdate: isSuperAdmin(role),
        canDelete: isSuperAdmin(role),
      })),
      skipDuplicates: true,
    });

    invalidatePermissionCache();
    return NextResponse.json(menu, { status: 201 });
  } catch (error) {
    console.error("RBAC menus POST error:", error);
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
    const { id, key, name, href, parentKey, moduleKey, icon, sortOrder, isActive } = body;

    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const menu = await prisma.appMenu.update({
      where: { id: parseInt(String(id), 10) },
      data: {
        ...(key !== undefined && { key: String(key).trim() }),
        ...(name !== undefined && { name: String(name).trim() }),
        ...(href !== undefined && { href: href ? String(href).trim() : null }),
        ...(parentKey !== undefined && { parentKey: parentKey || null }),
        ...(moduleKey !== undefined && { moduleKey: String(moduleKey).trim() }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(String(sortOrder), 10) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    invalidatePermissionCache();
    return NextResponse.json(menu);
  } catch (error) {
    console.error("RBAC menus PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRbacAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    await prisma.appMenu.delete({ where: { id: parseInt(id, 10) } });
    invalidatePermissionCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RBAC menus DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
