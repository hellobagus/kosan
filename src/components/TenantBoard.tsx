"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  User, Calendar, Plus, Search, X, FileText, MessageCircle, Printer,
  LogOut, RefreshCw, DollarSign, Pencil, Trash2, ChevronLeft, ChevronRight, Wallet,
} from "lucide-react";
import { PaymentModal } from "@/components/PaymentModal";
import { Button, Card, CardBody, EmptyState, Input, Select } from "@/components/ui";
import { cn, formatCurrency, formatDate, formatShortDate } from "@/lib/utils";
import {
  LEASE_OPTIONS, EXTRA_OCCUPANT_FEE, calcLatePenalty, calcTotalAmount,
  calcExtraOccupantFee, calcProrata, parseAdditionalFees, normalizeAdditionalFees, parseAmount,
  formatGender, formatMarital, paymentStatusLabel, toDateInput,
  type AdditionalFee,
} from "@/lib/tenant-utils";

export interface TenantData {
  id: number;
  checkIn: string;
  checkOut: string | null;
  dueDate: string | null;
  monthlyRent: string;
  deposit: string;
  status: string;
  leaseDuration: string | null;
  occupantCount: number;
  discount: string;
  additionalFees: unknown;
  totalAmount: string | null;
  paidAmount: string;
  paymentStatus: string;
  invoiceNumber: string | null;
  lastPaymentDate: string | null;
  extensionDate: string | null;
  isDaily: boolean;
  notes: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    gender: string | null;
    ktp: string | null;
    maritalStatus: string | null;
    occupation: string | null;
    address: string | null;
  };
  room: {
    id: number;
    roomNumber: string;
    price: string;
    dailyPrice: string | null;
  };
}

type TabType = "ACTIVE" | "RESERVED";
type ModalType = "detail" | "checkout" | "extend" | "biaya" | "edit" | "payment" | null;

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

export default function TenantBoard({ defaultTab = "ACTIVE" }: { defaultTab?: TabType }) {
  const [tab, setTab] = useState<TabType>(defaultTab);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TenantData | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Form states
  const [checkoutDate, setCheckoutDate] = useState("");
  const [extendForm, setExtendForm] = useState({
    leaseDuration: "", occupantCount: "1", discount: "0", additionalFees: [] as AdditionalFee[],
  });
  const [biayaForm, setBiayaForm] = useState({
    checkIn: "", dueDate: "", deposit: "0", leaseDuration: "1 Bulan",
    occupantCount: "1", discount: "0", additionalFees: [] as AdditionalFee[],
  });
  const [editForm, setEditForm] = useState({
    name: "", phone: "", gender: "", ktp: "", maritalStatus: "", occupation: "", address: "", notes: "",
  });

  const fetchTenants = useCallback(() => {
    setLoading(true);
    fetch(`/api/tenants?status=${tab}`)
      .then((r) => r.json())
      .then(setTenants)
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);
  useEffect(() => { setPage(1); }, [tab, search]);

  const filtered = useMemo(() => {
    if (!search) return tenants;
    const q = search.toLowerCase();
    return tenants.filter(
      (t) =>
        t.user.name.toLowerCase().includes(q) ||
        t.room.roomNumber.toLowerCase().includes(q) ||
        (t.user.phone || "").includes(q)
    );
  }, [tenants, search]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const occupiedRooms = useMemo(
    () => new Set(tenants.filter((t) => t.status === "ACTIVE").map((t) => t.room.id)).size,
    [tenants]
  );

  const openModal = (tenant: TenantData, type: ModalType) => {
    setSelected(tenant);
    setModal(type);
    setAgreed(false);
    if (type === "checkout") setCheckoutDate(toDateInput(new Date()));
    if (type === "extend") {
      setExtendForm({
        leaseDuration: "", occupantCount: String(tenant.occupantCount),
        discount: "0", additionalFees: parseAdditionalFees(tenant.additionalFees),
      });
    }
    if (type === "biaya") {
      setBiayaForm({
        checkIn: toDateInput(tenant.checkIn),
        dueDate: toDateInput(tenant.dueDate),
        deposit: tenant.deposit,
        leaseDuration: tenant.leaseDuration || "1 Bulan",
        occupantCount: String(tenant.occupantCount),
        discount: tenant.discount,
        additionalFees: parseAdditionalFees(tenant.additionalFees),
      });
    }
    if (type === "edit") {
      setEditForm({
        name: tenant.user.name,
        phone: tenant.user.phone || "",
        gender: tenant.user.gender || "",
        ktp: tenant.user.ktp || "",
        maritalStatus: tenant.user.maritalStatus || "",
        occupation: tenant.user.occupation || "",
        address: tenant.user.address || "",
        notes: tenant.notes || "",
      });
    }
  };

  const closeModal = () => { setModal(null); setSelected(null); setAgreed(false); };

  const handleCheckout = async () => {
    if (!selected || !agreed || !checkoutDate) return;
    setSaving(true);
    await fetch("/api/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, action: "checkout", checkOut: checkoutDate }),
    });
    setSaving(false);
    closeModal();
    fetchTenants();
  };

  const handleExtend = async () => {
    if (!selected || !agreed || !extendForm.leaseDuration) return;
    setSaving(true);
    const additionalFees = normalizeAdditionalFees(extendForm.additionalFees);
    await fetch("/api/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, action: "extend", ...extendForm, additionalFees }),
    });
    setSaving(false);
    closeModal();
    fetchTenants();
  };

  const handleBiaya = async () => {
    if (!selected || !agreed) return;
    setSaving(true);
    const additionalFees = normalizeAdditionalFees(biayaForm.additionalFees);
    const total = calcTotalAmount({
      monthlyRent: parseAmount(selected.monthlyRent),
      dailyPrice: selected.room.dailyPrice ? parseAmount(selected.room.dailyPrice) : null,
      isDaily: selected.isDaily,
      leaseDuration: biayaForm.leaseDuration,
      occupantCount: parseInt(biayaForm.occupantCount),
      discount: parseFloat(biayaForm.discount),
      deposit: parseFloat(biayaForm.deposit),
      additionalFees,
      checkIn: new Date(biayaForm.checkIn),
      dueDate: biayaForm.dueDate ? new Date(biayaForm.dueDate) : null,
    });
    await fetch("/api/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id, action: "update_biaya", ...biayaForm, additionalFees, totalAmount: total,
      }),
    });
    setSaving(false);
    closeModal();
    fetchTenants();
  };

  const handleEdit = async () => {
    if (!selected || !agreed) return;
    setSaving(true);
    await fetch("/api/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, action: "update_profile", ...editForm }),
    });
    setSaving(false);
    closeModal();
    fetchTenants();
  };

  const handleActivate = async (tenant: TenantData) => {
    if (!confirm(`Proses reservasi ${tenant.user.name} menjadi penghuni aktif?`)) return;
    await fetch("/api/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tenant.id, action: "activate" }),
    });
    fetchTenants();
  };

  const handleDelete = async (tenant: TenantData) => {
    if (!confirm(`Hapus data ${tenant.user.name}? Tindakan ini tidak dapat diurungkan.`)) return;
    await fetch(`/api/tenants?id=${tenant.id}`, { method: "DELETE" });
    fetchTenants();
  };

  const sendWhatsApp = (tenant: TenantData) => {
    const phone = (tenant.user.phone || "").replace(/\D/g, "");
    if (!phone) { alert("Nomor HP tidak tersedia"); return; }
    const due = tenant.dueDate ? formatDate(tenant.dueDate) : "-";
    const msg = encodeURIComponent(
      `Halo ${tenant.user.name},\n\nInfo sewa kamar ${tenant.room.roomNumber}:\n` +
      `Tanggal Masuk: ${formatDate(tenant.checkIn)}\nBerakhir: ${due}\n` +
      `Total: ${formatCurrency(tenant.totalAmount || tenant.monthlyRent)}\n` +
      `Status: ${paymentStatusLabel(tenant.paymentStatus)}\n\nTerima kasih.`
    );
    window.open(`https://wa.me/62${phone.startsWith("0") ? phone.slice(1) : phone}?text=${msg}`, "_blank");
  };

  const printInvoice = (tenant: TenantData) => {
    const inv = tenant.invoiceNumber || `#${tenant.id}`;
    const html = `<!DOCTYPE html><html><head><title>Invoice ${inv}</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto}
      h1{text-align:center;color:#0d9488}table{width:100%;border-collapse:collapse;margin:20px 0}
      td{padding:8px;border-bottom:1px solid #eee}.total{font-size:1.2em;font-weight:bold}
      .stamp{color:green;font-size:1.5em;text-align:center;margin:20px}</style></head><body>
      <h1>INVOICE PEMBAYARAN</h1><p style="text-align:center">${inv}</p>
      <table><tr><td>Nama</td><td>${tenant.user.name}</td></tr>
      <tr><td>Kamar</td><td>${tenant.room.roomNumber}</td></tr>
      <tr><td>Tanggal Masuk</td><td>${formatDate(tenant.checkIn)}</td></tr>
      <tr><td>Berakhir</td><td>${tenant.dueDate ? formatDate(tenant.dueDate) : "-"}</td></tr>
      <tr><td>Lama Sewa</td><td>${tenant.leaseDuration || "-"}</td></tr>
      <tr><td class="total">Total</td><td class="total">${formatCurrency(tenant.totalAmount || tenant.monthlyRent)}</td></tr>
      <tr><td>Terbayar</td><td>${formatCurrency(tenant.paidAmount)}</td></tr></table>
      ${tenant.paymentStatus === "PAID" ? `<div class="stamp">[ LUNAS ]</div>` : ""}
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
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
      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-0">
        {([
          { key: "ACTIVE" as TabType, label: "AKTIF", icon: User },
          { key: "RESERVED" as TabType, label: "RESERVASI", icon: Calendar },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors",
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <Link href="/penghuni/baru" className="self-center mr-4">
          <Button className="!py-2 !px-3 text-xs"><Plus className="w-4 h-4" /> Tambah</Button>
        </Link>
      </div>

      {/* Stats bar */}
      <div className="bg-blue-50 border border-blue-100 rounded-b-lg mb-4">
        {tab === "ACTIVE" ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100">
              <span className="text-sm font-medium text-slate-700">Kamar Terisi</span>
              <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{occupiedRooms}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-medium text-slate-700">Jumlah Penghuni</span>
              <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{filtered.length}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-medium text-slate-700">Jumlah Reservasi</span>
            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{filtered.length}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          Show
          <select
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          entries
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Search:</span>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm w-48"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <EmptyState message={tab === "ACTIVE" ? "Belum ada penghuni aktif" : "Belum ada reservasi"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-3 py-3 text-left w-28">Kamar</th>
                    <th className="px-3 py-3 text-left">Data Penghuni {tab === "ACTIVE" ? "Aktif" : "Reservasi"}</th>
                    <th className="px-3 py-3 text-left w-36">Tanggal</th>
                    <th className="px-3 py-3 text-left w-40">Harga</th>
                    <th className="px-3 py-3 text-left w-44">Keterangan</th>
                    <th className="px-3 py-3 text-left w-32">Opsi</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((t) => {
                    const penalty = calcLatePenalty(t.dueDate ? new Date(t.dueDate) : null);
                    const isOverdue = penalty.days > 0 && tab === "ACTIVE";
                    const total = parseAmount(t.totalAmount || t.monthlyRent);
                    const paid = parseAmount(t.paidAmount);
                    const remaining = total - paid;

                    return (
                      <tr key={t.id} className="border-t border-slate-100 align-top">
                        {/* Kamar + actions */}
                        <td className="px-3 py-3">
                          <p className="text-blue-600 font-bold text-base mb-2">{t.room.roomNumber}</p>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => openModal(t, "detail")}
                              className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                              <User className="w-3 h-3" /> Detail
                            </button>
                            <button onClick={() => sendWhatsApp(t)}
                              className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                              <MessageCircle className="w-3 h-3" /> Kirim
                            </button>
                            <button onClick={() => printInvoice(t)}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                              <FileText className="w-3 h-3" /> #INV
                            </button>
                            {tab === "ACTIVE" && (
                              <button onClick={() => printInvoice(t)}
                                className="flex items-center gap-1 px-2 py-1 bg-sky-400 text-white text-xs rounded hover:bg-sky-500">
                                <Printer className="w-3 h-3" /> Cetak
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Data penghuni */}
                        <td className="px-3 py-3">
                          {t.isDaily && (
                            <span className="inline-block bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded mb-1">
                              (SEWA HARIAN)
                            </span>
                          )}
                          <dl className="space-y-0.5 text-xs">
                            <div className="flex gap-2"><dt className="font-semibold w-16">Nama</dt><dd>{t.user.name}</dd></div>
                            <div className="flex gap-2"><dt className="font-semibold w-16">Kelamin</dt><dd>{formatGender(t.user.gender)}</dd></div>
                            <div className="flex gap-2"><dt className="font-semibold w-16">No.HP</dt><dd>{t.user.phone || "-"}</dd></div>
                            <div className="flex gap-2"><dt className="font-semibold w-16">Status</dt><dd>{formatMarital(t.user.maritalStatus)}</dd></div>
                            <div className="flex gap-2"><dt className="font-semibold w-16">Pekerjaan</dt><dd>{t.user.occupation || "-"}</dd></div>
                            <div className="flex gap-2"><dt className="font-semibold w-16">Penghuni</dt><dd>{t.occupantCount} Orang</dd></div>
                          </dl>
                        </td>

                        {/* Tanggal */}
                        <td className="px-3 py-3 text-xs">
                          <p><span className="font-semibold">Masuk</span><br />{formatShortDate(t.checkIn)}</p>
                          <p className="mt-2">
                            <span className="font-semibold">Berakhir</span><br />
                            <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                              {t.dueDate ? formatShortDate(t.dueDate) : "-"}
                            </span>
                          </p>
                        </td>

                        {/* Harga */}
                        <td className="px-3 py-3 text-xs">
                          <p><span className="font-semibold">Lama Sewa</span><br />{t.leaseDuration || "1 Bulan"}</p>
                          <p className="mt-1 font-semibold">Total<br />{formatCurrency(total)}</p>
                          {t.paymentStatus === "PAID" ? (
                            <span className="inline-block mt-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded">
                              [ Lunas ]
                            </span>
                          ) : (
                            <div className="mt-1 border border-slate-200 rounded p-1.5 text-xs">
                              <p>Terbayar {formatCurrency(paid)}</p>
                              <p className="text-red-600 font-semibold">Kurang {formatCurrency(remaining)}</p>
                            </div>
                          )}
                        </td>

                        {/* Keterangan */}
                        <td className="px-3 py-3 text-xs">
                          {isOverdue && (
                            <div className="bg-red-50 border border-red-100 rounded p-2">
                              <p className="font-bold text-red-700">Masa Sewa Telah Berakhir!</p>
                              <p>Lewat {penalty.days} hari</p>
                              <p className="font-semibold">Denda {formatCurrency(penalty.amount)}</p>
                            </div>
                          )}
                          {tab === "RESERVED" && !t.paymentStatus.includes("PAID") && remaining > 0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded p-2">
                              <p className="text-red-600 italic font-semibold">*Pembayaran Belum Lunas!*</p>
                            </div>
                          )}
                        </td>

                        {/* Opsi */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            {tab === "RESERVED" ? (
                              <button onClick={() => handleActivate(t)}
                                className="px-2 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700">
                                Proses
                              </button>
                            ) : (
                              <>
                                <button onClick={() => openModal(t, "checkout")}
                                  className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                                  <LogOut className="w-3 h-3" /> Selesai
                                </button>
                                <button onClick={() => openModal(t, "extend")}
                                  className="px-2 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700">
                                  Perpanjang
                                </button>
                              </>
                            )}
                            <button onClick={() => openModal(t, "payment")}
                              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded hover:bg-emerald-600">
                              <Wallet className="w-3 h-3" /> Bayar
                            </button>
                            <button onClick={() => openModal(t, "biaya")}
                              className="flex items-center justify-center gap-1 px-2 py-1 border border-slate-300 text-xs rounded hover:bg-slate-50">
                              <DollarSign className="w-3 h-3" /> Biaya
                            </button>
                            <button onClick={() => openModal(t, "edit")}
                              className="flex items-center justify-center gap-1 px-2 py-1 border border-slate-300 text-xs rounded hover:bg-slate-50">
                              <Pencil className="w-3 h-3" /> Penghuni
                            </button>
                            <button onClick={() => handleDelete(t)}
                              className="flex items-center justify-center px-2 py-1 border border-red-300 text-red-600 text-xs rounded hover:bg-red-50">
                              <Trash2 className="w-3 h-3" />
                            </button>
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

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <p>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-blue-600 text-white rounded text-xs">{page}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-slate-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {modal === "detail" && selected && (
        <DetailModal tenant={selected} onClose={closeModal} onInvoice={() => printInvoice(selected)} />
      )}

      {modal === "checkout" && selected && (
        <Modal title="PROSES PENGHUNI SELESAI" onClose={closeModal}>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center mb-4">
            <p className="font-bold text-lg">{selected.user.name}</p>
            <p className="text-sm text-slate-600">Kamar: {selected.room.roomNumber}</p>
          </div>
          {(() => {
            const penalty = calcLatePenalty(selected.dueDate ? new Date(selected.dueDate) : null);
            return penalty.amount > 0 ? (
              <div className="mb-4">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Denda Sewa</span>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(penalty.amount)}</p>
                    <p className="text-xs text-slate-400 italic">Nominal denda hanya pengingat, biaya Denda tidak masuk dalam pembukuan keuangan.</p>
                  </div>
                </div>
              </div>
            ) : null;
          })()}
          <Input label="Tanggal Keluar *" type="date" value={checkoutDate}
            onChange={(e) => setCheckoutDate(e.target.value)} />
          <p className="text-xs text-center text-slate-500 mt-4">
            Periksa kembali kondisi Kamar sebelum penghuni meninggalkan lokasi.<br />
            Pastikan NAMA Penghuni & KAMAR sudah benar, tindakan ini tidak dapat diurungkan.
          </p>
          <label className="flex items-center gap-2 mt-4 justify-center text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            Setuju<span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3 mt-6">
            <Button variant="danger" className="flex-1" disabled={!agreed || saving} onClick={handleCheckout}>
              <LogOut className="w-4 h-4" /> Proses Selesai
            </Button>
            <Button variant="secondary" className="flex-1" onClick={closeModal}>
              <X className="w-4 h-4" /> Batal
            </Button>
          </div>
        </Modal>
      )}

      {modal === "extend" && selected && (
        <ExtendModal
          tenant={selected}
          form={extendForm}
          setForm={setExtendForm}
          agreed={agreed}
          setAgreed={setAgreed}
          saving={saving}
          onSave={handleExtend}
          onClose={closeModal}
        />
      )}

      {modal === "biaya" && selected && (
        <BiayaModal
          tenant={selected}
          form={biayaForm}
          setForm={setBiayaForm}
          agreed={agreed}
          setAgreed={setAgreed}
          saving={saving}
          onSave={handleBiaya}
          onClose={closeModal}
        />
      )}

      {modal === "payment" && selected && (
        <PaymentModal
          tenant={selected}
          onClose={closeModal}
          onSuccess={fetchTenants}
        />
      )}

      {modal === "edit" && selected && (
        <Modal title={`Edit Penghuni - Kamar ${selected.room.roomNumber}`} onClose={closeModal} wide>
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
          </div>
          <div className="mt-4">
            <Input label="Alamat" value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            Pastikan Data Sudah Benar<span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3 mt-6 justify-end">
            <Button variant="secondary" onClick={closeModal}>Batal</Button>
            <Button disabled={!agreed || saving} onClick={handleEdit}>Simpan</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---- Sub-modals ---- */

function AdditionalFeesEditor({
  fees,
  onChange,
}: {
  fees: AdditionalFee[];
  onChange: (fees: AdditionalFee[]) => void;
}) {
  const addFee = () => onChange([...fees, { name: "", amount: 0 }]);

  const updateFee = (index: number, field: "name" | "amount", value: string) => {
    const next = fees.map((f, i) =>
      i === index
        ? field === "name"
          ? { ...f, name: value }
          : { ...f, amount: parseFloat(value) || 0 }
        : f
    );
    onChange(next);
  };

  const removeFee = (index: number) => onChange(fees.filter((_, i) => i !== index));

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_40px] gap-3 items-center text-sm font-semibold text-slate-700 mb-3">
        <span>Biaya Lainnya</span>
        <div className="flex items-center gap-2">
          <span>Biaya Tambahan</span>
          <button
            type="button"
            onClick={addFee}
            className="w-7 h-7 flex items-center justify-center border-2 border-blue-500 text-blue-600 rounded text-lg leading-none hover:bg-blue-50"
            title="Tambah biaya"
          >
            +
          </button>
        </div>
        <span className="text-center">Opsi</span>
      </div>

      {fees.length === 0 && (
        <p className="text-xs text-slate-400 italic mb-2">
          Klik + untuk menambah biaya tambahan (listrik, air, dll.)
        </p>
      )}

      {fees.map((fee, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_40px] gap-3 items-start mb-3 pb-3 border-b border-slate-100 last:border-0"
        >
          <div />
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nama Biaya Tambahan"
              value={fee.name}
              onChange={(e) => updateFee(index, "name", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="number"
              min="0"
              placeholder="Nominal Harga"
              value={fee.amount || ""}
              onChange={(e) => updateFee(index, "amount", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="button"
            onClick={() => removeFee(index)}
            className="w-9 h-9 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600"
            title="Hapus"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function DetailModal({ tenant, onClose, onInvoice }: {
  tenant: TenantData; onClose: () => void; onInvoice: () => void;
}) {
  const penalty = calcLatePenalty(tenant.dueDate ? new Date(tenant.dueDate) : null);
  const total = parseAmount(tenant.totalAmount || tenant.monthlyRent);

  return (
    <Modal title={`Penghuni Kamar ${tenant.room.roomNumber}`} onClose={onClose} wide>
      {penalty.days > 0 && (
        <div className="bg-red-50 text-red-700 text-sm font-semibold text-center py-2 rounded mb-4">
          Masa Sewa Berakhir, Terlewat {penalty.days} hari
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-slate-500">Penghuni</span>
        <span className="text-emerald-600 font-bold text-sm">
          {tenant.status === "ACTIVE" ? "AKTIF" : tenant.status === "RESERVED" ? "RESERVASI" : "SELESAI"}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-sm mb-2 border-b pb-1">Data Penghuni</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex"><dt className="w-24 font-medium">Nama</dt><dd>{tenant.user.name}</dd></div>
            <div className="flex"><dt className="w-24 font-medium">Kelamin</dt><dd>{formatGender(tenant.user.gender)}</dd></div>
            <div className="flex"><dt className="w-24 font-medium">No HP</dt><dd>{tenant.user.phone || "-"}</dd></div>
            <div className="flex"><dt className="w-24 font-medium">No. KTP</dt><dd>{tenant.user.ktp || "-"}</dd></div>
            <div className="flex"><dt className="w-24 font-medium">Status</dt><dd>{formatMarital(tenant.user.maritalStatus)}</dd></div>
            <div className="flex"><dt className="w-24 font-medium">Pekerjaan</dt><dd>{tenant.user.occupation || "-"}</dd></div>
          </dl>
          <div className="mt-3 bg-amber-50 text-amber-800 text-sm px-3 py-2 rounded">
            Deposit {formatCurrency(tenant.deposit)}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-sm mb-2 border-b pb-1">Tanggal</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex"><dt className="w-32 font-medium">Masuk</dt><dd>{formatDate(tenant.checkIn)}</dd></div>
            <div className="flex"><dt className="w-32 font-medium">Perpanjang</dt>
              <dd>{tenant.extensionDate ? formatDate(tenant.extensionDate) : "Belum Perpanjang"}</dd></div>
            <div className="flex"><dt className="w-32 font-medium">Lama Sewa</dt><dd>{tenant.leaseDuration || "-"}</dd></div>
            <div className="flex"><dt className="w-32 font-medium">Berakhir</dt>
              <dd className={penalty.days > 0 ? "text-red-600 font-semibold" : ""}>
                {tenant.dueDate ? formatDate(tenant.dueDate) : "-"}</dd></div>
            <div className="flex"><dt className="w-32 font-medium">Pembayaran Terakhir</dt>
              <dd>{tenant.lastPaymentDate ? formatDate(tenant.lastPaymentDate) : "-"}</dd></div>
          </dl>
          <h3 className="font-semibold text-sm mt-4 mb-2 border-b pb-1">Harga & Pembayaran</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex"><dt className="w-32 font-medium">Harga Kamar</dt><dd>{formatCurrency(tenant.monthlyRent)}</dd></div>
            <div className="flex"><dt className="w-32 font-medium">Total</dt><dd className="font-bold">{formatCurrency(total)}</dd></div>
            <div className="flex"><dt className="w-32 font-medium">Pembayaran</dt><dd>{formatCurrency(tenant.paidAmount)}</dd></div>
          </dl>
          {tenant.paymentStatus === "PAID" && (
            <div className="mt-3 text-center">
              <span className="inline-block bg-emerald-100 text-emerald-700 font-bold text-lg px-4 py-2 rounded rotate-[-3deg] border-2 border-emerald-300">
                [ LUNAS ] {tenant.lastPaymentDate ? formatDate(tenant.lastPaymentDate) : ""}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <Button onClick={onInvoice} className="flex-1">
          <FileText className="w-4 h-4" /> Invoice {tenant.invoiceNumber || ""}
        </Button>
        <Button variant="secondary" onClick={onClose} className="flex-1">Keluar</Button>
      </div>
    </Modal>
  );
}

function ExtendModal({ tenant, form, setForm, agreed, setAgreed, saving, onSave, onClose }: {
  tenant: TenantData;
  form: { leaseDuration: string; occupantCount: string; discount: string; additionalFees: AdditionalFee[] };
  setForm: (f: typeof form) => void;
  agreed: boolean; setAgreed: (v: boolean) => void;
  saving: boolean; onSave: () => void; onClose: () => void;
}) {
  const penalty = calcLatePenalty(tenant.dueDate ? new Date(tenant.dueDate) : null);
  const rent = parseAmount(tenant.monthlyRent);
  const extraOcc = calcExtraOccupantFee(parseInt(form.occupantCount));
  const validFees = normalizeAdditionalFees(form.additionalFees);
  const otherFees = validFees.reduce((s, f) => s + f.amount, 0);
  const opt = LEASE_OPTIONS.find((o) => o.value === form.leaseDuration);
  const roomTotal = opt ? (opt.months > 0 ? rent * opt.months : parseAmount(tenant.room.dailyPrice || rent)) : 0;
  const grandTotal = Math.max(0, roomTotal + extraOcc + otherFees - parseFloat(form.discount || "0"));

  return (
    <Modal title="PERPANJANG SEWA" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div><span className="font-medium">Kamar</span><p className="font-bold">{tenant.room.roomNumber}</p></div>
        <div><span className="font-medium">Nama</span><p className="font-bold">{tenant.user.name}</p></div>
      </div>
      {penalty.days > 0 && (
        <>
          <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm mb-2">
            Masa sewa telah lewat {penalty.days} hari (dari {tenant.dueDate ? formatShortDate(tenant.dueDate) : "-"})
          </div>
          <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm mb-4">
            <p className="font-bold">DENDA KETERLAMBATAN: {formatCurrency(penalty.amount)}</p>
            <p className="text-xs italic">Biaya Keterlambatan Tidak Masuk Dalam Buku Keuangan</p>
          </div>
        </>
      )}
      <p className="text-sm mb-4">
        Perpanjangan dihitung berdasarkan harga bulanan kamar {tenant.room.roomNumber} saat ini: <strong>{formatCurrency(rent)}</strong>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Lama Sewa* (Perpanjang)" value={form.leaseDuration}
          onChange={(e) => setForm({ ...form, leaseDuration: e.target.value })}>
          <option value="">Pilih Lama Sewa</option>
          {LEASE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select label="Jumlah Penghuni*" value={form.occupantCount}
          onChange={(e) => setForm({ ...form, occupantCount: e.target.value })}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} Orang</option>)}
        </Select>
        <Input label="Diskon Harga*" type="number" value={form.discount}
          onChange={(e) => setForm({ ...form, discount: e.target.value })} />
      </div>
      <AdditionalFeesEditor
        fees={form.additionalFees}
        onChange={(additionalFees) => setForm({ ...form, additionalFees })}
      />
      <p className="text-xs text-slate-500 mt-2">
        Penghuni lebih dari 1 Orang dikenakan biaya tambahan {formatCurrency(EXTRA_OCCUPANT_FEE)} mulai Orang ke 2.
      </p>
      <div className="bg-emerald-50 rounded-lg mt-4 p-4">
        <h4 className="font-semibold text-sm text-emerald-800 mb-2">Perhitungan Harga</h4>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt>Harga Kamar</dt><dd>{formatCurrency(roomTotal)}</dd></div>
          <div className="flex justify-between"><dt>Tambah Penghuni</dt><dd>{formatCurrency(extraOcc)}</dd></div>
          {validFees.map((f) => (
            <div key={f.name} className="flex justify-between text-slate-600">
              <dt>{f.name}</dt><dd>{formatCurrency(f.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between"><dt>Biaya Lainnya</dt><dd>{formatCurrency(otherFees)}</dd></div>
          <div className="flex justify-between"><dt>Diskon</dt><dd>{formatCurrency(form.discount)}</dd></div>
          <div className="flex justify-between font-bold border-t pt-1"><dt>Grand Total</dt><dd>{formatCurrency(grandTotal)}</dd></div>
        </dl>
      </div>
      <p className="text-xs text-center text-slate-500 mt-4">
        Setelah Memproses Perpanjang Sewa, Lanjutkan Proses Pembayaran
      </p>
      <p className="text-xs text-center text-red-500 mt-1">Lama Sewa tidak dapat dirubah setelah diproses</p>
      <label className="flex items-center gap-2 mt-4 justify-center text-sm">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        Setuju<span className="text-red-500">*</span>
      </label>
      <div className="flex gap-3 mt-4 justify-end">
        <Button variant="secondary" onClick={onClose}><X className="w-4 h-4" /> Batal</Button>
        <Button disabled={!agreed || !form.leaseDuration || saving} onClick={onSave}>
          <RefreshCw className="w-4 h-4" /> Proses
        </Button>
      </div>
    </Modal>
  );
}

function BiayaModal({ tenant, form, setForm, agreed, setAgreed, saving, onSave, onClose }: {
  tenant: TenantData;
  form: { checkIn: string; dueDate: string; deposit: string; leaseDuration: string; occupantCount: string; discount: string; additionalFees: AdditionalFee[] };
  setForm: (f: typeof form) => void;
  agreed: boolean; setAgreed: (v: boolean) => void;
  saving: boolean; onSave: () => void; onClose: () => void;
}) {
  const rent = parseAmount(tenant.monthlyRent);
  const extraOcc = calcExtraOccupantFee(parseInt(form.occupantCount));
  const validFees = normalizeAdditionalFees(form.additionalFees);
  const otherFees = validFees.reduce((s, f) => s + f.amount, 0);
  const deposit = parseFloat(form.deposit || "0");
  const discount = parseFloat(form.discount || "0");
  const prorataDays = form.checkIn && form.dueDate
    ? Math.max(1, Math.ceil((new Date(form.dueDate).getTime() - new Date(form.checkIn).getTime()) / 86400000) + 1)
    : 30;
  const prorataAmount = calcProrata(rent, prorataDays);
  const total = calcTotalAmount({
    monthlyRent: rent,
    dailyPrice: tenant.room.dailyPrice ? parseAmount(tenant.room.dailyPrice) : null,
    isDaily: tenant.isDaily,
    leaseDuration: form.leaseDuration,
    occupantCount: parseInt(form.occupantCount),
    discount,
    deposit,
    additionalFees: validFees,
    checkIn: form.checkIn ? new Date(form.checkIn) : undefined,
    dueDate: form.dueDate ? new Date(form.dueDate) : null,
  });

  return (
    <Modal title={`Biaya Penghuni (${tenant.room.roomNumber})`} onClose={onClose} wide>
      <p className="text-xs text-red-600 mb-3">
        Bila Penghuni sudah proses perpanjang sewa, Tanggal Masuk & Biaya Deposit tidak dapat dirubah.
      </p>
      <p className="text-sm font-semibold mb-4">{tenant.user.name} {tenant.invoiceNumber}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Biaya Deposit" type="number" value={form.deposit}
          onChange={(e) => setForm({ ...form, deposit: e.target.value })} />
        <Input label="Tanggal Masuk" type="date" value={form.checkIn}
          onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
        <Input label="Tanggal Tempo Sewa" type="date" value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        <Select label="Jumlah Penghuni" value={form.occupantCount}
          onChange={(e) => setForm({ ...form, occupantCount: e.target.value })}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} Orang</option>)}
        </Select>
        <Select label="Lama Sewa" value={form.leaseDuration}
          onChange={(e) => setForm({ ...form, leaseDuration: e.target.value })}>
          {LEASE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Input label="Diskon" type="number" value={form.discount}
          onChange={(e) => setForm({ ...form, discount: e.target.value })} />
      </div>
      <AdditionalFeesEditor
        fees={form.additionalFees}
        onChange={(additionalFees) => setForm({ ...form, additionalFees })}
      />
      <p className="text-xs text-slate-500 mt-2">
        Penghuni lebih dari 1 Orang dikenakan biaya tambahan {formatCurrency(EXTRA_OCCUPANT_FEE)} mulai Orang ke 2.
      </p>
      <div className="bg-slate-800 text-white rounded-lg mt-4 p-4 text-sm">
        <h4 className="font-semibold mb-2">Hitung Prorata</h4>
        <p>{formatCurrency(rent)} ÷ 30 = {formatCurrency(rent / 30)} × {prorataDays} Hari</p>
        <p className="mt-1">Hasil Harga: <strong>{formatCurrency(prorataAmount)}</strong></p>
      </div>
      <div className="bg-emerald-50 rounded-lg mt-4 p-4">
        <h4 className="font-semibold text-sm text-emerald-800 mb-2">Perhitungan Harga</h4>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt>Harga Kamar</dt><dd>{formatCurrency(prorataAmount)}</dd></div>
          <div className="flex justify-between"><dt>Tambah Penghuni</dt><dd>{formatCurrency(extraOcc)}</dd></div>
          {validFees.map((f) => (
            <div key={f.name} className="flex justify-between text-slate-600">
              <dt>{f.name}</dt><dd>{formatCurrency(f.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between"><dt>Biaya Lainnya</dt><dd>{formatCurrency(otherFees)}</dd></div>
          <div className="flex justify-between"><dt>Deposit</dt><dd>{formatCurrency(deposit)}</dd></div>
          <div className="flex justify-between"><dt>Diskon</dt><dd>{formatCurrency(discount)}</dd></div>
          <div className="flex justify-between font-bold border-t pt-1"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div>
        </dl>
      </div>
      <label className="flex items-center gap-2 mt-4 text-sm">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        Pastikan Data Sudah Benar<span className="text-red-500">*</span>
      </label>
      <div className="flex gap-3 mt-4 justify-end">
        <Button variant="secondary" onClick={onClose}>Keluar</Button>
        <Button disabled={!agreed || saving} onClick={onSave}>Simpan</Button>
      </div>
    </Modal>
  );
}
