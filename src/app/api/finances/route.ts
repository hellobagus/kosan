import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectContext } from "@/lib/project-context";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {
      projectId: auth.context.projectId,
    };

    if (type) where.type = type;

    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      where.transactionDate = { gte: start, lte: end };
    } else if (year) {
      const start = new Date(parseInt(year), 0, 1);
      const end = new Date(parseInt(year), 11, 31);
      where.transactionDate = { gte: start, lte: end };
    }

    const finances = await prisma.finance.findMany({
      where,
      include: {
        tenant: { include: { user: true } },
        room: true,
        createdByUser: true,
      },
      orderBy: { transactionDate: "desc" },
    });

    const total = finances.reduce((sum, f) => sum + Number(f.amount), 0);

    return NextResponse.json({ finances, total });
  } catch (error) {
    console.error("Finances GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { type, amount, description, category, transactionDate, tenantId, roomId } = body;

    if (!type || !amount || !description) {
      return NextResponse.json({ error: "Data wajib belum lengkap" }, { status: 400 });
    }

    const finance = await prisma.finance.create({
      data: {
        type,
        amount: parseFloat(amount),
        description,
        category: category || null,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        tenantId: tenantId ? parseInt(tenantId) : null,
        roomId: roomId ? parseInt(roomId) : null,
        projectId: auth.context.projectId,
        createdBy: auth.session.userId,
      },
      include: {
        tenant: { include: { user: true } },
        room: true,
      },
    });

    return NextResponse.json(finance, { status: 201 });
  } catch (error) {
    console.error("Finances POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireProjectContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await prisma.finance.findFirst({
      where: { id: parseInt(id), projectId: auth.context.projectId },
    });
    if (!existing) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });

    await prisma.finance.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Transaksi berhasil dihapus" });
  } catch (error) {
    console.error("Finances DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
