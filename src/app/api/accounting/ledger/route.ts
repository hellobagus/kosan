import { NextRequest, NextResponse } from "next/server";
import { requireStaffModule } from "@/lib/api-auth";
import { getGeneralLedger } from "@/lib/accounting-service";

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
    const accountId = searchParams.get("accountId");
    if (!accountId) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    let start: Date | null = startDate ? new Date(startDate) : null;
    let end: Date | null = endDate ? new Date(endDate) : null;

    if (month && year) {
      start = new Date(parseInt(year), parseInt(month) - 1, 1);
      end = new Date(parseInt(year), parseInt(month), 0);
    } else if (year && !start && !end) {
      start = new Date(parseInt(year), 0, 1);
      end = new Date(parseInt(year), 11, 31);
    }

    const ledger = await getGeneralLedger(projectId, parseInt(accountId), start, end);
    return NextResponse.json(ledger);
  } catch (error) {
    console.error("Ledger GET error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
