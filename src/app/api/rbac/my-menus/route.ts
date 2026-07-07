import { NextResponse } from "next/server";
import { isAuthFailure, requireSession } from "@/lib/api-auth";
import { ensureRbacSeeded, getNavMenusForRole } from "@/lib/permission-service";

export async function GET() {
  try {
    const session = await requireSession();
    if (isAuthFailure(session)) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    await ensureRbacSeeded();
    const menus = await getNavMenusForRole(session.role);
    return NextResponse.json(menus);
  } catch (error) {
    console.error("RBAC my-menus GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
