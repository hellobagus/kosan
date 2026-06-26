"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, Landmark, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { parseAmount } from "@/lib/tenant-utils";
import type { TenantData } from "@/components/TenantBoard";

type PaymentMethod = "CASH" | "TRANSFER" | "MIDTRANS";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

function loadMidtransSnap(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
    const src = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

    const existing = document.querySelector(`script[data-midtrans-snap="true"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Gagal memuat Midtrans Snap")));
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.setAttribute("data-client-key", clientKey || "");
    script.setAttribute("data-midtrans-snap", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap"));
    document.body.appendChild(script);
  });
}

export function PaymentModal({
  tenant,
  onClose,
  onSuccess,
}: {
  tenant: TenantData;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const total = parseAmount(tenant.totalAmount || tenant.monthlyRent);
  const paid = parseAmount(tenant.paidAmount);
  const remaining = Math.max(0, total - paid);
  const isLunas = remaining <= 0;

  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState(String(remaining || ""));
  const [notes, setNotes] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [midtransOrderId, setMidtransOrderId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const parsedAmount = parseFloat(amount || "0");
  const amountInvalid = !amount || Number.isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > remaining;

  const methodOptions = useMemo(
    () => [
      { id: "CASH" as const, label: "Tunai", icon: Banknote, desc: "Pembayaran langsung tunai" },
      { id: "TRANSFER" as const, label: "Transfer", icon: Landmark, desc: "Transfer bank / e-wallet manual" },
      { id: "MIDTRANS" as const, label: "Midtrans", icon: CreditCard, desc: "Payment gateway (VA, QRIS, e-wallet)" },
    ],
    []
  );

  useEffect(() => {
    setAmount(String(remaining || ""));
  }, [remaining]);

  const pollPaymentStatus = async (orderId: string) => {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/payments?orderId=${encodeURIComponent(orderId)}`);
      if (!res.ok) continue;
      const payment = await res.json();
      if (payment.status === "SUCCESS") {
        setStatusMessage("Pembayaran berhasil dicatat.");
        onSuccess();
        onClose();
        return;
      }
      if (payment.status === "FAILED" || payment.status === "EXPIRED") {
        setError("Pembayaran Midtrans gagal atau kedaluwarsa.");
        return;
      }
    }
    setStatusMessage("Pembayaran masih diproses. Status akan diperbarui otomatis setelah konfirmasi Midtrans.");
    onSuccess();
    onClose();
  };

  const handleSubmit = async () => {
    if (!agreed) {
      setError("Centang konfirmasi pembayaran terlebih dahulu.");
      return;
    }
    if (amountInvalid) {
      setError("Nominal pembayaran tidak valid.");
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          amount: parsedAmount,
          method,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memproses pembayaran");
        return;
      }

      if (method === "MIDTRANS") {
        if (!data.snapToken) {
          setError("Token Midtrans tidak tersedia");
          return;
        }
        setMidtransOrderId(data.orderId);
        await loadMidtransSnap();
        window.snap?.pay(data.snapToken, {
          onSuccess: () => pollPaymentStatus(data.orderId),
          onPending: () => {
            setStatusMessage("Pembayaran menunggu konfirmasi. Memeriksa status...");
            pollPaymentStatus(data.orderId);
          },
          onError: () => setError("Pembayaran Midtrans gagal atau dibatalkan."),
          onClose: () => {
            if (!statusMessage) {
              setStatusMessage("Popup Midtrans ditutup. Jika sudah bayar, status akan diperbarui otomatis.");
              pollPaymentStatus(data.orderId);
            }
          },
        });
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Terjadi kesalahan saat memproses pembayaran");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">Pembayaran Penghuni</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-slate-900">{tenant.user.name}</p>
            <p className="text-slate-600">Kamar {tenant.room.roomNumber} · {tenant.invoiceNumber || "-"}</p>
            <dl className="mt-3 space-y-1">
              <div className="flex justify-between">
                <dt className="text-slate-500">Total Tagihan</dt>
                <dd className="font-medium">{formatCurrency(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Terbayar</dt>
                <dd className="font-medium text-emerald-600">{formatCurrency(paid)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <dt className="font-semibold text-slate-800">Sisa Tagihan</dt>
                <dd className="font-bold text-red-600">{formatCurrency(remaining)}</dd>
              </div>
            </dl>
          </div>

          {isLunas ? (
            <div className="text-center py-6">
              <p className="text-emerald-700 font-semibold text-lg">Tagihan sudah lunas</p>
              <Button variant="secondary" className="mt-4" onClick={onClose}>
                Tutup
              </Button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-2">Metode Pembayaran</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {methodOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = method === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMethod(opt.id)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-colors",
                          active
                            ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <Icon className={cn("w-5 h-5 mb-1", active ? "text-teal-600" : "text-slate-500")} />
                        <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Nominal Pembayaran"
                type="number"
                min="1"
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={amountInvalid && amount ? `Maksimal ${formatCurrency(remaining)}` : undefined}
              />

              {method === "TRANSFER" && (
                <Input
                  label="Referensi / Catatan Transfer"
                  placeholder="Contoh: BCA 1234567890 a.n Bagus"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              )}

              {method === "CASH" && (
                <Input
                  label="Catatan (opsional)"
                  placeholder="Contoh: Diterima langsung oleh admin"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              )}

              {method === "MIDTRANS" && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                  Anda akan diarahkan ke popup Midtrans untuk memilih metode bayar (VA, QRIS, GoPay, dll).
                  Pastikan <code className="bg-white/70 px-1 rounded">MIDTRANS_SERVER_KEY</code> dan{" "}
                  <code className="bg-white/70 px-1 rounded">NEXT_PUBLIC_MIDTRANS_CLIENT_KEY</code> sudah diatur di .env.
                  {midtransOrderId && (
                    <p className="mt-2 font-medium">Order ID: {midtransOrderId}</p>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
              )}
              {statusMessage && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  {statusMessage}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Konfirmasi pembayaran sudah benar<span className="text-red-500">*</span>
              </label>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                  Batal
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || amountInvalid || !agreed}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {loading
                    ? "Memproses..."
                    : method === "MIDTRANS"
                      ? "Bayar via Midtrans"
                      : "Simpan Pembayaran"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
