"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, CardBody, Button, Input, Textarea } from "@/components/ui";
import { Save } from "lucide-react";

interface ProfileForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  managerName: string;
  contractLocation: string;
}

export default function PengaturanProfilPage() {
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    managerName: "",
    contractLocation: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const p = data.profile;
        if (p) {
          setForm({
            name: p.name || "",
            address: p.address || "",
            phone: p.phone || "",
            email: p.email || "",
            logoUrl: p.logoUrl || "",
            managerName: p.managerName || "",
            contractLocation: p.contractLocation || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "profile", ...form }),
    });
    const data = await res.json();
    setSaving(false);
    setMessage(res.ok ? "Profil kosan berhasil disimpan" : data.error || "Gagal menyimpan");
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <PageHeader
        title="Profil Kosan"
        description="Informasi dasar kosan yang ditampilkan di invoice dan halaman publik."
      />

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded text-sm ${
            message.includes("berhasil")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      <Card>
        <CardBody className="space-y-4">
          <Input
            label="Nama Kosan"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama kosan"
          />
          <Textarea
            label="Alamat"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Alamat lengkap kosan"
            rows={3}
          />
          <Input
            label="Telepon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@kosan.com"
          />
          <Input
            label="URL Logo"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            placeholder="https://..."
          />
          <Input
            label="Nama Pengurus (PIHAK PERTAMA)"
            value={form.managerName}
            onChange={(e) => setForm({ ...form, managerName: e.target.value })}
            placeholder="Contoh: Ibu Yuli"
          />
          <Input
            label="Lokasi Penandatanganan Kontrak"
            value={form.contractLocation}
            onChange={(e) => setForm({ ...form, contractLocation: e.target.value })}
            placeholder="Contoh: Tangerang"
          />
        </CardBody>
      </Card>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Menyimpan..." : "Simpan Profil"}
        </Button>
      </div>
    </div>
  );
}
