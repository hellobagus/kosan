"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Card, CardBody, Table, Th, Td, Button, Input, Select, Badge } from "@/components/ui";
import { accountTypeLabel } from "@/lib/chart-of-accounts";

type Account = {
  id: number;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normalBalance: "DEBIT" | "CREDIT";
  isSystem: boolean;
  isActive: boolean;
  description: string | null;
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "EXPENSE",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/accounting/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/accounting/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan");
      return;
    }
    setShowForm(false);
    setForm({ code: "", name: "", type: "EXPENSE", description: "" });
    load();
  };

  const toggleActive = async (acc: Account) => {
    await fetch("/api/accounting/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: acc.id, isActive: !acc.isActive }),
    });
    load();
  };

  return (
    <div>
      <PageHeader
        title="Bagan Akun (COA)"
        description="Akun standar manajemen kosan — aset, kewajiban, pendapatan sewa/utilitas, dan beban operasional"
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await fetch("/api/accounting/periods", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "ensure-coa" }),
                });
                load();
              }}
            >
              Sinkronkan Standar
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4" /> Akun Baru
            </Button>
          </div>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                label="Kode"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
                placeholder="5600"
              />
              <Input
                label="Nama"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Select
                label="Tipe"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="ASSET">Aset</option>
                <option value="LIABILITY">Kewajiban</option>
                <option value="EQUITY">Ekuitas</option>
                <option value="REVENUE">Pendapatan</option>
                <option value="EXPENSE">Beban</option>
              </Select>
              <Input
                label="Keterangan"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="md:col-span-4 flex gap-2 items-center">
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                {error && <span className="text-sm text-red-600">{error}</span>}
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
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Kode</Th>
                  <Th>Nama</Th>
                  <Th>Tipe</Th>
                  <Th>Saldo Normal</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className={!a.isActive ? "opacity-50" : undefined}>
                    <Td className="font-mono font-medium">{a.code}</Td>
                    <Td>
                      {a.name}
                      {a.isSystem && (
                        <span className="ml-2 text-xs text-slate-400">sistem</span>
                      )}
                    </Td>
                    <Td>{accountTypeLabel(a.type)}</Td>
                    <Td>{a.normalBalance === "DEBIT" ? "Debit" : "Kredit"}</Td>
                    <Td>
                      <Badge variant={a.isActive ? "success" : "default"}>
                        {a.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </Td>
                    <Td>
                      <Button variant="ghost" onClick={() => toggleActive(a)}>
                        {a.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
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
