import { NextRequest, NextResponse } from "next/server";
import { buildInvoiceBreakdown } from "@/lib/utility-invoice-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const breakdown = await buildInvoiceBreakdown(parseInt(id));
    return NextResponse.json(breakdown);
  } catch (error) {
    console.error("Invoice GET error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
