import { NextRequest, NextResponse } from "next/server";
import { requireStaffModule } from "@/lib/api-auth";
import {
  getBalanceSheet,
  getIncomeStatement,
  getTrialBalance,
} from "@/lib/accounting-service";

function resolveRange(searchParams: URLSearchParams) {
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const asOf = searchParams.get("asOf");

  if (asOf) {
    const d = new Date(asOf);
    return { start: new Date(d.getFullYear(), 0, 1), end: d };
  }

  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }

  const y = year ? parseInt(year) : new Date().getFullYear();
  if (month) {
    const m = parseInt(month);
    return {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 0),
    };
  }

  return {
    start: new Date(y, 0, 1),
    end: new Date(y, 11, 31),
  };
}

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
    const type = searchParams.get("type") || "trial-balance";
    const { start, end } = resolveRange(searchParams);

    if (type === "trial-balance") {
      const data = await getTrialBalance(projectId, start, end);
      return NextResponse.json({ ...data, startDate: start, endDate: end });
    }

    if (type === "income-statement" || type === "laba-rugi") {
      const data = await getIncomeStatement(projectId, start, end);
      return NextResponse.json({ ...data, startDate: start, endDate: end });
    }

    if (type === "balance-sheet" || type === "neraca") {
      const data = await getBalanceSheet(projectId, end);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Tipe laporan tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("Accounting reports GET error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
