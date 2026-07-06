import { NextRequest, NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectProfileForRoom } from "@/lib/settings-service";
import { buildInventoryBaHtml, getRoomInventoryItems, toContractTenant } from "@/lib/contract-service";
import { kosanProfileToContractProfile } from "@/lib/contract-profile";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const type = request.nextUrl.searchParams.get("type") === "checkout" ? "checkout" : "checkin";

    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) },
      include: { user: true, room: true },
    });
    if (!tenant) return NextResponse.json({ error: "Penghuni tidak ditemukan" }, { status: 404 });

    if (!isStaff(session.role) && tenant.userId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile, items] = await Promise.all([
      getProjectProfileForRoom(tenant.roomId),
      getRoomInventoryItems(tenant.roomId),
    ]);

    const html = buildInventoryBaHtml(
      kosanProfileToContractProfile(profile),
      toContractTenant(tenant),
      items,
      type
    );

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="ba-inventaris-${tenant.user.name.replace(/\s+/g, "-")}.html"`,
      },
    });
  } catch (error) {
    console.error("Inventory BA GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
