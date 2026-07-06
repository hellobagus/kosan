"use client";

import { useEffect, useState } from "react";
import { useProjectRefreshKey } from "@/hooks/useProjectRefresh";
import { Plus, Pencil, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState,
  Input, Select, Button, Textarea,
} from "@/components/ui";
import { LOCATION_TYPE_LABELS } from "@/lib/inventory-service";

interface Item { id: number; name: string; locationType: keyof typeof LOCATION_TYPE_LABELS; }
interface TemplateItem { itemId: number; quantity: number; required: boolean; item?: Item; }
interface Template {
  id: number; name: string; description: string | null; active: boolean;
  items: Array<{ id: number; itemId: number; quantity: number; required: boolean; item: Item }>;
  rooms?: Array<{ id: number; roomNumber: string }>;
  _count?: { rooms: number };
}
interface Room { id: number; roomNumber: string; template?: { id: number; name: string } | null; }

export default function RoomTemplateBoard() {
  const refreshKey = useProjectRefreshKey();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [roomItems, setRoomItems] = useState<Item[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [assignRoomIds, setAssignRoomIds] = useState<number[]>([]);
  const [complianceRoomId, setComplianceRoomId] = useState("");
  const [compliance, setCompliance] = useState<{ hasTemplate: boolean; complete: boolean; templateName?: string; items: Array<{ itemName: string; required: number; actual: number; missing: number; isRequired: boolean }> } | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/inventory/templates").then((r) => r.json()),
      fetch("/api/inventory/items?locationType=ROOM").then((r) => r.json()),
      fetch("/api/rooms").then((r) => r.json()),
    ]).then(([t, items, r]) => {
      setTemplates(t);
      setRoomItems(items);
      setRooms(r);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [refreshKey]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setTemplateItems([]);
    setAssignRoomIds([]);
    setShowForm(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description || "" });
    setTemplateItems(t.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity, required: i.required })));
    setAssignRoomIds(t.rooms?.map((r) => r.id) || []);
    setShowForm(true);
  };

  const addTemplateItem = () => {
    if (roomItems.length === 0) return;
    const first = roomItems.find((i) => !templateItems.some((ti) => ti.itemId === i.id));
    if (!first) return;
    setTemplateItems([...templateItems, { itemId: first.id, quantity: 1, required: true }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      id: editing?.id,
      items: templateItems,
      assignRoomIds,
    };
    await fetch("/api/inventory/templates", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus template ini?")) return;
    await fetch(`/api/inventory/templates?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const checkCompliance = async (roomId: string) => {
    setComplianceRoomId(roomId);
    if (!roomId) { setCompliance(null); return; }
    const data = await fetch(`/api/inventory/templates?roomId=${roomId}`).then((r) => r.json());
    setCompliance(data);
  };

  return (
    <div>
      <PageHeader
        title="Template Inventaris Kamar"
        description="Standar barang wajib per tipe kamar — dipakai saat pengecekan kelengkapan dan checkout"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Template</Button>}
      />

      <Card className="mb-6">
        <CardBody>
          <Select label="Cek Kelengkapan Kamar" value={complianceRoomId} onChange={(e) => checkCompliance(e.target.value)} className="max-w-xs">
            <option value="">-- Pilih Kamar --</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Kamar {r.roomNumber}{r.template ? ` (${r.template.name})` : ""}
              </option>
            ))}
          </Select>
          {compliance?.hasTemplate && (
            <div className="mt-4">
              <div className={`flex items-center gap-2 mb-3 ${compliance.complete ? "text-emerald-600" : "text-amber-600"}`}>
                {compliance.complete ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="font-medium">
                  Template: {compliance.templateName} — {compliance.complete ? "Lengkap" : "Ada barang kurang"}
                </span>
              </div>
              <Table>
                <thead><tr><Th>Barang</Th><Th>Wajib</Th><Th>Ada</Th><Th>Kurang</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {compliance.items.map((i) => (
                    <tr key={i.itemName}>
                      <Td>{i.itemName}</Td>
                      <Td>{i.required}</Td>
                      <Td>{i.actual}</Td>
                      <Td>{i.missing}</Td>
                      <Td>
                        <Badge variant={i.missing === 0 ? "success" : i.isRequired ? "danger" : "warning"}>
                          {i.missing === 0 ? "OK" : i.isRequired ? "Kurang" : "Opsional"}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          {compliance && !compliance.hasTemplate && complianceRoomId && (
            <p className="text-sm text-slate-500 mt-3">Kamar ini belum memiliki template inventaris.</p>
          )}
        </CardBody>
      </Card>

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nama Template *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Textarea label="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-900">Barang Standar Kamar</h4>
                  <Button type="button" variant="secondary" onClick={addTemplateItem}>+ Barang</Button>
                </div>
                {templateItems.length === 0 ? (
                  <p className="text-sm text-slate-400">Tambahkan barang standar untuk template ini.</p>
                ) : (
                  <div className="space-y-2">
                    {templateItems.map((ti, idx) => (
                      <div key={idx} className="flex flex-wrap gap-2 items-end">
                        <Select label="Barang" value={String(ti.itemId)} onChange={(e) => {
                          const next = [...templateItems];
                          next[idx] = { ...next[idx], itemId: parseInt(e.target.value) };
                          setTemplateItems(next);
                        }} className="flex-1 min-w-[200px]">
                          {roomItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </Select>
                        <Input label="Qty" type="number" min={1} value={String(ti.quantity)} onChange={(e) => {
                          const next = [...templateItems];
                          next[idx] = { ...next[idx], quantity: parseInt(e.target.value) || 1 };
                          setTemplateItems(next);
                        }} className="w-20" />
                        <label className="flex items-center gap-1 text-sm pb-2">
                          <input type="checkbox" checked={ti.required} onChange={(e) => {
                            const next = [...templateItems];
                            next[idx] = { ...next[idx], required: e.target.checked };
                            setTemplateItems(next);
                          }} />
                          Wajib
                        </label>
                        <Button type="button" variant="ghost" onClick={() => setTemplateItems(templateItems.filter((_, i) => i !== idx))}>Hapus</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-2">Assign ke Kamar</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {rooms.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={assignRoomIds.includes(r.id)}
                        onChange={(e) => {
                          setAssignRoomIds(e.target.checked
                            ? [...assignRoomIds, r.id]
                            : assignRoomIds.filter((id) => id !== r.id));
                        }}
                      />
                      Kamar {r.roomNumber}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Simpan Template</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
          ) : templates.length === 0 ? (
            <EmptyState message="Belum ada template. Buat template standar barang kamar." />
          ) : (
            <Table>
              <thead><tr><Th>Template</Th><Th>Barang</Th><Th>Kamar</Th><Th>Status</Th><Th>Aksi</Th></tr></thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.description || "-"}</p>
                    </Td>
                    <Td>{t.items.length} jenis barang</Td>
                    <Td>{t._count?.rooms || 0} kamar</Td>
                    <Td><Badge variant={t.active ? "success" : "default"}>{t.active ? "Aktif" : "Nonaktif"}</Badge></Td>
                    <Td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4 text-slate-500" /></button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div>
                    </Td>
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
