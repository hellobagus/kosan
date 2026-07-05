"use client";

import { useEffect, useState } from "react";
import {
  PageHeader, Card, CardHeader, CardBody, Table, Th, Td, Badge, EmptyState, Button, Select,
} from "@/components/ui";
import { formatShortDate } from "@/lib/utils";
import { ASSET_STATUS_LABELS, LOCATION_TYPE_LABELS } from "@/lib/inventory-service";

interface Stock {
  id: number; quantity: number;
  item: { id: number; name: string; locationType: keyof typeof LOCATION_TYPE_LABELS; category: { name: string } | null };
}
interface Asset {
  id: number; assetCode: string; status: keyof typeof ASSET_STATUS_LABELS;
  item: { name: string; locationType: keyof typeof LOCATION_TYPE_LABELS };
  purchasePrice: string | null;
}
interface Entry {
  id: number; quantity: number; entryDate: string;
  item: { name: string }; purchase: { purchaseNumber: string } | null;
}
interface Room { id: number; roomNumber: string; }
interface SharedArea { id: number; name: string; }

export default function WarehouseBoard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [warehouseAssets, setWarehouseAssets] = useState<Asset[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sharedAreas, setSharedAreas] = useState<SharedArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<number | null>(null);
  const [deployTarget, setDeployTarget] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/inventory/warehouse").then((r) => r.json()),
      fetch("/api/rooms").then((r) => r.json()),
      fetch("/api/inventory/shared-areas").then((r) => r.json()),
    ]).then(([wh, r, areas]) => {
      setStocks(wh.stocks || []);
      setWarehouseAssets(wh.warehouseAssets || []);
      setEntries(wh.entries || []);
      setRooms(r);
      setSharedAreas(areas);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeploy = async (asset: Asset) => {
    if (!deployTarget) return;
    const isShared = asset.item.locationType === "SHARED" || asset.item.locationType === "BUILDING";
    await fetch("/api/inventory/assets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: asset.id,
        action: isShared ? "deploy_shared" : "deploy",
        ...(isShared ? { sharedAreaId: parseInt(deployTarget) } : { roomId: parseInt(deployTarget) }),
      }),
    });
    setDeploying(null);
    setDeployTarget("");
    fetchData();
  };

  return (
    <div>
      <PageHeader title="Gudang" description="Stok barang di gudang — tempatkan ke kamar/unit atau area bersama" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">Stok per Barang</h3></CardHeader>
          <CardBody className="p-0">
            {stocks.length === 0 ? (
              <EmptyState message="Gudang kosong. Terima pembelian untuk mengisi gudang." />
            ) : (
              <Table>
                <thead><tr><Th>Barang</Th><Th>Lokasi</Th><Th>Kategori</Th><Th>Qty Gudang</Th></tr></thead>
                <tbody>
                  {stocks.map((s) => (
                    <tr key={s.id}>
                      <Td className="font-medium">{s.item.name}</Td>
                      <Td><Badge variant="info">{LOCATION_TYPE_LABELS[s.item.locationType]}</Badge></Td>
                      <Td>{s.item.category?.name || "-"}</Td>
                      <Td><Badge variant="info">{s.quantity}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">Riwayat Masuk Gudang</h3></CardHeader>
          <CardBody className="p-0">
            {entries.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Belum ada riwayat</p>
            ) : (
              <Table>
                <thead><tr><Th>Tanggal</Th><Th>Barang</Th><Th>Qty</Th><Th>PO</Th></tr></thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <Td>{formatShortDate(e.entryDate)}</Td>
                      <Td>{e.item.name}</Td>
                      <Td>{e.quantity}</Td>
                      <Td>{e.purchase?.purchaseNumber || "-"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><h3 className="font-semibold text-slate-900">Asset di Gudang — Penempatan</h3></CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
          ) : warehouseAssets.length === 0 ? (
            <EmptyState message="Tidak ada asset di gudang. Semua asset sudah ditempatkan." />
          ) : (
            <Table>
              <thead><tr><Th>Kode Asset</Th><Th>Barang</Th><Th>Lokasi</Th><Th>Status</Th><Th>Penempatan</Th></tr></thead>
              <tbody>
                {warehouseAssets.map((a) => {
                  const isShared = a.item.locationType === "SHARED" || a.item.locationType === "BUILDING";
                  return (
                    <tr key={a.id}>
                      <Td className="font-mono text-sm">{a.assetCode}</Td>
                      <Td>{a.item.name}</Td>
                      <Td><Badge variant="info">{LOCATION_TYPE_LABELS[a.item.locationType]}</Badge></Td>
                      <Td><Badge variant="info">{ASSET_STATUS_LABELS[a.status]}</Badge></Td>
                      <Td>
                        {deploying === a.id ? (
                          <div className="flex gap-2 items-center">
                            <Select value={deployTarget} onChange={(e) => setDeployTarget(e.target.value)} className="w-40">
                              <option value="">-- Pilih --</option>
                              {isShared
                                ? sharedAreas.map((sa) => <option key={sa.id} value={sa.id}>{sa.name}</option>)
                                : rooms.map((r) => <option key={r.id} value={r.id}>Kamar {r.roomNumber}</option>)}
                            </Select>
                            <Button onClick={() => handleDeploy(a)}>Deploy</Button>
                            <Button variant="ghost" onClick={() => setDeploying(null)}>Batal</Button>
                          </div>
                        ) : (
                          <Button variant="secondary" onClick={() => setDeploying(a.id)}>
                            {isShared ? "Tempatkan ke Area" : "Tempatkan ke Kamar"}
                          </Button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
