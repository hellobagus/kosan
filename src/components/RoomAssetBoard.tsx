"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Wrench } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState, Select, Button, Input, Textarea,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { ASSET_STATUS_LABELS } from "@/lib/inventory-service";

interface Asset {
  id: number; assetCode: string; status: keyof typeof ASSET_STATUS_LABELS;
  purchasePrice: string | null; deployedAt: string | null;
  item: { name: string; category: { name: string } | null };
  room: { id: number; roomNumber: string } | null;
  sharedArea: { id: number; name: string } | null;
  tenant: { id: number; user: { name: string } } | null;
  utility: { utilityName: string } | null;
}

interface TemplateCompliance {
  hasTemplate: boolean;
  complete: boolean;
  templateName?: string;
  items: Array<{ itemName: string; required: number; actual: number; missing: number; isRequired: boolean }>;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  IN_WAREHOUSE: "info", DEPLOYED: "success", IN_USE: "success",
  DAMAGED: "danger", MAINTENANCE: "warning", RETIRED: "default",
};

export default function RoomAssetBoard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: number; roomNumber: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterRoom, setFilterRoom] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [compliance, setCompliance] = useState<TemplateCompliance | null>(null);
  const [reporting, setReporting] = useState<number | null>(null);
  const [maintForm, setMaintForm] = useState({ title: "", description: "" });

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterRoom) params.set("roomId", filterRoom);
    if (filterStatus) params.set("status", filterStatus);
    Promise.all([
      fetch(`/api/inventory/assets?${params}`).then((r) => r.json()),
      fetch("/api/rooms").then((r) => r.json()),
    ]).then(([a, r]) => { setAssets(a); setRooms(r); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filterRoom, filterStatus]);

  useEffect(() => {
    if (!filterRoom) { setCompliance(null); return; }
    fetch(`/api/inventory/templates?roomId=${filterRoom}`)
      .then((r) => r.json())
      .then(setCompliance);
  }, [filterRoom]);

  const handleReactivate = async (id: number) => {
    await fetch("/api/inventory/assets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "reactivate" }),
    });
    fetchData();
  };

  const handleReportDamage = async (assetId: number) => {
    if (!maintForm.title) return;
    await fetch("/api/inventory/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, ...maintForm, tenantId: assets.find((a) => a.id === assetId)?.tenant?.id }),
    });
    setReporting(null); setMaintForm({ title: "", description: "" }); fetchData();
  };

  return (
    <div>
      <PageHeader title="Asset per Kamar" description="Barang yang ditempatkan di kamar dan digunakan penghuni" />

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)} className="w-48">
          <option value="">Semua Kamar</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>Kamar {r.roomNumber}</option>)}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-48">
          <option value="">Semua Status</option>
          {Object.entries(ASSET_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      {compliance?.hasTemplate && (
        <Card className={`mb-6 border ${compliance.complete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <CardBody>
            <p className="font-medium text-slate-900">
              Template: {compliance.templateName} — {compliance.complete ? "Kelengkapan OK" : "Ada barang kurang"}
            </p>
            {!compliance.complete && (
              <ul className="mt-2 text-sm text-amber-800 list-disc pl-5">
                {compliance.items.filter((i) => i.missing > 0 && i.isRequired).map((i) => (
                  <li key={i.itemName}>{i.itemName}: kurang {i.missing} (wajib {i.required}, ada {i.actual})</li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <Card><CardBody className="p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
        ) : assets.length === 0 ? (
          <EmptyState message="Belum ada asset. Tempatkan barang dari gudang ke kamar." />
        ) : (
          <Table>
            <thead><tr>
              <Th>Kode</Th><Th>Barang</Th><Th>Kamar</Th><Th>Area Bersama</Th><Th>Penghuni</Th><Th>Utility</Th>
              <Th>Status</Th><Th>Nilai</Th><Th>Aksi</Th>
            </tr></thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <Td className="font-mono text-sm">{a.assetCode}</Td>
                  <Td className="font-medium">{a.item.name}</Td>
                  <Td>{a.room ? `Kamar ${a.room.roomNumber}` : "-"}</Td>
                  <Td>{a.sharedArea?.name || "-"}</Td>
                  <Td>{a.tenant?.user.name || "-"}</Td>
                  <Td>{a.utility?.utilityName || "-"}</Td>
                  <Td><Badge variant={STATUS_VARIANT[a.status]}>{ASSET_STATUS_LABELS[a.status]}</Badge></Td>
                  <Td>{a.purchasePrice ? formatCurrency(a.purchasePrice) : "-"}</Td>
                  <Td>
                    <div className="flex gap-1">
                      {(a.status === "IN_USE" || a.status === "DEPLOYED") && (
                        <button onClick={() => { setReporting(a.id); setMaintForm({ title: `Kerusakan ${a.item.name}`, description: "" }); }}
                          className="p-1.5 hover:bg-amber-50 rounded" title="Laporkan Rusak">
                          <Wrench className="w-4 h-4 text-amber-600" />
                        </button>
                      )}
                      {(a.status === "DAMAGED" || a.status === "MAINTENANCE") && (
                        <button onClick={() => handleReactivate(a.id)} className="p-1.5 hover:bg-emerald-50 rounded" title="Aktifkan Kembali">
                          <RotateCcw className="w-4 h-4 text-emerald-600" />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody></Card>

      {reporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardBody>
              <h3 className="font-semibold mb-4">Laporkan Kerusakan</h3>
              <Input label="Judul" value={maintForm.title} onChange={(e) => setMaintForm({ ...maintForm, title: e.target.value })} className="mb-3" />
              <Textarea label="Deskripsi" value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} rows={3} className="mb-4" />
              <div className="flex gap-2">
                <Button onClick={() => handleReportDamage(reporting)}>Laporkan</Button>
                <Button variant="ghost" onClick={() => setReporting(null)}>Batal</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
