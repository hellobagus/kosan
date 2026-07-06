import { NextRequest, NextResponse } from "next/server";
import { getSession, isStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKosanProfile } from "@/lib/settings-service";
import { buildContractHtml, toContractTenant } from "@/lib/contract-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(id) },
      include: { user: true, room: true },
    });
    if (!tenant) return NextResponse.json({ error: "Penghuni tidak ditemukan" }, { status: 404 });

    if (!isStaff(session.role) && tenant.userId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getKosanProfile();
    const html = buildContractHtml(
      {
        name: profile.name,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        managerName: profile.managerName,
        contractLocation: profile.contractLocation,
        latePenaltyPerDay: Number(profile.latePenaltyPerDay),
      },
      toContractTenant(tenant)
    );

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="kontrak-${tenant.user.name.replace(/\s+/g, "-")}.html"`,
      },
    });
  } catch (error) {
    console.error("Contract GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !isStaff(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { sendContractEmail } = await import("@/lib/contract-workflow");
    const result = await sendContractEmail(parseInt(id));
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.tenant);
  } catch (error) {
    console.error("Contract POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
