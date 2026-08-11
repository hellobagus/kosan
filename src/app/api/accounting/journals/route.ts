import { NextRequest, NextResponse } from "next/server";
import { JournalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaffModule } from "@/lib/api-auth";
import {
  createPostedJournal,
  ensureChartOfAccounts,
  voidJournalEntry,
} from "@/lib/accounting-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffModule("billing", "view");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const projectId = auth.context.projectId;
    if (!projectId) {
      return NextResponse.json({ error: "Project belum dipilih" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status");
    const id = searchParams.get("id");

    if (id) {
      const entry = await prisma.journalEntry.findFirst({
        where: { id: parseInt(id), projectId },
        include: {
          lines: { include: { account: true }, orderBy: { lineOrder: "asc" } },
          finance: true,
        },
      });
      if (!entry) return NextResponse.json({ error: "Jurnal tidak ditemukan" }, { status: 404 });
      return NextResponse.json(entry);
    }

    const where: Record<string, unknown> = { projectId };
    if (status && Object.values(JournalStatus).includes(status as JournalStatus)) {
      where.status = status;
    }
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      where.entryDate = { gte: start, lte: end };
    } else if (year) {
      where.entryDate = {
        gte: new Date(parseInt(year), 0, 1),
        lte: new Date(parseInt(year), 11, 31),
      };
    }

    const journals = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: { include: { account: true }, orderBy: { lineOrder: "asc" } },
      },
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
      take: 500,
    });

    return NextResponse.json({ journals });
  } catch (error) {
    console.error("Journals GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffModule("billing", "create");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const projectId = auth.context.projectId;
    if (!projectId) {
      return NextResponse.json({ error: "Project belum dipilih" }, { status: 400 });
    }

    await ensureChartOfAccounts(projectId);
    const body = await request.json();

    if (body.action === "void") {
      if (!body.id) return NextResponse.json({ error: "ID required" }, { status: 400 });
      const existing = await prisma.journalEntry.findFirst({
        where: { id: Number(body.id), projectId },
      });
      if (!existing) return NextResponse.json({ error: "Jurnal tidak ditemukan" }, { status: 404 });

      const voided = await prisma.$transaction((tx) =>
        voidJournalEntry(tx, existing.id, body.reason || "Dibatalkan manual")
      );
      return NextResponse.json(voided);
    }

    const { entryDate, description, reference, lines } = body;
    if (!description || !Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json({ error: "Deskripsi dan minimal 2 baris jurnal wajib" }, { status: 400 });
    }

    const entry = await prisma.$transaction((tx) =>
      createPostedJournal(tx, {
        projectId,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        description,
        source: "MANUAL",
        reference: reference || null,
        createdBy: auth.session.userId,
        createdByName: auth.session.name,
        lines: lines.map((l: { accountId: number; debit?: number; credit?: number; memo?: string }) => ({
          accountId: Number(l.accountId),
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          memo: l.memo || null,
        })),
      })
    );

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Journals POST error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
