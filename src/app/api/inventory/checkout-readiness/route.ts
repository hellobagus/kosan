import { NextRequest, NextResponse } from "next/server";
import { getTenantCheckoutAssets } from "@/lib/inventory-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    if (!tenantId) return NextResponse.json({ error: "tenantId wajib" }, { status: 400 });

    const data = await getTenantCheckoutAssets(parseInt(tenantId));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Checkout readiness GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
