"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, CardBody, Input, Select, Textarea, Button } from "@/components/ui";

export default function TambahKamarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    roomNumber: "",
    floor: "1",
    price: "",
    dailyPrice: "",
    facilities: "",
    equipment: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push("/kamar");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Input Kamar Baru"
        description="Tambahkan kamar baru ke dalam sistem"
      />

      <Card className="max-w-2xl">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Nomor Kamar"
                placeholder="Contoh: 01, A1"
                value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                required
              />
              <Select
                label="Lantai"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
              >
                {[1, 2, 3, 4, 5].map((f) => (
                  <option key={f} value={f}>Lantai {f}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Harga Sewa Bulanan (Rp)"
                type="number"
                placeholder="900000"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
              <Input
                label="Harga Sewa Harian (Rp)"
                type="number"
                placeholder="100000"
                value={form.dailyPrice}
                onChange={(e) => setForm({ ...form, dailyPrice: e.target.value })}
              />
            </div>

            <Textarea
              label="Fasilitas Kamar"
              rows={4}
              placeholder={"Kasur 120x200\nAlmari\nMeja kursi\nKamar mandi dalam\nKipas angin"}
              value={form.facilities}
              onChange={(e) => setForm({ ...form, facilities: e.target.value })}
            />

            <Textarea
              label="Kelengkapan Kamar Lainnya"
              rows={2}
              placeholder="Kunci kamar"
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
            />

            <Textarea
              label="Catatan Kamar"
              rows={2}
              placeholder="Catatan khusus (hanya untuk pemilik & pengelola)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan Kamar"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Batal
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
