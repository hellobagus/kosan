import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLE_OPTIONS } from "@/lib/rbac";
import { requireSession, requireModule, isAuthFailure } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }
    const denied = await requireModule(session, "accounts", "view");
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const whereRole = role && ROLE_OPTIONS.includes(role as UserRole) ? (role as UserRole) : undefined;

    const where = whereRole ? { role: whereRole } : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        address: true,
        isActive: true,
        createdAt: true,
        tenants: {
          where: { status: "ACTIVE" },
          include: { room: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }
    const denied = await requireModule(session, "accounts", "create");
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const body = await request.json();
    const { name, email, password, phone, role, address } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role,
        address: address || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }
    const denied = await requireModule(session, "accounts", "create");
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const body = await request.json();
    const { id, isActive, password, ...data } = body;

    const updateData: Record<string, unknown> = { ...data };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Users PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
