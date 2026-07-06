"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, CheckCircle, XCircle, Mail, FileText, PenLine,
  Package, LogIn, Printer, RefreshCw, ChevronLeft, ChevronRight, Upload, ExternalLink,
  Eye, Pencil, X,
} from "lucide-react";
import { Button, Card, CardBody, EmptyState, Badge, Input, Select } from "@/components/ui";
import { cn, formatCurrency, formatDate, formatShortDate } from "@/lib/utils";
import {
  parseAmount, formatGender, formatMarital, paymentStatusLabel,
  parseAdditionalOccupants, toDateInput, LEASE_OPTIONS,
} from "@/lib/tenant-utils";
import { fetchAndPrintContract, fetchAndPrintInventoryBa } from "@/lib/contract-print";
import type { TenantData } from "@/components/TenantBoard";

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

type WorkflowTenant = TenantData & {
  contractSentAt?: string | null;
  contractSignedAt?: string | null;
  contractSignedUrl?: string | null;
  inventoryBaAt?: string | null;
  approvedAt?: string | null;
  emergencyPhone?: string | null;
  additionalOccupants?: unknown;
};

type ModalType = "detail" | "edit" | null;

const WORKFLOW_STATUSES = ["PENDING", "APPROVED", "CONTRACT_SENT", "CONTRACT_SIGNED"];

function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className={cn(
          "bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto w-full",
          wide ? "max-w-2xl" : "max-w-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

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
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<WorkflowTenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", phone: "", gender: "", ktp: "", maritalStatus: "", occupation: "",
    ktpAddress: "", correspondenceAddress: "", workplace: "", workplaceAddress: "",
    emergencyPhone: "", checkIn: "", monthlyRent: "", deposit: "", leaseDuration: "",
    notes: "",
  });

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

  const openModal = (tenant: WorkflowTenant, type: ModalType) => {
    setSelected(tenant);
    setModal(type);
    if (type === "edit") {
      setEditForm({
        name: tenant.user.name,
        phone: tenant.user.phone || "",
        gender: tenant.user.gender || "",
        ktp: tenant.user.ktp || "",
        maritalStatus: tenant.user.maritalStatus || "",
        occupation: tenant.user.occupation || "",
        ktpAddress: tenant.user.ktpAddress || "",
        correspondenceAddress: tenant.user.correspondenceAddress || "",
        workplace: tenant.user.workplace || "",
        workplaceAddress: tenant.user.workplaceAddress || "",
        emergencyPhone: tenant.emergencyPhone || "",
        checkIn: toDateInput(tenant.checkIn),
        monthlyRent: String(parseAmount(tenant.monthlyRent)),
        deposit: String(parseAmount(tenant.deposit)),
        leaseDuration: tenant.leaseDuration || "1 Bulan",
        notes: tenant.notes || "",
      });
    }
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage("");
    try {
      const profileRes = await fetch("/api/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action: "update_profile",
          name: editForm.name,
          phone: editForm.phone,
          gender: editForm.gender,
          ktp: editForm.ktp,
          maritalStatus: editForm.maritalStatus,
          occupation: editForm.occupation,
          ktpAddress: editForm.ktpAddress,
          correspondenceAddress: editForm.correspondenceAddress,
          workplace: editForm.workplace,
          workplaceAddress: editForm.workplaceAddress,
          notes: editForm.notes,
        }),
      });
      if (!profileRes.ok) {
        const data = await profileRes.json();
        setMessage(data.error || "Gagal menyimpan profil");
        return;
      }

      const biayaRes = await fetch("/api/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action: "update_biaya",
          checkIn: editForm.checkIn,
          monthlyRent: parseFloat(editForm.monthlyRent),
          deposit: parseFloat(editForm.deposit || "0"),
          leaseDuration: editForm.leaseDuration,
          emergencyPhone: editForm.emergencyPhone,
        }),
      });
      const biayaData = await biayaRes.json();
      if (!biayaRes.ok) {
        setMessage(biayaData.error || "Profil tersimpan, gagal menyimpan data sewa");
        return;
      }

      setMessage("Data calon penghuni berhasil diperbarui");
      closeModal();
      load();
    } catch {
      setMessage("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
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
                    <th className="px-4 py-3 text-left w-64">Aksi Workflow</th>
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
                            <div className="flex gap-1 mb-1">
                              <Button variant="secondary" disabled={busy}
                                onClick={() => openModal(t, "detail")} className="!py-1 !px-2 !text-xs flex-1">
                                <Eye className="w-3 h-3" /> Detail
                              </Button>
                              <Button variant="ghost" disabled={busy}
                                onClick={() => openModal(t, "edit")} className="!py-1 !px-2 !text-xs flex-1">
                                <Pencil className="w-3 h-3" /> Edit
                              </Button>
                            </div>
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

      {modal === "detail" && selected && (
        <Modal title={`Detail Calon Penghuni — Kamar ${selected.room.roomNumber}`} onClose={closeModal} wide>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-slate-500">Status Workflow</span>
            <Badge variant={STATUS_VARIANT[selected.status] || "default"}>
              {STATUS_LABELS[selected.status] || selected.status}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2 border-b pb-1">Data Penghuni</h3>
              <dl className="space-y-1">
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Nama</dt><dd className="font-medium">{selected.user.name}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Email</dt><dd>{selected.user.email}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">No. HP</dt><dd>{selected.user.phone || "-"}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Kelamin</dt><dd>{formatGender(selected.user.gender)}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">No. KTP</dt><dd>{selected.user.ktp || "-"}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Status</dt><dd>{formatMarital(selected.user.maritalStatus)}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Pekerjaan</dt><dd>{selected.user.occupation || "-"}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Alamat KTP</dt><dd>{selected.user.ktpAddress || "-"}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Korespondensi</dt><dd>{selected.user.correspondenceAddress || "-"}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Tempat Kerja</dt><dd>{selected.user.workplace || "-"}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Kontak Darurat</dt><dd>{selected.emergencyPhone || "-"}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="font-semibold mb-2 border-b pb-1">Data Sewa</h3>
              <dl className="space-y-1">
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Kamar</dt><dd className="font-medium">{selected.room.roomNumber}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Masuk</dt><dd>{formatDate(selected.checkIn)}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Lama Sewa</dt><dd>{selected.leaseDuration || "-"}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Harga/Bulan</dt><dd>{formatCurrency(selected.monthlyRent)}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Deposit</dt><dd>{formatCurrency(selected.deposit)}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Total</dt><dd>{formatCurrency(selected.totalAmount || selected.monthlyRent)}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Pembayaran</dt><dd>{paymentStatusLabel(selected.paymentStatus)}</dd></div>
                <div className="flex gap-2"><dt className="w-28 text-slate-500">Penghuni</dt><dd>{selected.occupantCount} orang</dd></div>
              </dl>
              {(selected.contractSentAt || selected.contractSignedAt) && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2 border-b pb-1">Kontrak</h3>
                  <dl className="space-y-1">
                    {selected.contractSentAt && (
                      <div className="flex gap-2"><dt className="w-28 text-slate-500">Dikirim</dt><dd>{formatShortDate(selected.contractSentAt)}</dd></div>
                    )}
                    {selected.contractSignedAt && (
                      <div className="flex gap-2"><dt className="w-28 text-slate-500">TTD</dt><dd>{formatShortDate(selected.contractSignedAt)}</dd></div>
                    )}
                    {selected.contractSignedUrl && (
                      <div className="flex gap-2"><dt className="w-28 text-slate-500">Scan</dt>
                        <dd><a href={selected.contractSignedUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">Lihat dokumen</a></dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
          {parseAdditionalOccupants(selected.additionalOccupants).length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2 border-b pb-1 text-sm">Penghuni Tambahan</h3>
              <ul className="text-sm space-y-1">
                {parseAdditionalOccupants(selected.additionalOccupants).map((o, i) => (
                  <li key={i}>{o.name} — KTP: {o.ktp || "-"}</li>
                ))}
              </ul>
            </div>
          )}
          {selected.notes && (
            <div className="mt-4 text-sm">
              <h3 className="font-semibold mb-1">Catatan</h3>
              <p className="text-slate-600 whitespace-pre-wrap">{selected.notes}</p>
            </div>
          )}
          <div className="flex gap-2 mt-6 justify-end">
            <Button variant="secondary" onClick={() => { closeModal(); openModal(selected, "edit"); }}>
              <Pencil className="w-4 h-4" /> Edit Data
            </Button>
            <Button variant="ghost" onClick={closeModal}>Tutup</Button>
          </div>
        </Modal>
      )}

      {modal === "edit" && selected && (
        <Modal title={`Edit Calon Penghuni — Kamar ${selected.room.roomNumber}`} onClose={closeModal} wide>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 mb-4">
            Kamar tidak dapat diubah dari halaman ini. Ubah data sebelum menyetujui atau kirim kontrak.
          </p>
          <h3 className="font-semibold text-sm mb-3">Data Penghuni</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nama *" value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <Input label="No. HP" value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Select label="Kelamin" value={editForm.gender}
              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
              <option value="">Pilih</option>
              <option value="FEMALE">Wanita</option>
              <option value="MALE">Pria</option>
            </Select>
            <Input label="No. KTP" value={editForm.ktp}
              onChange={(e) => setEditForm({ ...editForm, ktp: e.target.value })} />
            <Select label="Status" value={editForm.maritalStatus}
              onChange={(e) => setEditForm({ ...editForm, maritalStatus: e.target.value })}>
              <option value="">Pilih</option>
              <option value="SINGLE">Belum Menikah</option>
              <option value="MARRIED">Menikah</option>
            </Select>
            <Input label="Pekerjaan" value={editForm.occupation}
              onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} />
            <Input label="Kontak Darurat" value={editForm.emergencyPhone}
              onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })} />
          </div>
          <div className="mt-4 space-y-4">
            <Input label="Alamat KTP" value={editForm.ktpAddress}
              onChange={(e) => setEditForm({ ...editForm, ktpAddress: e.target.value })} />
            <Input label="Alamat Korespondensi" value={editForm.correspondenceAddress}
              onChange={(e) => setEditForm({ ...editForm, correspondenceAddress: e.target.value })} />
            <Input label="Tempat Kerja" value={editForm.workplace}
              onChange={(e) => setEditForm({ ...editForm, workplace: e.target.value })} />
            <Input label="Alamat Tempat Kerja" value={editForm.workplaceAddress}
              onChange={(e) => setEditForm({ ...editForm, workplaceAddress: e.target.value })} />
          </div>
          <h3 className="font-semibold text-sm mt-6 mb-3">Data Sewa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Tanggal Masuk" type="date" value={editForm.checkIn}
              onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })} />
            <Select label="Lama Sewa" value={editForm.leaseDuration}
              onChange={(e) => setEditForm({ ...editForm, leaseDuration: e.target.value })}>
              {LEASE_OPTIONS.filter((o) => o.value !== "1 Hari").map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Input label="Harga Sewa / Bulan" type="number" value={editForm.monthlyRent}
              onChange={(e) => setEditForm({ ...editForm, monthlyRent: e.target.value })} />
            <Input label="Deposit" type="number" value={editForm.deposit}
              onChange={(e) => setEditForm({ ...editForm, deposit: e.target.value })} />
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <Button variant="secondary" onClick={closeModal}>Batal</Button>
            <Button disabled={saving || !editForm.name} onClick={handleSaveEdit}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </Modal>
      )}

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
