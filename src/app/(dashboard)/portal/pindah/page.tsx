"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardBody, Input, PageHeader, Select } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

type Transfer = {
  id: number;
  status: string;
  effectiveDate: string;
  reason?: string | null;
  fromRoom: { roomNumber: string };
  toRoom: { roomNumber: string };
};

type AvailableRoom = {
  id: number;
  roomNumber: string;
  floor: number;
  price: string | number;
  buildingName?: string | null;
  buildingCode?: string | null;
  projectName?: string | null;
  projectCode?: string | null;
  entityName?: string | null;
};

type OrgInfo = {
  entityName?: string | null;
  entityCode?: string | null;
  projectName?: string | null;
  projectCode?: string | null;
  projectId?: number | null;
};

export default function TenantTransferPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [rooms, setRooms] = useState<AvailableRoom[]>([]);
  const [organization, setOrganization] = useState<OrgInfo | null>(null);
  const [currentRoom, setCurrentRoom] = useState<{ roomNumber: string; floor: number } | null>(null);
  const [form, setForm] = useState({ toRoomId: "", effectiveDate: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/portal/transfers")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTransfers(data.transfers || []);
        setRooms(data.availableRooms || []);
        setOrganization(data.organization || null);
        setCurrentRoom(data.currentRoom || null);
      })
      .catch(() => {
        setTransfers([]);
        setRooms([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedRoom = rooms.find((r) => String(r.id) === form.toRoomId);

  const submit = async () => {
    if (!form.toRoomId || !form.effectiveDate) {
      alert("Kamar tujuan dan tanggal efektif wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/portal/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan pindah");
      setForm({ toRoomId: "", effectiveDate: "", reason: "" });
      load();
      alert("Permohonan pindah berhasil dikirim");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal mengajukan");
    } finally {
      setSaving(false);
    }
  };

  const roomLabel = (room: AvailableRoom) => {
    const parts = [
      room.buildingName || room.buildingCode,
      `Lt.${room.floor}`,
      `Kamar ${room.roomNumber}`,
    ].filter(Boolean);
    return `${parts.join(" · ")} — ${formatCurrency(room.price)}/bln`;
  };

  return (
    <div>
      <PageHeader
        title="Permohonan Pindah Unit/Kamar"
        description={
          organization?.projectName
            ? `Kamar kosong di ${organization.entityName || "Entity"} · ${organization.projectName}`
            : "Ajukan permohonan pindah kamar ke pengelola."
        }
      />

      {currentRoom && (
        <Card className="mb-4">
          <CardBody className="text-sm">
            <p className="text-slate-500">Kamar saat ini</p>
            <p className="font-semibold text-slate-900">
              Kamar {currentRoom.roomNumber} (Lt.{currentRoom.floor})
              {organization?.projectName && ` · ${organization.projectName}`}
            </p>
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardBody className="space-y-3">
          <h3 className="font-semibold text-slate-900">Form Pengajuan</h3>
          <Select label="Kamar Tujuan (kosong, project sama)" value={form.toRoomId} onChange={(e) => setForm({ ...form, toRoomId: e.target.value })}>
            <option value="">Pilih kamar kosong</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {roomLabel(room)}
              </option>
            ))}
          </Select>

          {selectedRoom && (
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600">
              <p><span className="text-slate-500">Unit/Gedung:</span> {selectedRoom.buildingName || "—"}</p>
              <p><span className="text-slate-500">Project:</span> {selectedRoom.projectName} ({selectedRoom.projectCode})</p>
              <p><span className="text-slate-500">Harga sewa:</span> {formatCurrency(selectedRoom.price)}/bulan</p>
            </div>
          )}

          {rooms.length === 0 && !loading && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              Tidak ada kamar kosong di project <strong>{organization?.projectName || "ini"}</strong> saat ini.
            </p>
          )}

          <Input label="Tanggal Efektif Pindah" type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
          <Input label="Alasan (opsional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Button onClick={submit} disabled={saving || rooms.length === 0}>{saving ? "Mengirim..." : "Kirim Permohonan"}</Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-semibold text-slate-900 mb-3">Riwayat Permohonan</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat...</p>
          ) : transfers.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada permohonan.</p>
          ) : (
            <div className="space-y-2">
              {transfers.map((t) => (
                <div key={t.id} className="p-3 bg-slate-50 rounded-lg text-sm">
                  <p className="font-medium">Kamar {t.fromRoom.roomNumber} → {t.toRoom.roomNumber}</p>
                  <p className="text-slate-500">Efektif: {formatDate(t.effectiveDate)} · Status: {t.status}</p>
                  {t.reason && <p className="text-slate-600 mt-1">{t.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
