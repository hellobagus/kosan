"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, Input, PageHeader, Select, Badge } from "@/components/ui";
import { formatDate, formatShortDate } from "@/lib/utils";
import { REPAIR_CATEGORY_LABELS, REPAIR_STATUS_LABELS } from "@/lib/repair-request-constants";
import { Camera, X } from "lucide-react";

type RepairRequest = {
  id: number;
  category: keyof typeof REPAIR_CATEGORY_LABELS;
  title: string;
  description?: string | null;
  status: keyof typeof REPAIR_STATUS_LABELS;
  priority: string;
  photoUrls?: string[] | null;
  inspectionNotes?: string | null;
  inspectionAt?: string | null;
  resolutionNotes?: string | null;
  completedAt?: string | null;
  reportedAt: string;
  room: { roomNumber: string; floor: number };
};

type CategoryOption = { value: string; label: string };

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  REQUESTED: "warning",
  INSPECTING: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "default",
};

const FLOW = ["REQUESTED", "INSPECTING", "IN_PROGRESS", "COMPLETED"] as const;
const MAX_PHOTOS = 3;

export default function TenantRepairPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [room, setRoom] = useState<{ roomNumber: string; floor: number } | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    category: "",
    title: "",
    description: "",
    priority: "NORMAL",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/portal/repairs")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRequests(data.requests || []);
        setCategories(data.categories || []);
        setRoom(data.room || null);
      })
      .catch(() => {
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasOpenRequest = requests.some((r) =>
    ["REQUESTED", "INSPECTING", "IN_PROGRESS"].includes(r.status)
  );

  const uploadPhoto = async (file: File) => {
    if (photoUrls.length >= MAX_PHOTOS) {
      alert(`Maksimal ${MAX_PHOTOS} foto`);
      return;
    }
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/portal/repairs/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal upload");
      setPhotoUrls((prev) => [...prev, data.url]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal upload foto");
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!form.category || !form.title.trim()) {
      alert("Kategori dan judul permintaan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/portal/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photoUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan");
      setForm({ category: "", title: "", description: "", priority: "NORMAL" });
      setPhotoUrls([]);
      load();
      alert("Permintaan perbaikan berhasil dikirim. Pengurus akan melakukan inspeksi ke unit Anda.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mengajukan");
    } finally {
      setSaving(false);
    }
  };

  const cancelRequest = async (id: number) => {
    if (!confirm("Batalkan permintaan perbaikan ini?")) return;
    const res = await fetch("/api/portal/repairs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "cancel" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal membatalkan");
      return;
    }
    load();
  };

  const flowIndex = (status: string) => FLOW.indexOf(status as (typeof FLOW)[number]);

  return (
    <div>
      <PageHeader
        title="Permintaan Perbaikan Unit"
        description="Laporkan kerusakan di kamar Anda (kran bocor, AC tidak dingin, dll). Pengurus akan inspeksi lalu melakukan perbaikan."
      />

      <Card className="mb-4 border-teal-100 bg-teal-50/50">
        <CardBody className="text-sm text-slate-700">
          <p className="font-semibold text-slate-900 mb-2">Alur permintaan perbaikan</p>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Penghuni</strong> mengajukan laporan kerusakan</li>
            <li><strong>Pengurus</strong> melakukan inspeksi ke unit/kamar</li>
            <li><strong>Tim maintenance</strong> melakukan perbaikan</li>
            <li><strong>Selesai</strong> — penghuni mendapat konfirmasi via WhatsApp/email</li>
          </ol>
          <p className="text-xs text-slate-500 mt-2">
            Lampirkan foto kerusakan agar pengurus lebih mudah menilai sebelum inspeksi ke unit.
          </p>
        </CardBody>
      </Card>

      {room && (
        <Card className="mb-4">
          <CardBody className="text-sm">
            <p className="text-slate-500">Unit yang dilaporkan</p>
            <p className="font-semibold">Kamar {room.roomNumber} (Lt.{room.floor})</p>
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardBody className="space-y-3">
          <h3 className="font-semibold text-slate-900">Form Laporan Kerusakan</h3>
          <Select
            label="Kategori"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Pilih kategori</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
          <Input
            label="Judul / Ringkasan Masalah"
            placeholder="Contoh: Kran air wastafel bocor"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Detail Kerusakan"
            placeholder="Jelaskan lokasi dan kondisi kerusakan..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label="Prioritas"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Mendesak</option>
          </Select>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Foto Kerusakan (opsional, max {MAX_PHOTOS})</p>
            <div className="flex flex-wrap gap-3 mb-2">
              {photoUrls.map((url) => (
                <div key={url} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Foto kerusakan" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrls((prev) => prev.filter((u) => u !== url))}
                    className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photoUrls.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:border-teal-400 hover:text-teal-600"
                >
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-xs">{uploadingPhoto ? "..." : "Tambah"}</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto(file);
              }}
            />
            <p className="text-xs text-slate-500">JPG, PNG, WEBP — maks. 5 MB per foto</p>
          </div>

          {hasOpenRequest && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              Anda masih memiliki permintaan yang belum selesai. Selesaikan atau batalkan terlebih dahulu sebelum mengajukan baru.
            </p>
          )}
          <Button onClick={submit} disabled={saving || hasOpenRequest}>
            {saving ? "Mengirim..." : "Kirim Permintaan Perbaikan"}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-slate-900 mb-3">Riwayat Permintaan</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada permintaan perbaikan.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const step = flowIndex(req.status);
                return (
                  <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-slate-900">{req.title}</p>
                        <p className="text-xs text-slate-500">
                          {REPAIR_CATEGORY_LABELS[req.category]} · {formatShortDate(req.reportedAt)}
                          {req.priority === "URGENT" && (
                            <span className="ml-2 text-red-600 font-medium">Mendesak</span>
                          )}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANT[req.status] || "default"}>
                        {REPAIR_STATUS_LABELS[req.status]}
                      </Badge>
                    </div>

                    {req.description && (
                      <p className="text-sm text-slate-600 mb-3">{req.description}</p>
                    )}

                    {Array.isArray(req.photoUrls) && req.photoUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {req.photoUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Lampiran" className="w-20 h-20 object-cover rounded-lg border" />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      {FLOW.map((s, i) => (
                        <span
                          key={s}
                          className={`text-xs px-2 py-1 rounded-full ${
                            req.status === "CANCELLED"
                              ? "bg-slate-200 text-slate-500"
                              : step >= i
                                ? "bg-teal-100 text-teal-800"
                                : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {REPAIR_STATUS_LABELS[s]}
                        </span>
                      ))}
                    </div>

                    {req.inspectionNotes && (
                      <p className="text-sm text-blue-800 bg-blue-50 rounded-lg p-2 mb-2">
                        <strong>Catatan Inspeksi:</strong> {req.inspectionNotes}
                        {req.inspectionAt && ` (${formatDate(req.inspectionAt)})`}
                      </p>
                    )}
                    {req.resolutionNotes && req.status === "COMPLETED" && (
                      <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg p-2">
                        <strong>Penyelesaian:</strong> {req.resolutionNotes}
                      </p>
                    )}

                    {req.status === "REQUESTED" && (
                      <Button variant="secondary" className="mt-2" onClick={() => cancelRequest(req.id)}>
                        Batalkan Permintaan
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
