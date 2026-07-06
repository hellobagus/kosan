"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProjectRefreshKey } from "@/hooks/useProjectRefresh";
import {
  Calculator, CheckCircle2, ChevronRight, FileText, RefreshCw, Zap,
} from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState,
  Select, Button,
} from "@/components/ui";
import { cn, formatCurrency, getMonthName } from "@/lib/utils";

type WizardStep = 1 | 2 | 3 | 4;

interface MeterRow {
  roomUtilityId: number;
  roomId: number;
  utilityId: number;
  roomNumber: string;
  floor: number;
  tenantName: string | null;
  tenantEligible: boolean;
  tenantNote: string | null;
  isNewTenant: boolean;
  utilityName: string;
  unitLabel: string | null;
  rate: number;
  prevReading: number;
  currReading: number | null;
  usage: number | null;
  totalAmount: number | null;
  status: string;
}

interface LumpSumRow {
  roomNumber: string;
  tenantName: string | null;
  tenantEligible: boolean;
  tenantNote: string | null;
  utilityName: string;
  rate: number;
  totalAmount: number | null;
  status: string;
}

interface ReviewRoom {
  roomNumber: string;
  tenantName: string | null;
  tenantEligible: boolean;
  tenantNote: string | null;
  items: Array<{
    utilityName: string;
    amount: number;
    usage: number | null;
    unitLabel: string | null;
    invoiced: boolean;
  }>;
  total: number;
}

interface WizardData {
  usagePeriod: { month: number; year: number; label: string };
  invoicePeriod: { month: number; year: number; label: string };
  meterRows: MeterRow[];
  lumpSumRows: LumpSumRow[];
  reviewRooms: ReviewRoom[];
  summary: {
    meterDone: number;
    meterTotal: number;
    meterPending: number;
    lumpDone: number;
    lumpTotal: number;
    lumpPending: number;
    invoiceReady: number;
    invoiceApplied: number;
    grandTotal: number;
    billingCount: number;
  };
}

const STEPS = [
  { num: 1 as const, label: "Input Meter", icon: Calculator },
  { num: 2 as const, label: "Lump Sum", icon: Zap },
  { num: 3 as const, label: "Review", icon: CheckCircle2 },
  { num: 4 as const, label: "Invoice", icon: FileText },
];

export default function UtilityBillingBoard() {
  const refreshKey = useProjectRefreshKey();
  const now = new Date();
  const [invoiceMonth, setInvoiceMonth] = useState(String(now.getMonth() + 1));
  const [invoiceYear, setInvoiceYear] = useState(String(now.getFullYear()));
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meterInputs, setMeterInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const fetchWizard = useCallback(() => {
    setLoading(true);
    fetch(`/api/utility-billings/wizard?invoiceMonth=${invoiceMonth}&invoiceYear=${invoiceYear}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        const inputs: Record<string, string> = {};
        (d.meterRows || []).forEach((row: MeterRow) => {
          const key = `${row.roomId}-${row.utilityId}`;
          if (row.currReading != null) {
            inputs[key] = String(row.currReading);
          }
        });
        setMeterInputs(inputs);
      })
      .finally(() => setLoading(false));
  }, [invoiceMonth, invoiceYear]);

  useEffect(() => { fetchWizard(); }, [fetchWizard, refreshKey]);

  const meterKey = (roomId: number, utilityId: number) => `${roomId}-${utilityId}`;

  const previewRow = (row: MeterRow) => {
    const key = meterKey(row.roomId, row.utilityId);
    const curr = parseFloat(meterInputs[key] || "");
    if (Number.isNaN(curr)) return null;
    const usage = Math.max(0, curr - row.prevReading);
    return { usage, total: Math.round(usage * row.rate) };
  };

  const pendingMeterInputs = useMemo(() => {
    if (!data) return [];
    return data.meterRows
      .filter((row) => {
        const key = meterKey(row.roomId, row.utilityId);
        const val = meterInputs[key];
        return val && !Number.isNaN(parseFloat(val)) && row.status !== "done";
      })
      .map((row) => ({
        roomId: row.roomId,
        utilityId: row.utilityId,
        currReading: parseFloat(meterInputs[meterKey(row.roomId, row.utilityId)]),
      }));
  }, [data, meterInputs]);

  const handleSaveMeters = async () => {
    if (pendingMeterInputs.length === 0) {
      setMessage("Isi minimal satu angka meter baru");
      return;
    }
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/utility-billings/wizard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk_meter",
        invoiceMonth: parseInt(invoiceMonth),
        invoiceYear: parseInt(invoiceYear),
        readings: pendingMeterInputs,
      }),
    });
    const result = await res.json();
    setMessage(result.message || result.error || "Selesai");
    fetchWizard();
    setSaving(false);
    if (res.ok) setStep(2);
  };

  const handleGenerateLumpSum = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/utility-billings/wizard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_lump_sum",
        invoiceMonth: parseInt(invoiceMonth),
        invoiceYear: parseInt(invoiceYear),
      }),
    });
    const result = await res.json();
    setMessage(result.message || result.error || "Selesai");
    fetchWizard();
    setSaving(false);
    if (res.ok) setStep(3);
  };

  const handleApplyInvoice = async () => {
    if (!confirm(`Terapkan tagihan ke invoice penghuni untuk periode ${data?.invoicePeriod.label}?`)) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/utility-billings/wizard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply_invoice",
        invoiceMonth: parseInt(invoiceMonth),
        invoiceYear: parseInt(invoiceYear),
      }),
    });
    const result = await res.json();
    setMessage(result.message || result.error || "Selesai");
    fetchWizard();
    setSaving(false);
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Tagihan Utility Bulanan"
        description="Wizard input meter — mudah dipahami untuk semua admin"
      />

      {/* Period selector */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Ditagih di Invoice</p>
              <div className="flex gap-2">
                <Select
                  value={invoiceMonth}
                  onChange={(e) => setInvoiceMonth(e.target.value)}
                  className="w-36"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                  ))}
                </Select>
                <Select
                  value={invoiceYear}
                  onChange={(e) => setInvoiceYear(e.target.value)}
                  className="w-24"
                >
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Select>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 mb-2 hidden sm:block" />
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">Pemakaian dihitung untuk</p>
              <p className="text-sm font-bold text-blue-900">{data?.usagePeriod.label}</p>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 ml-auto">
              <p className="text-xs text-teal-600 font-medium">Total tagihan</p>
              <p className="text-lg font-bold text-teal-800">
                {formatCurrency(data?.summary.grandTotal || 0)}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Meter dibaca akhir {data?.usagePeriod.label} → masuk invoice {data?.invoicePeriod.label}.
            Penghuni baru ditagih utility mulai invoice bulan setelah masuk.
          </p>
        </CardBody>
      </Card>

      {/* Step indicator */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.num;
          const done =
            (s.num === 1 && (data?.summary.meterPending === 0 && data?.summary.meterTotal > 0)) ||
            (s.num === 2 && data?.summary.lumpPending === 0 && data?.summary.lumpTotal > 0) ||
            (s.num === 3 && (data?.summary.billingCount || 0) > 0) ||
            (s.num === 4 && (data?.summary.invoiceApplied || 0) > 0);
          return (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                active
                  ? "bg-teal-600 text-white border-teal-600"
                  : done
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{s.num}.</span> {s.label}
              {s.num === 1 && data && (
                <span className="text-xs opacity-80">({data.summary.meterDone}/{data.summary.meterTotal})</span>
              )}
              {s.num === 2 && data && (
                <span className="text-xs opacity-80">({data.summary.lumpDone}/{data.summary.lumpTotal})</span>
              )}
            </button>
          );
        })}
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {message}
        </div>
      )}

      {/* Step 1: Bulk meter input */}
      {step === 1 && (
        <Card>
          <CardBody className="p-0">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Langkah 1 — Input Angka Meter</h3>
                <p className="text-sm text-slate-500">
                  Isi meter akhir {data?.usagePeriod.label} untuk semua kamar sekaligus
                </p>
              </div>
              <Badge variant="info">{data?.summary.meterPending || 0} belum diisi</Badge>
            </div>
            {!data?.meterRows.length ? (
              <EmptyState message="Belum ada utility meter terpasang di kamar. Pasang dulu di Utility per Kamar." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Kamar</Th>
                        <Th>Penghuni</Th>
                        <Th>Utility</Th>
                        <Th>Meter Awal</Th>
                        <Th>Meter Akhir</Th>
                        <Th>Pemakaian</Th>
                        <Th>Tagihan</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.meterRows.map((row) => {
                        const key = meterKey(row.roomId, row.utilityId);
                        const preview = previewRow(row);
                        const isDone = row.status === "done";
                        return (
                          <tr
                            key={key}
                            className={cn(
                              !row.tenantEligible && "opacity-50",
                              !isDone && !meterInputs[key] && "bg-amber-50/50"
                            )}
                          >
                            <Td className="font-medium">{row.roomNumber}</Td>
                            <Td>
                              <div>{row.tenantName || <span className="text-slate-400">Kosong</span>}</div>
                              {row.tenantNote && (
                                <span className="text-[10px] text-amber-600">{row.tenantNote}</span>
                              )}
                              {row.isNewTenant && (
                                <Badge variant="warning">Baru</Badge>
                              )}
                            </Td>
                            <Td>
                              {row.utilityName}
                              <span className="text-slate-400 text-xs ml-1">({row.unitLabel})</span>
                            </Td>
                            <Td>{row.prevReading}</Td>
                            <Td>
                              {isDone ? (
                                <span className="font-medium">{row.currReading}</span>
                              ) : (
                                <input
                                  type="number"
                                  min={row.prevReading}
                                  step="0.01"
                                  placeholder="Isi meter..."
                                  value={meterInputs[key] || ""}
                                  onChange={(e) =>
                                    setMeterInputs({ ...meterInputs, [key]: e.target.value })
                                  }
                                  className="w-28 px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                />
                              )}
                            </Td>
                            <Td>
                              {isDone
                                ? `${row.usage} ${row.unitLabel}`
                                : preview
                                  ? `${preview.usage} ${row.unitLabel}`
                                  : "-"}
                            </Td>
                            <Td className="font-semibold text-teal-700">
                              {isDone
                                ? formatCurrency(row.totalAmount || 0)
                                : preview
                                  ? formatCurrency(preview.total)
                                  : "-"}
                            </Td>
                            <Td>
                              <Badge variant={isDone ? "success" : "warning"}>
                                {isDone ? "Selesai" : "Belum"}
                              </Badge>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                  <Button variant="secondary" onClick={fetchWizard} disabled={saving}>
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </Button>
                  <Button onClick={handleSaveMeters} disabled={saving || pendingMeterInputs.length === 0}>
                    {saving ? "Menyimpan..." : `Simpan ${pendingMeterInputs.length} Meter →`}
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* Step 2: Lump sum */}
      {step === 2 && (
        <Card>
          <CardBody>
            <h3 className="font-semibold text-slate-900 mb-1">Langkah 2 — Generate Lump Sum</h3>
            <p className="text-sm text-slate-500 mb-4">
              Internet, service charge, dan utility tarif tetap — otomatis per kamar
            </p>
            {!data?.lumpSumRows.length ? (
              <EmptyState message="Tidak ada utility lump sum terpasang." />
            ) : (
              <div className="overflow-x-auto mb-4">
                <Table>
                  <thead>
                    <tr>
                      <Th>Kamar</Th>
                      <Th>Penghuni</Th>
                      <Th>Utility</Th>
                      <Th>Tarif</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lumpSumRows.map((row, i) => (
                      <tr key={i} className={!row.tenantEligible ? "opacity-50" : ""}>
                        <Td className="font-medium">{row.roomNumber}</Td>
                        <Td>
                          {row.tenantName || "-"}
                          {row.tenantNote && (
                            <p className="text-[10px] text-amber-600">{row.tenantNote}</p>
                          )}
                        </Td>
                        <Td>{row.utilityName}</Td>
                        <Td>{formatCurrency(row.rate)}/bulan</Td>
                        <Td>
                          <Badge variant={row.status === "done" ? "success" : "default"}>
                            {row.status === "done"
                              ? formatCurrency(row.totalAmount || 0)
                              : "Belum generate"}
                          </Badge>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
            <div className="flex justify-between items-center">
              <Button variant="secondary" onClick={() => setStep(1)}>← Kembali</Button>
              <Button onClick={handleGenerateLumpSum} disabled={saving}>
                {saving ? "Memproses..." : `Generate Lump Sum (${data?.summary.lumpPending || 0} pending) →`}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardBody>
            <h3 className="font-semibold text-slate-900 mb-1">Langkah 3 — Review Tagihan</h3>
            <p className="text-sm text-slate-500 mb-4">
              Cek semua tagihan sebelum dikirim ke invoice {data?.invoicePeriod.label}
            </p>
            {!data?.reviewRooms.length ? (
              <EmptyState message="Belum ada tagihan. Selesaikan langkah 1 & 2 terlebih dahulu." />
            ) : (
              <div className="space-y-4 mb-4">
                {data.reviewRooms.map((room) => (
                  <div
                    key={room.roomNumber}
                    className={cn(
                      "border rounded-lg p-4",
                      room.tenantEligible ? "border-slate-200" : "border-amber-200 bg-amber-50/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-bold text-slate-900">Kamar {room.roomNumber}</span>
                        <span className="text-slate-500 text-sm ml-2">
                          {room.tenantName || "Kosong"}
                        </span>
                        {room.tenantNote && (
                          <span className="ml-2"><Badge variant="warning">{room.tenantNote}</Badge></span>
                        )}
                      </div>
                      <span className="font-bold text-teal-700">{formatCurrency(room.total)}</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      {room.items.map((item, i) => (
                        <li key={i} className="flex justify-between text-slate-600">
                          <span>
                            {item.utilityName}
                            {item.usage != null && ` (${item.usage} ${item.unitLabel})`}
                            {item.invoiced && (
                              <span className="ml-1"><Badge variant="success">Invoiced</Badge></span>
                            )}
                          </span>
                          <span>{formatCurrency(item.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg mb-4">
              <span className="font-semibold">Grand Total</span>
              <span className="text-xl font-bold text-teal-700">
                {formatCurrency(data?.summary.grandTotal || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>← Kembali</Button>
              <Button onClick={() => setStep(4)}>Lanjut ke Invoice →</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 4: Apply to invoice */}
      {step === 4 && (
        <Card>
          <CardBody>
            <h3 className="font-semibold text-slate-900 mb-1">Langkah 4 — Terapkan ke Invoice Penghuni</h3>
            <p className="text-sm text-slate-500 mb-4">
              Tagihan utility pemakaian <strong>{data?.usagePeriod.label}</strong> akan
              ditambahkan ke invoice <strong>{data?.invoicePeriod.label}</strong> masing-masing penghuni aktif.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">{data?.summary.invoiceReady || 0}</p>
                <p className="text-sm text-blue-600">Siap diterapkan</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-emerald-700">{data?.summary.invoiceApplied || 0}</p>
                <p className="text-sm text-emerald-600">Sudah di invoice</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-teal-700">
                  {formatCurrency(data?.summary.grandTotal || 0)}
                </p>
                <p className="text-sm text-teal-600">Total tagihan</p>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(3)}>← Kembali</Button>
              <Button
                onClick={handleApplyInvoice}
                disabled={saving || (data?.summary.invoiceReady || 0) === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? "Memproses..." : "Kirim ke Invoice Penghuni"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
