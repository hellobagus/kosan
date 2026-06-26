"use client";

import { useEffect, useState } from "react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState,
  Input, Select, Button,
} from "@/components/ui";
import { formatCurrency, formatShortDate, getMonthName } from "@/lib/utils";

interface Finance {
  id: number;
  type: string;
  amount: string;
  description: string;
  category: string | null;
  transactionDate: string;
  tenant?: { user: { name: string } };
  room?: { roomNumber: string };
}

interface Tenant {
  id: number;
  user: { name: string };
  room: { roomNumber: string; id: number };
}

export default function FinancePage({ type }: { type: "INCOME" | "EXPENSE" }) {
  const now = new Date();
  const [finances, setFinances] = useState<Finance[]>([]);
  const [total, setTotal] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [useDateRange, setUseDateRange] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    category: "",
    transactionDate: new Date().toISOString().split("T")[0],
    tenantId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const isIncome = type === "INCOME";
  const title = isIncome ? "Pemasukan" : "Pengeluaran";

  const fetchData = () => {
    setLoading(true);
    let url = `/api/finances?type=${type}`;
    if (useDateRange && startDate && endDate) {
      url += `&startDate=${startDate}&endDate=${endDate}`;
    } else {
      url += `&month=${filterMonth}&year=${filterYear}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setFinances(data.finances || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    if (isIncome) {
      fetch("/api/tenants?status=ACTIVE").then((r) => r.json()).then(setTenants);
    }
  }, [filterMonth, filterYear, startDate, endDate, useDateRange, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const tenant = tenants.find((t) => t.id === parseInt(form.tenantId));
    await fetch("/api/finances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        ...form,
        roomId: tenant?.room.id || null,
      }),
    });
    setShowForm(false);
    setForm({ amount: "", description: "", category: "", transactionDate: new Date().toISOString().split("T")[0], tenantId: "" });
    fetchData();
    setSubmitting(false);
  };

  const incomeCategories = ["Sewa Bulanan", "Deposit", "Denda", "Lainnya"];
  const expenseCategories = ["Listrik", "Air", "Internet", "Kebersihan", "Perbaikan", "Gaji", "Lainnya"];

  return (
    <div>
      <PageHeader
        title={title}
        description={`Kelola data ${title.toLowerCase()} kosan`}
        action={<Button onClick={() => setShowForm(!showForm)}>+ Tambah {title}</Button>}
      />

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Jumlah (Rp)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <Input label="Tanggal" type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} required />
                <Select label="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                  <option value="">-- Pilih --</option>
                  {(isIncome ? incomeCategories : expenseCategories).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                {isIncome && (
                  <Select label="Penghuni (opsional)" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>
                    <option value="">-- Umum --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.user.name} - Kamar {t.room.roomNumber}</option>
                    ))}
                  </Select>
                )}
              </div>
              <Input label="Keterangan" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={useDateRange} onChange={(e) => setUseDateRange(e.target.checked)} className="rounded" />
              Filter berdasarkan tanggal
            </label>
            {useDateRange ? (
              <>
                <Input label="Dari" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input label="Sampai" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </>
            ) : (
              <>
                <Select label="Bulan" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                  ))}
                </Select>
                <Select label="Tahun" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Select>
              </>
            )}
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Total {title}</p>
            <p className={`text-2xl font-bold ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(total)}
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
          ) : finances.length === 0 ? (
            <EmptyState message={`Belum ada data ${title.toLowerCase()}`} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Tanggal</Th>
                  <Th>Keterangan</Th>
                  <Th>Kategori</Th>
                  <Th>Penghuni/Kamar</Th>
                  <Th>Jumlah</Th>
                </tr>
              </thead>
              <tbody>
                {finances.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <Td>{formatShortDate(f.transactionDate)}</Td>
                    <Td>{f.description}</Td>
                    <Td><Badge>{f.category || "-"}</Badge></Td>
                    <Td>{f.tenant?.user.name || f.room?.roomNumber || "-"}</Td>
                    <Td className={`font-semibold ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(f.amount)}
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
