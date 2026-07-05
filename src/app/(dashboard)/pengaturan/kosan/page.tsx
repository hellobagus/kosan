"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, CardBody, Button, Input, Textarea } from "@/components/ui";
import { Plus, Save, Trash2 } from "lucide-react";
import { LeasePackagesEditor } from "@/components/LeasePackagesEditor";
import {
  DEFAULT_LEASE_PACKAGES,
  type LeasePackage,
  parseLeasePackages,
} from "@/lib/tenant-utils";

interface BankRow {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

interface KosanForm {
  gracePeriodDays: string;
  latePenaltyPerDay: string;
  paymentNotes: string;
  termsAndConditions: string;
  leasePackages: LeasePackage[];
  banks: BankRow[];
}

export default function PengaturanKosanPage() {
  const [form, setForm] = useState<KosanForm>({
    gracePeriodDays: "3",
    latePenaltyPerDay: "50000",
    paymentNotes: "",
    termsAndConditions: "",
    leasePackages: DEFAULT_LEASE_PACKAGES,
    banks: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const p = data.profile;
        setForm({
          gracePeriodDays: String(p.gracePeriodDays ?? 3),
          latePenaltyPerDay: String(p.latePenaltyPerDay ?? 50000),
          paymentNotes: p.paymentNotes || "",
          termsAndConditions: p.termsAndConditions || "",
          leasePackages: parseLeasePackages(p.leasePackages, {
            leaseBonusRules: p.leaseBonusRules,
            yearlyLeaseBonusEnabled: p.yearlyLeaseBonusEnabled,
            yearlyLeaseBonusMonths: p.yearlyLeaseBonusMonths,
          }),
          banks: (data.banks || []).map((b: BankRow) => ({
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            accountHolder: b.accountHolder,
          })),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const addBank = () => {
    setForm((f) => ({
      ...f,
      banks: [...f.banks, { bankName: "", accountNumber: "", accountHolder: "" }],
    }));
  };

  const updateBank = (index: number, field: keyof BankRow, value: string) => {
    setForm((f) => {
      const banks = [...f.banks];
      banks[index] = { ...banks[index], [field]: value };
      return { ...f, banks };
    });
  };

  const removeBank = (index: number) => {
    setForm((f) => ({ ...f, banks: f.banks.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "kosan", ...form }),
    });
    const data = await res.json();
    setSaving(false);
    setMessage(res.ok ? "Pengaturan kosan berhasil disimpan" : data.error || "Gagal menyimpan");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pengaturan Kosan"
        description="Atur denda keterlambatan, catatan pembayaran, dan rekening bank untuk invoice"
      />

      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-semibold text-slate-900">Kebijakan Keterlambatan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Masa Tenggang (hari)"
                type="number"
                min={0}
                value={form.gracePeriodDays}
                onChange={(e) => setForm({ ...form, gracePeriodDays: e.target.value })}
              />
              <Input
                label="Denda per Hari (Rp)"
                type="number"
                min={0}
                value={form.latePenaltyPerDay}
                onChange={(e) => setForm({ ...form, latePenaltyPerDay: e.target.value })}
              />
            </div>
            <Textarea
              label="Catatan Pembayaran (footer invoice)"
              rows={3}
              value={form.paymentNotes}
              onChange={(e) => setForm({ ...form, paymentNotes: e.target.value })}
              placeholder="Kirim bukti transfer setelah pembayaran. Terima Kasih."
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-semibold text-slate-900">Paket Lama Sewa &amp; Free Gift</h3>
            <p className="text-sm text-slate-500">
              Atur pilihan lama sewa yang muncul saat input penghuni baru. Setiap paket bisa memiliki
              hadiah (free gift) berupa teks bebas, misalnya &quot;Gratis 1 bulan&quot; atau &quot;Voucher
              laundry&quot;.
            </p>
            <LeasePackagesEditor
              packages={form.leasePackages}
              onChange={(leasePackages) => setForm({ ...form, leasePackages })}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-semibold text-slate-900">Syarat &amp; Ketentuan</h3>
            <p className="text-sm text-slate-500">
              Teks ini ditampilkan saat input penghuni baru dan harus disetujui sebelum menyimpan.
            </p>
            <Textarea
              label="Isi Syarat & Ketentuan"
              rows={8}
              value={form.termsAndConditions}
              onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
              placeholder="Tuliskan syarat dan ketentuan sewa kamar di sini..."
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Rekening Bank</h3>
              <Button variant="secondary" onClick={addBank} className="!py-2 !px-3 text-xs">
                <Plus className="w-4 h-4" /> Tambah Rekening
              </Button>
            </div>

            {form.banks.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada rekening bank. Klik tambah untuk menambahkan.</p>
            )}

            {form.banks.map((bank, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-4 bg-slate-50 rounded-lg">
                <Input label="Bank" value={bank.bankName} onChange={(e) => updateBank(i, "bankName", e.target.value)} placeholder="BCA" />
                <Input label="No. Rekening" value={bank.accountNumber} onChange={(e) => updateBank(i, "accountNumber", e.target.value)} />
                <Input label="Atas Nama" value={bank.accountHolder} onChange={(e) => updateBank(i, "accountHolder", e.target.value)} />
                <Button variant="danger" onClick={() => removeBank(i)} className="!py-2.5">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>

        {message && (
          <p className={`text-sm ${message.includes("berhasil") ? "text-green-600" : "text-red-600"}`}>{message}</p>
        )}

        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>
    </div>
  );
}
