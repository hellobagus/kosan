import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { attachSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      message: "Login berhasil",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

    await attachSession(response, {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    const isDev = process.env.NODE_ENV === "development";
    const detail =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Terjadi kesalahan server",
        ...(isDev && { detail }),
      },
      { status: 500 }
    );
  }
}
