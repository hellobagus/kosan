"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Play } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState, Button, Input,
} from "@/components/ui";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { MAINTENANCE_STATUS_LABELS } from "@/lib/inventory-service";

interface Maintenance {
  id: number; title: string; description: string | null; status: keyof typeof MAINTENANCE_STATUS_LABELS;
  cost: string; reportedAt: string; completedAt: string | null;
  asset: { assetCode: string; item: { name: string } };
  room: { roomNumber: string } | null;
  tenant: { user: { name: string } } | null;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  OPEN: "danger", IN_PROGRESS: "warning", COMPLETED: "success", CANCELLED: "default",
};

export default function MaintenanceBoard() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("OPEN");
  const [completing, setCompleting] = useState<number | null>(null);
  const [cost, setCost] = useState("");

  const fetchData = () => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : "";
    fetch(`/api/inventory/maintenance${params}`)
      .then((r) => r.json())
      .then(setMaintenances)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleAction = async (id: number, action: string, extra?: Record<string, unknown>) => {
    await fetch("/api/inventory/maintenance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...extra }),
    });
    setCompleting(null); setCost(""); fetchData();
  };

  return (
    <div>
      <PageHeader title="Maintenance" description="Kelola perbaikan barang rusak di kamar" />

      <div className="flex gap-2 mb-6">
        {["OPEN", "IN_PROGRESS", "COMPLETED", ""].map((s) => (
          <Button key={s || "all"} variant={filter === s ? "primary" : "secondary"}
            onClick={() => setFilter(s)}>
            {s ? MAINTENANCE_STATUS_LABELS[s as keyof typeof MAINTENANCE_STATUS_LABELS] : "Semua"}
          </Button>
        ))}
      </div>

      <Card><CardBody className="p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
        ) : maintenances.length === 0 ? (
          <EmptyState message="Tidak ada maintenance. Semua barang dalam kondisi baik." />
        ) : (
          <Table>
            <thead><tr>
              <Th>Tanggal</Th><Th>Judul</Th><Th>Asset</Th><Th>Kamar</Th><Th>Penghuni</Th>
              <Th>Status</Th><Th>Biaya</Th><Th>Aksi</Th>
            </tr></thead>
            <tbody>
              {maintenances.map((m) => (
                <tr key={m.id}>
                  <Td>{formatShortDate(m.reportedAt)}</Td>
                  <Td className="font-medium">{m.title}</Td>
                  <Td>{m.asset.item.name} ({m.asset.assetCode})</Td>
                  <Td>{m.room ? `Kamar ${m.room.roomNumber}` : "-"}</Td>
                  <Td>{m.tenant?.user.name || "-"}</Td>
                  <Td><Badge variant={STATUS_VARIANT[m.status]}>{MAINTENANCE_STATUS_LABELS[m.status]}</Badge></Td>
                  <Td>{formatCurrency(m.cost)}</Td>
                  <Td>
                    <div className="flex gap-1">
                      {m.status === "OPEN" && (
                        <button onClick={() => handleAction(m.id, "start")} title="Mulai" className="p-1.5 hover:bg-blue-50 rounded">
                          <Play className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {(m.status === "OPEN" || m.status === "IN_PROGRESS") && (
                        <button onClick={() => setCompleting(m.id)} title="Selesai" className="p-1.5 hover:bg-emerald-50 rounded">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
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

      {completing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-sm mx-4">
            <CardBody>
              <h3 className="font-semibold mb-4">Selesaikan Maintenance</h3>
              <Input label="Biaya Perbaikan (Rp)" type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="mb-4" />
              <div className="flex gap-2">
                <Button onClick={() => handleAction(completing, "complete", { cost: cost || 0 })}>Selesai</Button>
                <Button variant="ghost" onClick={() => setCompleting(null)}>Batal</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
