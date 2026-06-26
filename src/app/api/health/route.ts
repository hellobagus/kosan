import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const tables = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists
    `;

    const userCount = tables[0]?.exists
      ? await prisma.user.count()
      : 0;

    return NextResponse.json({
      status: "ok",
      database: "connected",
      usersTable: tables[0]?.exists ?? false,
      userCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message,
      },
      { status: 500 }
    );
  }
}
