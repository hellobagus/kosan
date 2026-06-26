import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createMidtransSnapToken,
  getMidtransClientKey,
  isMidtransConfigured,
} from "@/lib/midtrans";
import {
  createMidtransPayment,
  recordManualPayment,
} from "@/lib/payment-service";
import { parseAmount } from "@/lib/tenant-utils";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { tenantId, amount, method, notes } = body;

    if (!tenantId || !amount || !method) {
      return NextResponse.json({ error: "Data pembayaran belum lengkap" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Nominal pembayaran tidak valid" }, { status: 400 });
    }

    if (method === "CASH" || method === "TRANSFER") {
      const result = await recordManualPayment({
        tenantId: parseInt(tenantId),
        amount: parsedAmount,
        method,
        notes: notes || undefined,
        createdBy: session.userId,
      });
      return NextResponse.json({
        success: true,
        payment: result.payment,
        tenant: result.tenant,
      });
    }

    if (method === "MIDTRANS") {
      if (!isMidtransConfigured()) {
        return NextResponse.json(
          { error: "Midtrans belum dikonfigurasi. Atur MIDTRANS_SERVER_KEY di file .env" },
          { status: 503 }
        );
      }

      const { payment, tenant, orderId } = await createMidtransPayment({
        tenantId: parseInt(tenantId),
        amount: parsedAmount,
        notes: notes || undefined,
        createdBy: session.userId,
      });

      const snapToken = await createMidtransSnapToken({
        orderId,
        amount: parsedAmount,
        customerName: tenant.user.name,
        customerEmail: tenant.user.email,
        customerPhone: tenant.user.phone || undefined,
        itemName: `Sewa Kamar ${tenant.room.roomNumber}`,
      });

      return NextResponse.json({
        success: true,
        payment,
        snapToken,
        orderId,
        clientKey: getMidtransClientKey(),
      });
    }

    return NextResponse.json({ error: "Metode pembayaran tidak valid" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    console.error("Payments POST error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const tenantId = searchParams.get("tenantId");

    if (orderId) {
      const payment = await prisma.payment.findUnique({
        where: { orderId },
        include: { tenant: { include: { user: true, room: true } } },
      });
      if (!payment) return NextResponse.json({ error: "Pembayaran tidak ditemukan" }, { status: 404 });
      return NextResponse.json(payment);
    }

    if (tenantId) {
      const payments = await prisma.payment.findMany({
        where: { tenantId: parseInt(tenantId) },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return NextResponse.json(payments);
    }

    return NextResponse.json({ error: "orderId atau tenantId wajib" }, { status: 400 });
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
