import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffModule } from "@/lib/api-auth";
import {
  backfillFinanceJournals,
  closeAccountingPeriod,
  ensureChartOfAccounts,
  reopenAccountingPeriod,
} from "@/lib/accounting-service";

export async function GET() {
  try {
    const auth = await requireStaffModule("billing", "view");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const projectId = auth.context.projectId;
    if (!projectId) {
      return NextResponse.json({ error: "Project belum dipilih" }, { status: 400 });
    }

    const periods = await prisma.accountingPeriod.findMany({
      where: { projectId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 36,
    });

    return NextResponse.json({ periods });
  } catch (error) {
    console.error("Periods GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffModule("billing", "full");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const projectId = auth.context.projectId;
    if (!projectId) {
      return NextResponse.json({ error: "Project belum dipilih" }, { status: 400 });
    }

    const body = await request.json();

    if (body.action === "backfill") {
      await ensureChartOfAccounts(projectId);
      const result = await backfillFinanceJournals(projectId);
      return NextResponse.json(result);
    }

    if (body.action === "ensure-coa") {
      await ensureChartOfAccounts(projectId);
      return NextResponse.json({ message: "Bagan akun siap" });
    }

    const year = Number(body.year);
    const month = Number(body.month);
    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "Tahun dan bulan wajib valid" }, { status: 400 });
    }

    if (body.action === "close") {
      const period = await closeAccountingPeriod(projectId, year, month, auth.session.name);
      return NextResponse.json(period);
    }

    if (body.action === "reopen") {
      const period = await reopenAccountingPeriod(projectId, year, month);
      return NextResponse.json(period);
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("Periods POST error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
