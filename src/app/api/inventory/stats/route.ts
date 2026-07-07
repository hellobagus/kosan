import { NextResponse } from "next/server";
import { getInventoryStats } from "@/lib/inventory-service";
import { requireStaffModule } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireStaffModule("inventory", "view");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const stats = await getInventoryStats(auth.context.projectId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Inventory stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
