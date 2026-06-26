import crypto from "crypto";

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

const SNAP_BASE = IS_PRODUCTION
  ? "https://app.midtrans.com"
  : "https://app.sandbox.midtrans.com";

export function isMidtransConfigured(): boolean {
  return Boolean(SERVER_KEY);
}

export function getMidtransClientKey(): string {
  return process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";
}

export function getMidtransSnapScriptUrl(): string {
  return IS_PRODUCTION
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export function verifyMidtransSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  if (!SERVER_KEY) return false;
  const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${SERVER_KEY}`;
  const expected = crypto.createHash("sha512").update(raw).digest("hex");
  return expected === payload.signature_key;
}

export async function createMidtransSnapToken(params: {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemName: string;
}): Promise<string> {
  if (!SERVER_KEY) {
    throw new Error("Midtrans belum dikonfigurasi. Atur MIDTRANS_SERVER_KEY di environment.");
  }

  const auth = Buffer.from(`${SERVER_KEY}:`).toString("base64");
  const res = await fetch(`${SNAP_BASE}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.amount,
      },
      customer_details: {
        first_name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone || undefined,
      },
      item_details: [
        {
          id: params.orderId,
          price: params.amount,
          quantity: 1,
          name: params.itemName.slice(0, 50),
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_messages?.join(", ") || data.status_message || "Gagal membuat transaksi Midtrans");
  }

  if (!data.token) {
    throw new Error("Token Midtrans tidak diterima");
  }

  return data.token;
}

export function isMidtransSuccessStatus(status: string): boolean {
  return status === "capture" || status === "settlement";
}

export function isMidtransPendingStatus(status: string): boolean {
  return status === "pending";
}

export function isMidtransFailedStatus(status: string): boolean {
  return ["deny", "cancel", "expire", "failure"].includes(status);
}
