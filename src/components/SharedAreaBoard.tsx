"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState,
  Input, Button, Textarea,
} from "@/components/ui";
import { ASSET_STATUS_LABELS, LOCATION_TYPE_LABELS } from "@/lib/inventory-service";

interface SharedArea {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  assets: Array<{
    id: number;
    assetCode: string;
    status: keyof typeof ASSET_STATUS_LABELS;
    item: { name: string; locationType: keyof typeof LOCATION_TYPE_LABELS };
  }>;
  _count: { assets: number };
}

export default function SharedAreaBoard() {
  const [areas, setAreas] = useState<SharedArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SharedArea | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const fetchData = () => {
    setLoading(true);
    fetch("/api/inventory/shared-areas")
      .then((r) => r.json())
      .then(setAreas)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/inventory/shared-areas", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: editing?.id }),
    });
    setShowForm(false);
    setEditing(null);
    setForm({ name: "", description: "" });
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus area bersama ini?")) return;
    const res = await fetch(`/api/inventory/shared-areas?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Gagal menghapus");
    fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Area Bersama & Fasilitas"
        description="Inventaris di luar kamar: dapur bersama, laundry, ruang tamu, dan fasilitas kosan"
        action={<Button onClick={() => { setEditing(null); setForm({ name: "", description: "" }); setShowForm(true); }}><Plus className="w-4 h-4" /> Tambah Area</Button>}
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nama Area *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Textarea label="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="md:col-span-2" />
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">Simpan</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
      ) : areas.length === 0 ? (
        <EmptyState message="Belum ada area bersama. Tambahkan dapur, laundry, atau fasilitas umum." />
      ) : (
        <div className="space-y-6">
          {areas.map((area) => (
            <Card key={area.id}>
              <CardBody>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{area.name}</h3>
                    <p className="text-sm text-slate-500">{area.description || "Tidak ada deskripsi"}</p>
                    <div className="mt-2"><Badge variant="info">{area._count.assets} asset</Badge></div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(area); setForm({ name: area.name, description: area.description || "" }); setShowForm(true); }} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={() => handleDelete(area.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
                {area.assets.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Belum ada barang ditempatkan. Deploy dari gudang.</p>
                ) : (
                  <Table>
                    <thead><tr><Th>Kode</Th><Th>Barang</Th><Th>Lokasi Barang</Th><Th>Status</Th></tr></thead>
                    <tbody>
                      {area.assets.map((a) => (
                        <tr key={a.id}>
                          <Td className="font-mono text-sm">{a.assetCode}</Td>
                          <Td>{a.item.name}</Td>
                          <Td>{LOCATION_TYPE_LABELS[a.item.locationType]}</Td>
                          <Td><Badge variant="success">{ASSET_STATUS_LABELS[a.status]}</Badge></Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
