"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState,
  Input, Select, Button, Textarea,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface Category { id: number; name: string; }
interface Item {
  id: number; sku: string | null; name: string; categoryId: number | null;
  unit: string; unitPrice: string; description: string | null; active: boolean;
  category: Category | null;
  warehouseStock: { quantity: number } | null;
  _count: { assets: number };
}

const EMPTY = { sku: "", name: "", categoryId: "", unit: "unit", unitPrice: "", description: "", active: true };

export default function InventoryItemList() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [catName, setCatName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/inventory/items").then((r) => r.json()),
      fetch("/api/inventory/categories").then((r) => r.json()),
    ]).then(([itemsData, catData]) => {
      setItems(itemsData);
      setCategories(catData);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(""); setShowForm(true); };
  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({
      sku: item.sku || "", name: item.name, categoryId: item.categoryId ? String(item.categoryId) : "",
      unit: item.unit, unitPrice: String(item.unitPrice), description: item.description || "", active: item.active,
    });
    setError(""); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    const res = await fetch("/api/inventory/items", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: editing?.id }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Gagal menyimpan"); setSubmitting(false); return; }
    setShowForm(false); fetchData(); setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus barang ini?")) return;
    await fetch(`/api/inventory/items?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleAddCategory = async () => {
    if (!catName) return;
    await fetch("/api/inventory/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName }),
    });
    setCatName(""); setShowCatForm(false); fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Master Barang"
        description="Daftar barang inventaris kosan"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowCatForm(true)}>+ Kategori</Button>
            <Button onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Barang</Button>
          </div>
        }
      />

      {showCatForm && (
        <Card className="mb-6">
          <CardBody>
            <div className="flex gap-3 items-end">
              <Input label="Nama Kategori" value={catName} onChange={(e) => setCatName(e.target.value)} className="flex-1" />
              <Button onClick={handleAddCategory}>Simpan</Button>
              <Button variant="ghost" onClick={() => setShowCatForm(false)}>Batal</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              <Input label="Nama Barang *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Select label="Kategori" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">-- Pilih --</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input label="Satuan" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              <Input label="Harga Satuan" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} id="active" />
                <label htmlFor="active" className="text-sm text-slate-700">Aktif</label>
              </div>
              <div className="md:col-span-2">
                <Textarea label="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
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
          ) : items.length === 0 ? (
            <EmptyState message="Belum ada barang. Tambahkan barang inventaris pertama." />
          ) : (
            <Table>
              <thead><tr>
                <Th>SKU</Th><Th>Nama</Th><Th>Kategori</Th><Th>Satuan</Th><Th>Harga</Th><Th>Stok Gudang</Th><Th>Total Asset</Th><Th>Status</Th><Th>Aksi</Th>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.sku || "-"}</Td>
                    <Td className="font-medium">{item.name}</Td>
                    <Td>{item.category?.name || "-"}</Td>
                    <Td>{item.unit}</Td>
                    <Td>{formatCurrency(item.unitPrice)}</Td>
                    <Td>{item.warehouseStock?.quantity ?? 0}</Td>
                    <Td>{item._count.assets}</Td>
                    <Td><Badge variant={item.active ? "success" : "default"}>{item.active ? "Aktif" : "Nonaktif"}</Badge></Td>
                    <Td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4 text-slate-500" /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
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
