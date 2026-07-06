"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, CheckCircle, XCircle, Mail, FileText, PenLine,
  Package, LogIn, Printer, RefreshCw, ChevronLeft, ChevronRight, Upload, ExternalLink,
} from "lucide-react";
import { Button, Card, CardBody, EmptyState, Badge } from "@/components/ui";
import { cn, formatCurrency, formatShortDate } from "@/lib/utils";
import { parseAmount } from "@/lib/tenant-utils";
import { fetchAndPrintContract, fetchAndPrintInventoryBa } from "@/lib/contract-print";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Menunggu Verifikasi",
  APPROVED: "Disetujui",
  CONTRACT_SENT: "Kontrak Terkirim",
  CONTRACT_SIGNED: "Kontrak Ditandatangani",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDING: "warning",
  APPROVED: "info",
  CONTRACT_SENT: "info",
  CONTRACT_SIGNED: "success",
};

interface WorkflowTenant {
  id: number;
  status: string;
  checkIn: string;
  monthlyRent: string;
  deposit: string;
  leaseDuration: string | null;
  contractSentAt: string | null;
  contractSignedAt: string | null;
  contractSignedUrl: string | null;
  inventoryBaAt: string | null;
  approvedAt: string | null;
  user: { name: string; email: string; phone: string | null };
  room: { roomNumber: string };
}

const WORKFLOW_STATUSES = ["PENDING", "APPROVED", "CONTRACT_SENT", "CONTRACT_SIGNED"];

export default function TenantWorkflowBoard() {
  const [tenants, setTenants] = useState<WorkflowTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [signModal, setSignModal] = useState<WorkflowTenant | null>(null);
  const [signFile, setSignFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.all(
      WORKFLOW_STATUSES.map((s) =>
        fetch(`/api/tenants?status=${s}`).then((r) => r.json())
      )
    );
    setTenants(results.flat());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = tenants;
    if (statusFilter !== "ALL") list = list.filter((t) => t.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.user.name.toLowerCase().includes(q) ||
          t.room.roomNumber.toLowerCase().includes(q) ||
          t.user.email.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.id - a.id);
  }, [tenants, search, statusFilter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const runAction = async (tenantId: number, action: string, extra?: Record<string, unknown>) => {
    setActionLoading(tenantId);
    setMessage("");
    const res = await fetch("/api/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tenantId, action, ...extra }),
    });
    const data = await res.json();
    setActionLoading(null);
    if (!res.ok) {
      setMessage(data.error || "Gagal memproses");
      return;
    }
    if (action === "send_contract" && !data.emailSent) {
      setMessage("Kontrak dibuat. SMTP belum dikonfigurasi — gunakan tombol Cetak Kontrak untuk mengirim manual.");
    } else {
      setMessage("Berhasil diproses");
    }
    load();
  };

  const handlePrintContract = async (id: number) => {
    try {
      await fetchAndPrintContract(id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal mencetak kontrak");
    }
  };

  const handlePrintBa = async (id: number) => {
    try {
      await fetchAndPrintInventoryBa(id, "checkin");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal mencetak BA inventaris");
    }
  };

  const handleSignContract = async () => {
    if (!signModal) return;
    setActionLoading(signModal.id);
    setMessage("");

    try {
      const formData = new FormData();
      if (signFile) formData.append("file", signFile);

      const res = await fetch(`/api/tenants/${signModal.id}/contract/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Gagal menandatangani kontrak");
        return;
      }
      setMessage(signFile ? "Kontrak ditandatangani dan scan berhasil diunggah" : "Kontrak ditandatangani (TTD manual)");
      setSignModal(null);
      setSignFile(null);
      load();
    } catch {
      setMessage("Gagal menandatangani kontrak");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {["ALL", ...WORKFLOW_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                statusFilter === s
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
              )}
            >
              {s === "ALL" ? "Semua" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-slate-500 hover:text-teal-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama, kamar, email..."
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm w-56"
            />
          </div>
        </div>
      </div>

      {message && (
        <div className={cn(
          "mb-4 px-4 py-3 rounded text-sm border",
          message.includes("Gagal") || message.includes("belum")
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-green-50 text-green-700 border-green-200"
        )}>
          {message}
        </div>
      )}

      {/* Workflow diagram */}
      <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {[
            "Input", "Verifikasi", "Cetak/Kirim Kontrak", "TTD Manual", "BA Inventaris", "Check-in Aktif",
          ].map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300">→</span>}
              <span className="px-2 py-1 bg-white border border-slate-200 rounded font-medium">{step}</span>
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <EmptyState message="Belum ada calon penghuni dalam proses kontrak" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-4 py-3 text-left">Kamar</th>
                    <th className="px-4 py-3 text-left">Calon Penghuni</th>
                    <th className="px-4 py-3 text-left">Sewa</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left w-56">Aksi Workflow</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((t) => {
                    const busy = actionLoading === t.id;
                    return (
                      <tr key={t.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3">
                          <p className="font-bold text-blue-600">{t.room.roomNumber}</p>
                          <p className="text-xs text-slate-500 mt-1">Masuk: {formatShortDate(t.checkIn)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{t.user.name}</p>
                          <p className="text-xs text-slate-500">{t.user.email}</p>
                          <p className="text-xs text-slate-500">{t.user.phone || "-"}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p>{t.leaseDuration || "1 Bulan"}</p>
                          <p className="font-semibold">{formatCurrency(parseAmount(t.monthlyRent))}/bln</p>
                          <p>Deposit: {formatCurrency(parseAmount(t.deposit))}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[t.status] || "default"}>
                            {STATUS_LABELS[t.status] || t.status}
                          </Badge>
                          {t.contractSentAt && (
                            <p className="text-xs text-slate-400 mt-1">Dikirim: {formatShortDate(t.contractSentAt)}</p>
                          )}
                          {t.contractSignedAt && (
                            <p className="text-xs text-slate-400">TTD: {formatShortDate(t.contractSignedAt)}</p>
                          )}
                          {t.contractSignedUrl && (
                            <a
                              href={t.contractSignedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline mt-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Lihat Scan Kontrak
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {t.status === "PENDING" && (
                              <>
                                <Button disabled={busy} onClick={() => runAction(t.id, "approve")}
                                  className="!py-1 !px-2 !text-xs bg-emerald-600 hover:bg-emerald-700">
                                  <CheckCircle className="w-3 h-3" /> Setujui
                                </Button>
                                <Button variant="danger" disabled={busy} onClick={() => runAction(t.id, "reject")}
                                  className="!py-1 !text-xs">
                                  <XCircle className="w-3 h-3" /> Tolak
                                </Button>
                              </>
                            )}
                            {(t.status === "APPROVED" || t.status === "CONTRACT_SENT") && (
                              <>
                                <Button disabled={busy} onClick={() => runAction(t.id, "send_contract")}
                                  className="!py-1 !text-xs bg-blue-600 hover:bg-blue-700">
                                  <Mail className="w-3 h-3" /> Kirim Kontrak
                                </Button>
                                <Button variant="secondary" disabled={busy}
                                  onClick={() => handlePrintContract(t.id)} className="!py-1 !text-xs">
                                  <Printer className="w-3 h-3" /> Cetak Kontrak
                                </Button>
                              </>
                            )}
                            {(t.status === "CONTRACT_SENT" || t.status === "APPROVED") && (
                              <>
                                <Button disabled={busy} onClick={() => { setSignModal(t); setSignFile(null); }}
                                  className="!py-1 !text-xs bg-violet-600 hover:bg-violet-700 text-white">
                                  <PenLine className="w-3 h-3" /> TTD Manual
                                </Button>
                              </>
                            )}
                            {t.status === "CONTRACT_SIGNED" && (
                              <>
                                <Button disabled={busy} onClick={() => runAction(t.id, "generate_ba")}
                                  className="!py-1 !text-xs bg-slate-600 hover:bg-slate-700 text-white">
                                  <Package className="w-3 h-3" /> Generate BA
                                </Button>
                                <Button variant="secondary" disabled={busy}
                                  onClick={() => handlePrintBa(t.id)} className="!py-1 !text-xs">
                                  <FileText className="w-3 h-3" /> Cetak BA
                                </Button>
                                <Button disabled={busy} onClick={() => runAction(t.id, "checkin")}
                                  className="!py-1 !text-xs bg-teal-600 hover:bg-teal-700">
                                  <LogIn className="w-3 h-3" /> Check-in Aktif
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="p-1 rounded border disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="p-1 rounded border disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500 mt-4 text-center">
        Tanda tangan dilakukan secara manual (cetak → TTD + materai). Setelah check-in, penghuni muncul di{" "}
        <Link href="/penghuni/aktif" className="text-teal-600 hover:underline">Penghuni Aktif</Link>.
      </p>

      {signModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg text-slate-900 mb-1">Konfirmasi TTD Manual</h3>
            <p className="text-sm text-slate-600 mb-4">
              {signModal.user.name} — Kamar {signModal.room.roomNumber}
            </p>
            <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1 mb-4">
              <li>Cetak surat perjanjian</li>
              <li>Penghuni tanda tangan + materai Rp10.000</li>
              <li>Serahkan dokumen fisik ke pengelola</li>
              <li>(Opsional) Unggah scan/foto kontrak yang sudah ditandatangani</li>
            </ol>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Upload scan kontrak (opsional)
            </label>
            <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-teal-400 mb-4">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 truncate">
                {signFile ? signFile.name : "PDF, JPG, atau PNG (maks. 10 MB)"}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                className="hidden"
                onChange={(e) => setSignFile(e.target.files?.[0] || null)}
              />
            </label>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={actionLoading === signModal.id}
                onClick={handleSignContract}
              >
                {actionLoading === signModal.id ? "Memproses..." : "Konfirmasi TTD Manual"}
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setSignModal(null); setSignFile(null); }}
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
