import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { BillingMethod, UtilityType } from "@prisma/client";
import { DEFAULT_UNIT_LABELS } from "@/lib/utility-service";

const VALID_TYPES: UtilityType[] = ["ELECTRICITY", "WATER", "INTERNET", "GAS", "OTHER"];
const VALID_METHODS: BillingMethod[] = ["METER", "LUMPSUM"];

export async function GET() {
  try {
    const utilities = await prisma.utility.findMany({
      orderBy: [{ active: "desc" }, { utilityType: "asc" }, { utilityName: "asc" }],
      include: {
        _count: { select: { roomUtilities: true, billings: true } },
      },
    });
    return NextResponse.json(utilities);
  } catch (error) {
    console.error("Utilities GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { utilityName, utilityType, billingMethod, amount, unitLabel, active } = body;

    if (!utilityName || !utilityType || !billingMethod || amount == null) {
      return NextResponse.json({ error: "Nama, tipe, metode billing, dan tarif wajib diisi" }, { status: 400 });
    }

    if (!VALID_TYPES.includes(utilityType)) {
      return NextResponse.json({ error: "Tipe utility tidak valid" }, { status: 400 });
    }
    if (!VALID_METHODS.includes(billingMethod)) {
      return NextResponse.json({ error: "Metode billing tidak valid" }, { status: 400 });
    }
    if (billingMethod === "METER" && parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Tarif per unit harus lebih dari 0" }, { status: 400 });
    }

    const utility = await prisma.utility.create({
      data: {
        utilityName: String(utilityName).trim(),
        utilityType,
        billingMethod,
        amount: parseFloat(amount),
        unitLabel: unitLabel || DEFAULT_UNIT_LABELS[utilityType as UtilityType] || null,
        active: active !== false,
      },
    });

    return NextResponse.json(utility, { status: 201 });
  } catch (error) {
    console.error("Utilities POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, utilityName, utilityType, billingMethod, amount, unitLabel, active } = body;
    if (!id) return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });

    const utility = await prisma.utility.update({
      where: { id: parseInt(id) },
      data: {
        ...(utilityName != null && { utilityName: String(utilityName).trim() }),
        ...(utilityType && VALID_TYPES.includes(utilityType) && { utilityType }),
        ...(billingMethod && VALID_METHODS.includes(billingMethod) && { billingMethod }),
        ...(amount != null && { amount: parseFloat(amount) }),
        ...(unitLabel !== undefined && { unitLabel: unitLabel || null }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    });

    return NextResponse.json(utility);
  } catch (error) {
    console.error("Utilities PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const billingCount = await prisma.utilityBilling.count({
      where: { utilityId: parseInt(id) },
    });
    if (billingCount > 0) {
      return NextResponse.json(
        { error: "Utility sudah memiliki riwayat tagihan, nonaktifkan saja" },
        { status: 400 }
      );
    }

    await prisma.roomUtility.deleteMany({ where: { utilityId: parseInt(id) } });
    await prisma.utility.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Utility berhasil dihapus" });
  } catch (error) {
    console.error("Utilities DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
