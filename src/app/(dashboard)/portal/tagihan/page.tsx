"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, FileText, Landmark } from "lucide-react";
import { Button, Card, CardBody, Input, PageHeader, Badge } from "@/components/ui";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import { paymentStatusLabel } from "@/lib/tenant-utils";
import type { InvoiceBreakdown } from "@/lib/invoice-print";

type BillingData = {
  tenantId: number;
  tenant: {
    id: number;
    name: string;
    roomNumber: string;
    checkIn: string;
    dueDate?: string | null;
    leaseDuration?: string | null;
    paymentStatus: string;
    paidAmount: string | number;
    totalAmount?: string | number;
    invoiceNumber?: string | null;
  };
  summary: {
    rentDue: number;
    utilityDue: number;
    grandTotal: number;
    paidAmount: number;
    remaining: number;
    paymentStatus: string;
    dueDate?: string | null;
  };
  schedule: Array<{
    id: number;
    periodMonth: number;
    periodYear: number;
    utilityName: string;
    totalAmount: number;
    paidAmount: number;
    paymentStatus: string;
    status: string;
  }>;
  invoice: InvoiceBreakdown;
  organization?: {
    entityName?: string | null;
    projectName?: string | null;
  };
};

type PaymentMethod = "TRANSFER" | "MIDTRANS";

type MidtransSnap = {
  pay: (
    token: string,
    options?: {
      onSuccess?: () => void;
      onPending?: () => void;
      onError?: () => void;
      onClose?: () => void;
    }
  ) => void;
};

function getSnap(): MidtransSnap | undefined {
  return (window as unknown as { snap?: MidtransSnap }).snap;
}

function loadMidtransSnap(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (getSnap()) {
      resolve();
      return;
    }
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
    const src = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    const script = document.createElement("script");
    script.src = src;
    script.setAttribute("data-client-key", clientKey || "");
    script.setAttribute("data-midtrans-snap", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap"));
    document.body.appendChild(script);
  });
}

export default function TenantBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("MIDTRANS");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [tab, setTab] = useState<"aktif" | "riwayat">("aktif");
  const [history, setHistory] = useState<{
    payments: Array<{
      id: number;
      amount: number;
      methodLabel: string;
      status: string;
      orderId: string;
      notes?: string | null;
      createdAt: string;
    }>;
    utilityBillings: Array<{
      id: number;
      utilityName: string;
      periodMonth: number;
      periodYear: number;
      totalAmount: number;
      paidAmount: number;
      paymentStatus: string;
    }>;
    invoiceNumber?: string | null;
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [payMessage, setPayMessage] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/portal/billing")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tab !== "riwayat") return;
    setHistoryLoading(true);
    fetch("/api/portal/billing/history")
      .then((r) => r.json())
      .then((json) => { if (!json.error) setHistory(json); })
      .finally(() => setHistoryLoading(false));
  }, [tab]);

  const remaining = data?.summary.remaining ?? 0;
  const isLunas = remaining <= 0;

  useEffect(() => {
    if (data) setAmount(String(data.summary.remaining || ""));
  }, [data]);

  const parsedAmount = parseFloat(amount || "0");
  const amountInvalid = !amount || Number.isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > remaining;

  const methodOptions = useMemo(
    () => [
      { id: "MIDTRANS" as const, label: "Midtrans", icon: CreditCard, desc: "VA, QRIS, e-wallet" },
      { id: "TRANSFER" as const, label: "Transfer Bank", icon: Landmark, desc: "Konfirmasi transfer manual" },
    ],
    []
  );

  const printInvoice = async () => {
    if (!data) return;
    try {
      const { printInvoiceHtml } = await import("@/lib/invoice-print");
      printInvoiceHtml(
        {
          checkIn: data.tenant.checkIn,
          dueDate: data.tenant.dueDate ?? null,
          leaseDuration: data.tenant.leaseDuration ?? null,
          paymentStatus: data.tenant.paymentStatus,
          paidAmount: data.tenant.paidAmount,
        },
        data.invoice
      );
    } catch {
      alert("Gagal membuka invoice. Silakan coba lagi.");
    }
  };

  const pollPaymentStatus = async (orderId: string) => {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/payments?orderId=${encodeURIComponent(orderId)}`);
      if (!res.ok) continue;
      const payment = await res.json();
      if (payment.status === "SUCCESS") {
        setPayMessage("Pembayaran berhasil.");
        setShowPay(false);
        load();
        return;
      }
      if (payment.status === "FAILED" || payment.status === "EXPIRED") {
        setPayError("Pembayaran gagal atau kedaluwarsa.");
        return;
      }
    }
    setPayMessage("Pembayaran masih diproses. Status tagihan akan diperbarui otomatis.");
    setShowPay(false);
    load();
  };

  const handlePay = async () => {
    if (!data || !agreed) {
      setPayError("Centang konfirmasi pembayaran terlebih dahulu.");
      return;
    }
    if (amountInvalid) {
      setPayError("Nominal pembayaran tidak valid.");
      return;
    }

    setPaying(true);
    setPayError("");
    setPayMessage("");

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: data.tenantId,
          amount: parsedAmount,
          method,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memproses pembayaran");

      if (method === "MIDTRANS") {
        if (!json.snapToken) throw new Error("Token Midtrans tidak tersedia");
        await loadMidtransSnap();
        getSnap()?.pay(json.snapToken, {
          onSuccess: () => pollPaymentStatus(json.orderId),
          onPending: () => pollPaymentStatus(json.orderId),
          onError: () => setPayError("Pembayaran Midtrans gagal atau dibatalkan."),
          onClose: () => pollPaymentStatus(json.orderId),
        });
        return;
      }

      setPayMessage("Pembayaran transfer berhasil dicatat. Menunggu verifikasi pengelola.");
      setShowPay(false);
      load();
    } catch (error) {
      setPayError(error instanceof Error ? error.message : "Gagal memproses pembayaran");
    } finally {
      setPaying(false);
    }
  };

  if (loading && !data) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>;
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Tagihan & Invoice" description="Gagal memuat data tagihan." />
        <Button onClick={load}>Coba Lagi</Button>
      </div>
    );
  }

  const inv = data.invoice;

  return (
    <div>
      <PageHeader
        title="Tagihan & Invoice"
        description={
          data.organization?.projectName
            ? `${data.organization.entityName || "Entity"} · ${data.organization.projectName}`
            : "Ringkasan tagihan sewa, utilitas, dan jadwal penagihan."
        }
      />

      <div className="flex gap-2 mb-6">
        <Button variant={tab === "aktif" ? "primary" : "secondary"} onClick={() => setTab("aktif")}>
          Tagihan Aktif
        </Button>
        <Button variant={tab === "riwayat" ? "primary" : "secondary"} onClick={() => setTab("riwayat")}>
          Riwayat Tagihan
        </Button>
      </div>

      {tab === "riwayat" ? (
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h3 className="font-semibold text-slate-900 mb-3">Riwayat Pembayaran</h3>
              {historyLoading ? (
                <p className="text-sm text-slate-500">Memuat...</p>
              ) : !history?.payments.length ? (
                <p className="text-sm text-slate-500">Belum ada riwayat pembayaran.</p>
              ) : (
                <div className="space-y-2">
                  {history.payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{formatCurrency(p.amount)}</p>
                        <p className="text-slate-500">{p.methodLabel} · {formatShortDate(p.createdAt)}</p>
                        {p.notes && <p className="text-xs text-slate-400">{p.notes}</p>}
                      </div>
                      <Badge variant={p.status === "SUCCESS" ? "success" : p.status === "PENDING" ? "warning" : "default"}>
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="font-semibold text-slate-900 mb-3">Riwayat Tagihan Utilitas</h3>
              {historyLoading ? (
                <p className="text-sm text-slate-500">Memuat...</p>
              ) : !history?.utilityBillings.length ? (
                <p className="text-sm text-slate-500">Belum ada riwayat tagihan utilitas.</p>
              ) : (
                <div className="space-y-2">
                  {history.utilityBillings.map((b) => (
                    <div key={b.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{b.utilityName}</p>
                        <p className="text-slate-500">Periode {b.periodMonth}/{b.periodYear}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(b.totalAmount)}</p>
                        <p className="text-xs text-slate-500">{paymentStatusLabel(b.paymentStatus)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      ) : (
      <>
        <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="secondary" onClick={printInvoice}>
          <FileText className="w-4 h-4 mr-2" />
          Lihat / Cetak Invoice (PDF)
        </Button>
        {!isLunas && (
          <Button onClick={() => setShowPay((v) => !v)}>
            Bayar Tagihan
          </Button>
        )}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardBody><p className="text-sm text-slate-500">Total Tagihan</p><p className="text-xl font-bold">{formatCurrency(data.summary.grandTotal)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-slate-500">Sudah Dibayar</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(data.summary.paidAmount)}</p></CardBody></Card>
        <Card><CardBody><p className="text-sm text-slate-500">Sisa</p><p className="text-xl font-bold text-amber-600">{formatCurrency(data.summary.remaining)}</p></CardBody></Card>
      </div>

      <Card className="mb-6">
        <CardBody className="space-y-3 text-sm">
          <h3 className="font-semibold text-slate-900">Detail Invoice</h3>
          <div className="flex justify-between"><span>No. Invoice</span><span className="font-medium">{data.tenant.invoiceNumber || "—"}</span></div>
          <div className="flex justify-between"><span>Penghuni</span><span className="font-medium">{data.tenant.name}</span></div>
          <div className="flex justify-between"><span>Kamar</span><span>{data.tenant.roomNumber}</span></div>
          <div className="flex justify-between"><span>Status</span><Badge variant={data.summary.paymentStatus === "PAID" ? "success" : "warning"}>{paymentStatusLabel(data.summary.paymentStatus)}</Badge></div>
          <div className="flex justify-between"><span>Jatuh tempo</span><span>{data.summary.dueDate ? formatShortDate(data.summary.dueDate) : "—"}</span></div>

          <div className="border-t border-slate-100 pt-3 space-y-1">
            <div className="flex justify-between"><span>Sewa Kamar</span><span>{formatCurrency(inv.lines.rent)}</span></div>
            {inv.lines.deposit > 0 && (
              <div className="flex justify-between"><span>Deposit</span><span>{formatCurrency(inv.lines.deposit)}</span></div>
            )}
            {inv.lines.manualFees.map((f) => (
              <div key={f.name} className="flex justify-between"><span>{f.name}</span><span>{formatCurrency(f.amount)}</span></div>
            ))}
            {inv.lines.utilityFees.map((f) => (
              <div key={f.name} className="flex justify-between text-teal-800"><span>{f.name}</span><span>{formatCurrency(f.amount)}</span></div>
            ))}
            {inv.lines.discount > 0 && (
              <div className="flex justify-between text-emerald-700"><span>Diskon</span><span>-{formatCurrency(inv.lines.discount)}</span></div>
            )}
            <div className="flex justify-between font-semibold border-t border-slate-100 pt-2"><span>Total</span><span>{formatCurrency(inv.total)}</span></div>
          </div>

          {inv.bankAccounts && inv.bankAccounts.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <p className="font-medium text-slate-800 mb-1">Rekening Pembayaran</p>
              <ul className="space-y-1 text-slate-600">
                {inv.bankAccounts.map((b) => (
                  <li key={`${b.bankName}-${b.accountNumber}`}>
                    <strong>{b.bankName}</strong> — {b.accountNumber} a.n. {b.accountHolder}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inv.profile?.paymentNotes && (
            <div className="border-t border-slate-100 pt-3 text-slate-600 whitespace-pre-wrap">
              <p className="font-medium text-slate-800 mb-1">Catatan Pembayaran</p>
              {inv.profile.paymentNotes}
            </div>
          )}
        </CardBody>
      </Card>

      {showPay && !isLunas && (
        <Card className="mb-6 border-teal-200">
          <CardBody className="space-y-4">
            <h3 className="font-semibold text-slate-900">Bayar Tagihan</h3>
            <p className="text-sm text-slate-600">Sisa tagihan: <strong className="text-red-600">{formatCurrency(remaining)}</strong></p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      active ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 mb-1", active ? "text-teal-600" : "text-slate-500")} />
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            <Input
              label="Nominal Pembayaran"
              type="number"
              min="1"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            {method === "TRANSFER" && (
              <Input
                label="Referensi / Bukti Transfer"
                placeholder="Contoh: BCA 1234567890"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}

            {payError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{payError}</div>}
            {payMessage && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">{payMessage}</div>}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded" />
              Saya konfirmasi data pembayaran sudah benar
            </label>

            <div className="flex gap-2">
              <Button onClick={handlePay} disabled={paying || amountInvalid || !agreed}>
                {paying ? "Memproses..." : method === "MIDTRANS" ? "Bayar via Midtrans" : "Konfirmasi Transfer"}
              </Button>
              <Button variant="secondary" onClick={() => setShowPay(false)}>Batal</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h3 className="font-semibold text-slate-900 mb-3">Jadwal Tagihan Utilitas</h3>
          {data.schedule.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada tagihan utilitas.</p>
          ) : (
            <div className="space-y-2">
              {data.schedule.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{item.utilityName}</p>
                    <p className="text-slate-500">Periode {item.periodMonth}/{item.periodYear}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.totalAmount)}</p>
                    <p className="text-xs text-slate-500">{paymentStatusLabel(item.paymentStatus)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
      </>
      )}
    </div>
  );
}
