"use client";

import { useEffect, useState } from "react";
import { Plus, Ban } from "lucide-react";
import {
  PageHeader,
  Card,
  CardBody,
  Table,
  Th,
  Td,
  Button,
  Input,
  Badge,
} from "@/components/ui";
import { AccountingPeriodBar } from "@/components/accounting/AccountingPeriodBar";
import { formatCurrency, formatShortDate } from "@/lib/utils";

type Account = { id: number; code: string; name: string };
type JournalLine = {
  id?: number;
  accountId: number;
  debit: number;
  credit: number;
  memo?: string | null;
  account?: Account;
};
type Journal = {
  id: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: "DRAFT" | "POSTED" | "VOID";
  source: string;
  lines: JournalLine[];
};

export default function JurnalPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [journals, setJournals] = useState<Journal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Journal | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    entryDate: now.toISOString().split("T")[0],
    description: "",
    reference: "",
    lines: [
      { accountId: "", debit: "", credit: "" },
      { accountId: "", debit: "", credit: "" },
    ] as Array<{ accountId: string; debit: string; credit: string }>,
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/accounting/journals?month=${month}&year=${year}`).then((r) => r.json()),
      fetch("/api/accounting/accounts").then((r) => r.json()),
    ])
      .then(([j, a]) => {
        setJournals(j.journals || []);
        setAccounts((a.accounts || []).filter((x: Account & { isActive?: boolean }) => x.isActive !== false));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/accounting/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryDate: form.entryDate,
        description: form.description,
        reference: form.reference || null,
        lines: form.lines.map((l) => ({
          accountId: Number(l.accountId),
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan jurnal");
      return;
    }
    setShowForm(false);
    setForm({
      entryDate: now.toISOString().split("T")[0],
      description: "",
      reference: "",
      lines: [
        { accountId: "", debit: "", credit: "" },
        { accountId: "", debit: "", credit: "" },
      ],
    });
    load();
  };

  const voidEntry = async (id: number) => {
    if (!confirm("Batalkan jurnal ini? Saldo akan dibalik (status VOID).")) return;
    const res = await fetch("/api/accounting/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "void", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal membatalkan");
      return;
    }
    setSelected(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Jurnal Umum"
        description="Entri jurnal double-entry (otomatis dari buku kas + manual)"
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" /> Jurnal Manual
          </Button>
        }
      />

      <AccountingPeriodBar
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onRefresh={load}
        loading={loading}
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Tanggal"
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                  required
                />
                <Input
                  label="Deskripsi"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
                <Input
                  label="Referensi"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Akun</Th>
                      <Th className="text-right">Debit</Th>
                      <Th className="text-right">Kredit</Th>
                      <Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, idx) => (
                      <tr key={idx}>
                        <Td>
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                            value={line.accountId}
                            onChange={(e) => {
                              const lines = [...form.lines];
                              lines[idx] = { ...lines[idx], accountId: e.target.value };
                              setForm({ ...form, lines });
                            }}
                            required
                          >
                            <option value="">Pilih akun</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} — {a.name}
                              </option>
                            ))}
                          </select>
                        </Td>
                        <Td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-right"
                            value={line.debit}
                            onChange={(e) => {
                              const lines = [...form.lines];
                              lines[idx] = { ...lines[idx], debit: e.target.value, credit: "" };
                              setForm({ ...form, lines });
                            }}
                          />
                        </Td>
                        <Td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-right"
                            value={line.credit}
                            onChange={(e) => {
                              const lines = [...form.lines];
                              lines[idx] = { ...lines[idx], credit: e.target.value, debit: "" };
                              setForm({ ...form, lines });
                            }}
                          />
                        </Td>
                        <Td>
                          {form.lines.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  lines: form.lines.filter((_, i) => i !== idx),
                                })
                              }
                            >
                              Hapus
                            </Button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setForm({
                      ...form,
                      lines: [...form.lines, { accountId: "", debit: "", credit: "" }],
                    })
                  }
                >
                  + Baris
                </Button>
                <span className={`text-sm font-medium ${Math.abs(totalDebit - totalCredit) < 0.01 ? "text-emerald-700" : "text-red-600"}`}>
                  Debit {formatCurrency(totalDebit)} · Kredit {formatCurrency(totalCredit)}
                </span>
                <Button type="submit">Posting Jurnal</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardBody className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>No. Jurnal</Th>
                    <Th>Tanggal</Th>
                    <Th>Keterangan</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map((j) => (
                    <tr
                      key={j.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelected(j)}
                    >
                      <Td className="font-mono text-sm">{j.entryNumber}</Td>
                      <Td>{formatShortDate(j.entryDate)}</Td>
                      <Td>
                        <div>{j.description}</div>
                        <div className="text-xs text-slate-400">{j.source}</div>
                      </Td>
                      <Td>
                        <Badge
                          variant={
                            j.status === "POSTED"
                              ? "success"
                              : j.status === "VOID"
                                ? "danger"
                                : "default"
                          }
                        >
                          {j.status}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                  {journals.length === 0 && (
                    <tr>
                      <Td colSpan={4} className="text-center text-slate-500 py-8">
                        Belum ada jurnal di periode ini
                      </Td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardBody>
            {!selected ? (
              <p className="text-sm text-slate-500">Pilih jurnal untuk melihat detail.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="font-mono text-sm text-teal-700">{selected.entryNumber}</div>
                  <h3 className="font-semibold text-slate-900 mt-1">{selected.description}</h3>
                  <p className="text-sm text-slate-500">
                    {formatShortDate(selected.entryDate)} · {selected.status}
                  </p>
                </div>
                <Table>
                  <thead>
                    <tr>
                      <Th>Akun</Th>
                      <Th className="text-right">D</Th>
                      <Th className="text-right">K</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l, i) => (
                      <tr key={l.id || i}>
                        <Td className="text-sm">
                          {l.account ? `${l.account.code} ${l.account.name}` : l.accountId}
                        </Td>
                        <Td className="text-right text-sm">
                          {Number(l.debit) > 0 ? formatCurrency(Number(l.debit)) : "—"}
                        </Td>
                        <Td className="text-right text-sm">
                          {Number(l.credit) > 0 ? formatCurrency(Number(l.credit)) : "—"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {selected.status === "POSTED" && (
                  <Button variant="danger" onClick={() => voidEntry(selected.id)}>
                    <Ban className="w-4 h-4" /> Void Jurnal
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
