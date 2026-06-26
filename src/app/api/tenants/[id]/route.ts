import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        room: true,
        finances: { orderBy: { transactionDate: "desc" } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Penghuni tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Tenant GET by id error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
