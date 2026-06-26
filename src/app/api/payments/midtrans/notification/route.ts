import { NextRequest, NextResponse } from "next/server";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { updateMidtransPaymentStatus } from "@/lib/payment-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      order_id,
      transaction_id,
      transaction_status,
      status_code,
      gross_amount,
      signature_key,
    } = body;

    if (!order_id || !transaction_status) {
      return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
    }

    if (signature_key && status_code && gross_amount) {
      const valid = verifyMidtransSignature({
        order_id,
        status_code: String(status_code),
        gross_amount: String(gross_amount),
        signature_key,
      });
      if (!valid) {
        console.error("Midtrans signature invalid for order:", order_id);
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    await updateMidtransPaymentStatus({
      orderId: order_id,
      transactionId: transaction_id,
      transactionStatus: transaction_status,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Midtrans notification error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
