"use client";

import { useEffect, useState } from "react";
import { useProjectRefreshKey } from "@/hooks/useProjectRefresh";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState,
  Input, Select, Button,
} from "@/components/ui";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { PURCHASE_STATUS_LABELS } from "@/lib/inventory-service";

interface Supplier { id: number; name: string; }
interface Item { id: number; name: string; unitPrice: string; }
interface PurchaseItem { id: number; quantity: number; unitPrice: string; totalPrice: string; item: Item; }
interface Purchase {
  id: number; purchaseNumber: string; purchaseDate: string; totalAmount: string;
  status: keyof typeof PURCHASE_STATUS_LABELS; notes: string | null;
  supplier: Supplier | null; items: PurchaseItem[];
}

interface LineItem { itemId: string; quantity: string; unitPrice: string; }

const STATUS_BADGE: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default", ORDERED: "info", RECEIVED: "success", CANCELLED: "danger",
};

export default function PurchaseBoard() {
  const refreshKey = useProjectRefreshKey();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSupplier, setShowSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "" });
  const [form, setForm] = useState({ supplierId: "", purchaseDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [lines, setLines] = useState<LineItem[]>([{ itemId: "", quantity: "1", unitPrice: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/inventory/purchases").then((r) => r.json()),
      fetch("/api/inventory/items").then((r) => r.json()),
      fetch("/api/inventory/suppliers").then((r) => r.json()),
    ]).then(([p, i, s]) => { setPurchases(p); setItems(i); setSuppliers(s); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [refreshKey]);

  const addLine = () => setLines([...lines, { itemId: "", quantity: "1", unitPrice: "" }]);
  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "itemId") {
      const item = items.find((i) => i.id === parseInt(value));
      if (item) updated[idx].unitPrice = String(item.unitPrice);
    }
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent, receiveNow = false) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    const validLines = lines.filter((l) => l.itemId && l.quantity);
    if (validLines.length === 0) { setError("Minimal 1 item"); setSubmitting(false); return; }

    const res = await fetch("/api/inventory/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        action: receiveNow ? "receive" : undefined,
        items: validLines.map((l) => ({
          itemId: parseInt(l.itemId), quantity: parseInt(l.quantity), unitPrice: parseFloat(l.unitPrice || "0"),
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Gagal"); setSubmitting(false); return; }
    setShowForm(false); setLines([{ itemId: "", quantity: "1", unitPrice: "" }]); fetchData(); setSubmitting(false);
  };

  const handleReceive = async (id: number) => {
    if (!confirm("Terima barang ke gudang?")) return;
    await fetch("/api/inventory/purchases", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "receive" }),
    });
    fetchData();
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Batalkan pembelian?")) return;
    await fetch("/api/inventory/purchases", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "cancel" }),
    });
    fetchData();
  };

  const handleAddSupplier = async () => {
    if (!supplierForm.name) return;
    await fetch("/api/inventory/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplierForm),
    });
    setSupplierForm({ name: "", phone: "", email: "" });
    setShowSupplier(false);
    fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Pembelian Barang"
        description="Buat pesanan pembelian dan terima barang ke gudang"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowSupplier(true)}>+ Supplier</Button>
            <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Pembelian Baru</Button>
          </div>
        }
      />

      {showSupplier && (
        <Card className="mb-6"><CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Nama Supplier" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
            <Input label="Telepon" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
            <Input label="Email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddSupplier}>Simpan Supplier</Button>
            <Button variant="ghost" onClick={() => setShowSupplier(false)}>Batal</Button>
          </div>
        </CardBody></Card>
      )}

      {showForm && (
        <Card className="mb-6"><CardBody>
          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Select label="Supplier" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Input label="Tanggal" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              <Input label="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <h4 className="font-medium text-slate-700 mb-3">Item Pembelian</h4>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                <Select value={line.itemId} onChange={(e) => updateLine(idx, "itemId", e.target.value)}>
                  <option value="">-- Barang --</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
                <Input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} />
                <Input type="number" placeholder="Harga Satuan" value={line.unitPrice} onChange={(e) => updateLine(idx, "unitPrice", e.target.value)} />
                <Button type="button" variant="ghost" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>Hapus</Button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addLine} className="mb-4">+ Tambah Item</Button>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>Simpan Pesanan</Button>
              <Button type="button" disabled={submitting} onClick={(e) => handleSubmit(e, true)}>Simpan & Terima ke Gudang</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </form>
        </CardBody></Card>
      )}

      <Card><CardBody className="p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
        ) : purchases.length === 0 ? (
          <EmptyState message="Belum ada pembelian. Buat pembelian barang pertama." />
        ) : (
          <Table>
            <thead><tr>
              <Th>No. PO</Th><Th>Tanggal</Th><Th>Supplier</Th><Th>Total</Th><Th>Items</Th><Th>Status</Th><Th>Aksi</Th>
            </tr></thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <Td className="font-medium">{p.purchaseNumber}</Td>
                  <Td>{formatShortDate(p.purchaseDate)}</Td>
                  <Td>{p.supplier?.name || "-"}</Td>
                  <Td>{formatCurrency(p.totalAmount)}</Td>
                  <Td>{p.items.map((i) => `${i.item.name} (${i.quantity})`).join(", ")}</Td>
                  <Td><Badge variant={STATUS_BADGE[p.status]}>{PURCHASE_STATUS_LABELS[p.status]}</Badge></Td>
                  <Td>
                    {p.status === "ORDERED" && (
                      <div className="flex gap-1">
                        <button onClick={() => handleReceive(p.id)} title="Terima ke Gudang" className="p-1.5 hover:bg-emerald-50 rounded">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button onClick={() => handleCancel(p.id)} title="Batalkan" className="p-1.5 hover:bg-red-50 rounded">
                          <XCircle className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody></Card>
    </div>
  );
}
