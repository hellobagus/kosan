"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Play, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, Badge, EmptyState, Button, Input,
} from "@/components/ui";
import { formatShortDate } from "@/lib/utils";
import {
  REPAIR_CATEGORY_LABELS,
  REPAIR_STATUS_LABELS,
} from "@/lib/repair-request-constants";
import { useProjectRefreshKey } from "@/hooks/useProjectRefresh";

interface RepairRequest {
  id: number;
  category: keyof typeof REPAIR_CATEGORY_LABELS;
  title: string;
  description: string | null;
  status: keyof typeof REPAIR_STATUS_LABELS;
  priority: string;
  photoUrls?: string[] | null;
  inspectionNotes: string | null;
  reportedAt: string;
  cost: string;
  room: { roomNumber: string; floor: number };
  tenant: { user: { name: string; phone: string | null } } | null;
}

function tenantWhatsAppLink(phone: string | null | undefined, message: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("62") ? digits : digits.startsWith("0") ? `62${digits.slice(1)}` : `62${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  REQUESTED: "danger",
  INSPECTING: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "default",
};

export default function TenantRepairBoard() {
  const refreshKey = useProjectRefreshKey();
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("REQUESTED");
  const [modal, setModal] = useState<{
    id: number;
    action: "inspect" | "complete";
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : "";
    fetch(`/api/repair-requests${params}`)
      .then((r) => r.json())
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  const handleAction = async (id: number, action: string, extra?: Record<string, unknown>) => {
    const res = await fetch("/api/repair-requests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal memproses");
      return;
    }
    setModal(null);
    setNotes("");
    setCost("");
    fetchData();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {["REQUESTED", "INSPECTING", "IN_PROGRESS", "COMPLETED", ""].map((s) => (
          <Button
            key={s || "all"}
            variant={filter === s ? "primary" : "secondary"}
            onClick={() => setFilter(s)}
          >
            {s ? REPAIR_STATUS_LABELS[s as keyof typeof REPAIR_STATUS_LABELS] : "Semua"}
          </Button>
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState message="Belum ada permintaan perbaikan dari penghuni." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Tanggal</Th>
                  <Th>Penghuni</Th>
                  <Th>Kamar</Th>
                  <Th>Kategori</Th>
                  <Th>Masalah</Th>
                  <Th>Status</Th>
                  <Th>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <Td>{formatShortDate(r.reportedAt)}</Td>
                    <Td>
                      <div>{r.tenant?.user.name || "—"}</div>
                      <div className="text-xs text-slate-500">{r.tenant?.user.phone || ""}</div>
                    </Td>
                    <Td>Kamar {r.room.roomNumber} (Lt.{r.room.floor})</Td>
                    <Td>{REPAIR_CATEGORY_LABELS[r.category]}</Td>
                    <Td>
                      <div className="font-medium">{r.title}</div>
                      {r.priority === "URGENT" && (
                        <span className="text-xs text-red-600 font-medium">Mendesak</span>
                      )}
                      {r.description && (
                        <p className="text-xs text-slate-500 mt-0.5 max-w-xs">{r.description}</p>
                      )}
                      {Array.isArray(r.photoUrls) && r.photoUrls.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {r.photoUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="Foto" className="w-12 h-12 object-cover rounded border" />
                            </a>
                          ))}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Badge variant={STATUS_VARIANT[r.status]}>
                        {REPAIR_STATUS_LABELS[r.status]}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex gap-1 flex-wrap">
                        {r.tenant?.user.phone && (
                          <a
                            href={tenantWhatsAppLink(
                              r.tenant.user.phone,
                              `Halo ${r.tenant.user.name}, terkait permintaan perbaikan #${r.id} (${r.title}) di kamar ${r.room.roomNumber}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp penghuni"
                            className="p-1.5 hover:bg-green-50 rounded"
                          >
                            <MessageCircle className="w-4 h-4 text-green-600" />
                          </a>
                        )}
                        {r.status === "REQUESTED" && (
                          <button
                            onClick={() => setModal({ id: r.id, action: "inspect" })}
                            title="Jadwalkan Inspeksi"
                            className="p-1.5 hover:bg-blue-50 rounded"
                          >
                            <ClipboardCheck className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        {r.status === "INSPECTING" && (
                          <button
                            onClick={() => handleAction(r.id, "start")}
                            title="Mulai Perbaikan"
                            className="p-1.5 hover:bg-amber-50 rounded"
                          >
                            <Play className="w-4 h-4 text-amber-600" />
                          </button>
                        )}
                        {(r.status === "INSPECTING" || r.status === "IN_PROGRESS") && (
                          <button
                            onClick={() => setModal({ id: r.id, action: "complete" })}
                            title="Selesaikan"
                            className="p-1.5 hover:bg-emerald-50 rounded"
                          >
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          </button>
                        )}
                        {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleAction(r.id, "cancel", { resolutionNotes: "Dibatalkan pengurus" })}
                            title="Batalkan"
                            className="p-1.5 hover:bg-red-50 rounded"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardBody className="space-y-4">
              <h3 className="font-semibold">
                {modal.action === "inspect" ? "Inspeksi Unit Penghuni" : "Selesaikan Perbaikan"}
              </h3>
              {modal.action === "inspect" ? (
                <Input
                  label="Catatan Inspeksi"
                  placeholder="Hasil inspeksi di unit/kamar..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              ) : (
                <>
                  <Input
                    label="Catatan Penyelesaian"
                    placeholder="Perbaikan yang dilakukan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Input
                    label="Biaya Perbaikan (Rp)"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    handleAction(
                      modal.id,
                      modal.action === "inspect" ? "inspect" : "complete",
                      modal.action === "inspect"
                        ? { inspectionNotes: notes }
                        : { resolutionNotes: notes, cost: cost || 0 }
                    )
                  }
                >
                  Simpan
                </Button>
                <Button variant="ghost" onClick={() => setModal(null)}>Batal</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
