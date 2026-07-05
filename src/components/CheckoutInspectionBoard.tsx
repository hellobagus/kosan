"use client";

import { useEffect, useState } from "react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState, Select, Button, Input,
} from "@/components/ui";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { ASSET_STATUS_LABELS, INSPECTION_RESULT_LABELS } from "@/lib/inventory-service";

interface Tenant {
  id: number; deposit: string;
  user: { name: string };
  room: { id: number; roomNumber: string };
}
interface Asset {
  id: number; assetCode: string; status: keyof typeof ASSET_STATUS_LABELS;
  item: { name: string };
}
interface Inspection {
  id: number; result: keyof typeof INSPECTION_RESULT_LABELS;
  damageCost: string; depositDeducted: string; inspectedAt: string; notes: string | null;
  tenant: { user: { name: string } };
  room: { roomNumber: string };
  asset: { item: { name: string }; assetCode: string };
}

interface InspRow { assetId: number; result: string; damageCost: string; notes: string; }

const RESULT_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  OK: "success", DAMAGED: "danger", MISSING: "warning",
};

export default function CheckoutInspectionBoard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [roomAssets, setRoomAssets] = useState<Asset[]>([]);
  const [inspRows, setInspRows] = useState<InspRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tenants?status=ACTIVE").then((r) => r.json()).then(setTenants);
    fetch("/api/inventory/inspections").then((r) => r.json()).then(setInspections);
  }, []);

  const loadAssets = async (tenantId: string) => {
    setSelectedTenant(tenantId);
    if (!tenantId) { setRoomAssets([]); setInspRows([]); return; }
    const tenant = tenants.find((t) => t.id === parseInt(tenantId));
    if (!tenant) return;
    setLoading(true);
    const assets = await fetch(`/api/inventory/assets?roomId=${tenant.room.id}`).then((r) => r.json());
    const inUse = assets.filter((a: Asset) => a.status === "IN_USE" || a.status === "DEPLOYED");
    setRoomAssets(inUse);
    setInspRows(inUse.map((a: Asset) => ({ assetId: a.id, result: "OK", damageCost: "0", notes: "" })));
    setLoading(false);
  };

  const updateRow = (assetId: number, field: keyof InspRow, value: string) => {
    setInspRows((rows) => rows.map((r) => r.assetId === assetId ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async () => {
    if (!selectedTenant || inspRows.length === 0) return;
    setSubmitting(true); setError("");
    const res = await fetch("/api/inventory/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: parseInt(selectedTenant),
        inspections: inspRows.map((r) => ({
          assetId: r.assetId,
          result: r.result,
          damageCost: parseFloat(r.damageCost || "0"),
          notes: r.notes || undefined,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Gagal"); setSubmitting(false); return; }
    alert(`Inspeksi selesai. Total potong deposit: ${formatCurrency(data.totalDeduction || 0)}`);
    setSelectedTenant(""); setRoomAssets([]); setInspRows([]);
    fetch("/api/inventory/inspections").then((r) => r.json()).then(setInspections);
    setSubmitting(false);
  };

  const totalDeduction = inspRows.reduce((sum, r) => {
    if (r.result !== "OK") return sum + parseFloat(r.damageCost || "0");
    return sum;
  }, 0);

  return (
    <div>
      <PageHeader title="Inspeksi Checkout" description="Periksa kondisi barang saat penghuni check-out dan potong deposit jika rusak" />

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap gap-4 items-end">
            <Select label="Pilih Penghuni (Check-Out)" value={selectedTenant} onChange={(e) => loadAssets(e.target.value)} className="w-72">
              <option value="">-- Pilih Penghuni --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.user.name} — Kamar {t.room.roomNumber}</option>
              ))}
            </Select>
            {selectedTenant && (
              <div className="text-sm text-slate-600">
                Deposit tersedia: <strong>{formatCurrency(tenants.find((t) => t.id === parseInt(selectedTenant))?.deposit || 0)}</strong>
              </div>
            )}
          </div>

          {loading && <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" /></div>}

          {inspRows.length > 0 && (
            <div className="mt-6">
              <Table>
                <thead><tr>
                  <Th>Asset</Th><Th>Kode</Th><Th>Hasil Inspeksi</Th><Th>Biaya Kerusakan</Th><Th>Catatan</Th>
                </tr></thead>
                <tbody>
                  {inspRows.map((row) => {
                    const asset = roomAssets.find((a) => a.id === row.assetId);
                    return (
                      <tr key={row.assetId}>
                        <Td>{asset?.item.name}</Td>
                        <Td className="font-mono text-sm">{asset?.assetCode}</Td>
                        <Td>
                          <Select value={row.result} onChange={(e) => updateRow(row.assetId, "result", e.target.value)}>
                            {Object.entries(INSPECTION_RESULT_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </Select>
                        </Td>
                        <Td>
                          <Input type="number" value={row.damageCost} disabled={row.result === "OK"}
                            onChange={(e) => updateRow(row.assetId, "damageCost", e.target.value)} />
                        </Td>
                        <Td>
                          <Input value={row.notes} onChange={(e) => updateRow(row.assetId, "notes", e.target.value)} placeholder="Catatan" />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-600">
                  Estimasi potong deposit: <strong className="text-red-600">{formatCurrency(totalDeduction)}</strong>
                </p>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Memproses..." : "Simpan Inspeksi & Potong Deposit"}
                </Button>
              </div>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {inspections.length === 0 ? (
            <EmptyState message="Belum ada inspeksi. Lakukan inspeksi saat penghuni check-out." />
          ) : (
            <Table>
              <thead><tr>
                <Th>Tanggal</Th><Th>Penghuni</Th><Th>Kamar</Th><Th>Asset</Th>
                <Th>Hasil</Th><Th>Biaya</Th><Th>Potong Deposit</Th>
              </tr></thead>
              <tbody>
                {inspections.map((i) => (
                  <tr key={i.id}>
                    <Td>{formatShortDate(i.inspectedAt)}</Td>
                    <Td>{i.tenant.user.name}</Td>
                    <Td>Kamar {i.room.roomNumber}</Td>
                    <Td>{i.asset.item.name} ({i.asset.assetCode})</Td>
                    <Td><Badge variant={RESULT_VARIANT[i.result]}>{INSPECTION_RESULT_LABELS[i.result]}</Badge></Td>
                    <Td>{formatCurrency(i.damageCost)}</Td>
                    <Td className="text-red-600 font-medium">{formatCurrency(i.depositDeducted)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
