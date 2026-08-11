"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, CardBody, Button, Select, Badge, Table, Th, Td } from "@/components/ui";
import { getMonthName } from "@/lib/utils";

type Period = {
  id: number;
  year: number;
  month: number;
  status: "OPEN" | "CLOSED";
  closedAt: string | null;
  closedByName: string | null;
};

export default function PeriodeAkuntansiPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [periods, setPeriods] = useState<Period[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch("/api/accounting/periods")
      .then((r) => r.json())
      .then((d) => setPeriods(d.periods || []));
  };

  useEffect(() => {
    load();
  }, []);

  const post = async (action: string) => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/accounting/periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        year: parseInt(year),
        month: parseInt(month),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Gagal");
      return;
    }
    if (action === "backfill") {
      setMessage(`Backfill selesai: ${data.posted} diposting, ${data.skipped} dilewati dari ${data.total} transaksi.`);
    } else if (action === "ensure-coa") {
      setMessage("Bagan akun siap.");
    } else {
      setMessage(`Periode ${month}/${year} berhasil di${action === "close" ? "tutup" : "buka kembali"}.`);
    }
    load();
  };

  const years = Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - i));

  return (
    <div>
      <PageHeader
        title="Periode & Setup Akuntansi"
        description="Tutup buku bulanan, sinkronisasi bagan akun, dan backfill jurnal dari buku kas lama"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-semibold">Tutup / Buka Periode</h3>
            <div className="flex flex-wrap gap-3">
              <Select label="Bulan" value={month} onChange={(e) => setMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </Select>
              <Select label="Tahun" value={year} onChange={(e) => setYear(e.target.value)}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => post("close")} disabled={loading}>
                Tutup Periode
              </Button>
              <Button variant="secondary" onClick={() => post("reopen")} disabled={loading}>
                Buka Kembali
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-semibold">Setup & Migrasi</h3>
            <p className="text-sm text-slate-600">
              Pastikan bagan akun tersedia, lalu buat jurnal otomatis dari transaksi buku kas yang belum terjurnal.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => post("ensure-coa")} disabled={loading}>
                Pastikan Bagan Akun
              </Button>
              <Button onClick={() => post("backfill")} disabled={loading}>
                Backfill Jurnal dari Buku Kas
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-lg bg-teal-50 text-teal-800 text-sm">{message}</div>
      )}

      <Card>
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Periode</Th>
                <Th>Status</Th>
                <Th>Ditutup</Th>
                <Th>Oleh</Th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <Td>
                    {getMonthName(p.month)} {p.year}
                  </Td>
                  <Td>
                    <Badge variant={p.status === "CLOSED" ? "danger" : "success"}>
                      {p.status === "CLOSED" ? "Ditutup" : "Terbuka"}
                    </Badge>
                  </Td>
                  <Td>{p.closedAt ? new Date(p.closedAt).toLocaleString("id-ID") : "—"}</Td>
                  <Td>{p.closedByName || "—"}</Td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr>
                  <Td colSpan={4} className="text-center text-slate-500 py-8">
                    Belum ada periode yang ditutup
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
