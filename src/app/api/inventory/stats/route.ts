import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getInventoryStats } from "@/lib/inventory-service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stats = await getInventoryStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Inventory stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
