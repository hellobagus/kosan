"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState,
  Input, Select, Button,
} from "@/components/ui";
import {
  UTILITY_TYPE_LABELS,
  BILLING_METHOD_LABELS,
  DEFAULT_UNIT_LABELS,
  formatUtilityRate,
} from "@/lib/utility-service";

interface Utility {
  id: number;
  utilityName: string;
  utilityType: keyof typeof UTILITY_TYPE_LABELS;
  billingMethod: "METER" | "LUMPSUM";
  amount: string;
  unitLabel: string | null;
  active: boolean;
  _count?: { roomUtilities: number; billings: number };
}

const EMPTY_FORM = {
  utilityName: "",
  utilityType: "ELECTRICITY",
  billingMethod: "METER",
  amount: "",
  unitLabel: "",
  active: true,
};

export default function UtilityList() {
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Utility | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch("/api/utilities")
      .then((r) => r.json())
      .then(setUtilities)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };

  const openEdit = (u: Utility) => {
    setEditing(u);
    setForm({
      utilityName: u.utilityName,
      utilityType: u.utilityType,
      billingMethod: u.billingMethod,
      amount: String(u.amount),
      unitLabel: u.unitLabel || "",
      active: u.active,
    });
    setError("");
    setShowForm(true);
  };

  const handleTypeChange = (type: string) => {
    const unitLabel = DEFAULT_UNIT_LABELS[type as keyof typeof DEFAULT_UNIT_LABELS] || "";
    const billingMethod = ["ELECTRICITY", "WATER"].includes(type) ? "METER" : "LUMPSUM";
    setForm((f) => ({ ...f, utilityType: type, unitLabel, billingMethod }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/utilities", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: editing?.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan");
      setSubmitting(false);
      return;
    }
    setShowForm(false);
    fetchData();
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus utility ini?")) return;
    const res = await fetch(`/api/utilities?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Gagal menghapus");
    else fetchData();
  };

  const toggleActive = async (u: Utility) => {
    await fetch("/api/utilities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, active: !u.active }),
    });
    fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Daftar Utility"
        description="Kelola jenis utility: Listrik (kWh), Air (m³), Internet, Gas, dan service charge lainnya"
        action={
          <Button onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Utility</Button>
        }
      />

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800 mb-1">Metode Perhitungan</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Meter</strong> — Listrik & Air: Tagihan = (Meter Akhir − Meter Awal) × Tarif per unit</li>
                <li><strong>Lump Sum</strong> — Internet, Gas, dll: Tagihan tetap per bulan</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-semibold text-slate-900 mb-4">
              {editing ? "Edit Utility" : "Tambah Utility Baru"}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Utility"
                value={form.utilityName}
                onChange={(e) => setForm({ ...form, utilityName: e.target.value })}
                placeholder="Contoh: Listrik Kamar"
                required
              />
              <Select
                label="Tipe Utility"
                value={form.utilityType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                {Object.entries(UTILITY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <Select
                label="Metode Billing"
                value={form.billingMethod}
                onChange={(e) => setForm({ ...form, billingMethod: e.target.value as "METER" | "LUMPSUM" })}
              >
                <option value="METER">Meter (per KWH / m³)</option>
                <option value="LUMPSUM">Lump Sum (tarif tetap)</option>
              </Select>
              <Input
                label={form.billingMethod === "METER" ? "Tarif per Unit (Rp)" : "Tarif Tetap per Bulan (Rp)"}
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="1500"
                required
              />
              {form.billingMethod === "METER" && (
                <Input
                  label="Satuan"
                  value={form.unitLabel}
                  onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
                  placeholder="kWh atau m³"
                />
              )}
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="active" className="text-sm text-slate-700">Aktif</label>
              </div>
              {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            </div>
          ) : utilities.length === 0 ? (
            <EmptyState message="Belum ada utility. Tambahkan utility pertama Anda." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Nama</Th>
                  <Th>Tipe</Th>
                  <Th>Metode</Th>
                  <Th>Tarif</Th>
                  <Th>Kamar</Th>
                  <Th>Status</Th>
                  <Th>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {utilities.map((u) => (
                  <tr key={u.id} className={!u.active ? "opacity-50" : ""}>
                    <Td>{u.id}</Td>
                    <Td className="font-medium">{u.utilityName}</Td>
                    <Td>{UTILITY_TYPE_LABELS[u.utilityType]}</Td>
                    <Td>
                      <Badge variant={u.billingMethod === "METER" ? "info" : "warning"}>
                        {BILLING_METHOD_LABELS[u.billingMethod]}
                      </Badge>
                    </Td>
                    <Td>{formatUtilityRate(u.billingMethod, parseFloat(u.amount), u.unitLabel)}</Td>
                    <Td>{u._count?.roomUtilities || 0} kamar</Td>
                    <Td>
                      <button onClick={() => toggleActive(u)}>
                        <Badge variant={u.active ? "success" : "default"}>
                          {u.active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </button>
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
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
