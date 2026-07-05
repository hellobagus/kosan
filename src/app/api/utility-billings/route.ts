import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calcUtilityAmount, resolveRate } from "@/lib/utility-service";
import { parseAmount } from "@/lib/tenant-utils";
import { applyUtilityBillsToInvoice } from "@/lib/utility-invoice-service";
import {
  generateLumpSumForPeriod,
  applyAllToInvoiceForPeriod,
  isTenantEligibleForUsagePeriod,
} from "@/lib/utility-wizard-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const roomId = searchParams.get("roomId");
    const tenantId = searchParams.get("tenantId");

    const where: {
      periodMonth?: number;
      periodYear?: number;
      roomId?: number;
      tenantId?: number;
    } = {};

    if (month) where.periodMonth = parseInt(month);
    if (year) where.periodYear = parseInt(year);
    if (roomId) where.roomId = parseInt(roomId);
    if (tenantId) where.tenantId = parseInt(tenantId);

    const billings = await prisma.utilityBilling.findMany({
      where,
      include: {
        room: { select: { id: true, roomNumber: true, floor: true } },
        utility: true,
        tenant: { include: { user: { select: { name: true } } } },
      },
      orderBy: [
        { periodYear: "desc" },
        { periodMonth: "desc" },
        { room: { floor: "asc" } },
        { room: { roomNumber: "asc" } },
      ],
    });

    const total = billings.reduce((s, b) => s + parseAmount(b.totalAmount), 0);

    return NextResponse.json({ billings, total });
  } catch (error) {
    console.error("UtilityBillings GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    if (action === "generate_all") {
      return generateAllBillings(body);
    }

    if (action === "apply_to_invoice") {
      return applyToInvoice(body);
    }

    if (action === "apply_all_to_invoice") {
      return applyAllToInvoiceLegacy(body);
    }

    return createOrUpdateBilling(body);
  } catch (error) {
    console.error("UtilityBillings POST error:", error);
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createOrUpdateBilling(body: Record<string, unknown>) {
  const {
    roomId,
    utilityId,
    periodMonth,
    periodYear,
    currReading,
    notes,
  } = body as {
    roomId: number;
    utilityId: number;
    periodMonth: number;
    periodYear: number;
    currReading?: number | null;
    notes?: string;
  };

  if (!roomId || !utilityId || !periodMonth || !periodYear) {
    return NextResponse.json({ error: "Kamar, utility, dan periode wajib diisi" }, { status: 400 });
  }

  const roomUtility = await prisma.roomUtility.findUnique({
    where: {
      roomId_utilityId: {
        roomId: parseInt(String(roomId)),
        utilityId: parseInt(String(utilityId)),
      },
    },
    include: { utility: true },
  });

  if (!roomUtility || !roomUtility.active) {
    return NextResponse.json({ error: "Utility tidak terpasang di kamar ini" }, { status: 400 });
  }

  const utility = roomUtility.utility;
  const rate = resolveRate(parseAmount(utility.amount), parseAmount(roomUtility.customAmount));

  const prevReading =
    utility.billingMethod === "METER"
      ? parseAmount(roomUtility.lastReading)
      : null;

  const calc = calcUtilityAmount({
    billingMethod: utility.billingMethod,
    ratePerUnit: rate,
    prevReading,
    currReading: utility.billingMethod === "METER" ? currReading : null,
  });

  if (utility.billingMethod === "METER" && currReading == null) {
    return NextResponse.json({ error: "Angka meter terkini wajib diisi" }, { status: 400 });
  }
  if (utility.billingMethod === "METER" && calc.currReading! < calc.prevReading!) {
    return NextResponse.json({ error: "Angka meter tidak boleh lebih kecil dari sebelumnya" }, { status: 400 });
  }

  const activeTenant = await prisma.tenant.findFirst({
    where: { roomId: parseInt(String(roomId)), status: "ACTIVE" },
  });

  if (activeTenant) {
    const eligibility = isTenantEligibleForUsagePeriod(
      activeTenant.checkIn,
      parseInt(String(periodMonth)),
      parseInt(String(periodYear))
    );
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason || "Penghuni belum eligible untuk periode ini" },
        { status: 400 }
      );
    }
  }

  const billing = await prisma.$transaction(async (tx) => {
    const result = await tx.utilityBilling.upsert({
      where: {
        roomId_utilityId_periodMonth_periodYear: {
          roomId: parseInt(String(roomId)),
          utilityId: parseInt(String(utilityId)),
          periodMonth: parseInt(String(periodMonth)),
          periodYear: parseInt(String(periodYear)),
        },
      },
      create: {
        roomId: parseInt(String(roomId)),
        utilityId: parseInt(String(utilityId)),
        tenantId: activeTenant?.id || null,
        periodMonth: parseInt(String(periodMonth)),
        periodYear: parseInt(String(periodYear)),
        prevReading: calc.prevReading,
        currReading: calc.currReading,
        usage: calc.usage,
        ratePerUnit: rate,
        totalAmount: calc.totalAmount,
        notes: notes || null,
      },
      update: {
        tenantId: activeTenant?.id || null,
        prevReading: calc.prevReading,
        currReading: calc.currReading,
        usage: calc.usage,
        ratePerUnit: rate,
        totalAmount: calc.totalAmount,
        notes: notes !== undefined ? notes || null : undefined,
      },
      include: {
        room: { select: { id: true, roomNumber: true } },
        utility: true,
        tenant: { include: { user: { select: { name: true } } } },
      },
    });

    if (utility.billingMethod === "METER" && calc.currReading != null) {
      await tx.roomUtility.update({
        where: { id: roomUtility.id },
        data: { lastReading: calc.currReading },
      });
    }

    return result;
  });

  return NextResponse.json(billing, { status: 201 });
}

async function generateAllBillings(body: Record<string, unknown>) {
  const { periodMonth, periodYear } = body as { periodMonth: number; periodYear: number };

  if (!periodMonth || !periodYear) {
    return NextResponse.json({ error: "Bulan dan tahun wajib diisi" }, { status: 400 });
  }

  const result = await generateLumpSumForPeriod(
    parseInt(String(periodMonth)),
    parseInt(String(periodYear))
  );

  return NextResponse.json({
    message: `Berhasil: ${result.created} tagihan dibuat, ${result.skipped} dilewati`,
    ...result,
  });
}

async function applyToInvoice(body: Record<string, unknown>) {
  const { tenantId, roomId, periodMonth, periodYear } = body as {
    tenantId?: number;
    roomId?: number;
    periodMonth: number;
    periodYear: number;
  };

  if (!periodMonth || !periodYear) {
    return NextResponse.json({ error: "Bulan dan tahun wajib diisi" }, { status: 400 });
  }

  const result = await applyUtilityBillsToInvoice({
    tenantId: tenantId ? parseInt(String(tenantId)) : undefined,
    roomId: roomId ? parseInt(String(roomId)) : undefined,
    periodMonth: parseInt(String(periodMonth)),
    periodYear: parseInt(String(periodYear)),
  });

  return NextResponse.json({
    message: `${result.appliedCount} tagihan utility ditambahkan ke invoice (+${result.addedAmount.toLocaleString("id-ID")})`,
    ...result,
  });
}

async function applyAllToInvoiceLegacy(body: Record<string, unknown>) {
  const { periodMonth, periodYear } = body as { periodMonth: number; periodYear: number };

  if (!periodMonth || !periodYear) {
    return NextResponse.json({ error: "Bulan dan tahun wajib diisi" }, { status: 400 });
  }

  const result = await applyAllToInvoiceForPeriod(
    parseInt(String(periodMonth)),
    parseInt(String(periodYear))
  );

  return NextResponse.json({
    message: `Invoice diperbarui: ${result.applied} penghuni, ${result.skipped} dilewati`,
    ...result,
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.utilityBilling.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: "Tagihan berhasil dihapus" });
  } catch (error) {
    console.error("UtilityBillings DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
