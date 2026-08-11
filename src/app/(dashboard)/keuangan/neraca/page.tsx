"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader, Card, CardBody, Button, Input } from "@/components/ui";
import { formatCurrency, formatShortDate } from "@/lib/utils";

type AccRow = { id: number; code: string; name: string; balance: number };

export default function NeracaPage() {
  const now = new Date();
  const [asOf, setAsOf] = useState(now.toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<AccRow[]>([]);
  const [liabilities, setLiabilities] = useState<AccRow[]>([]);
  const [equity, setEquity] = useState<AccRow[]>([]);
  const [netIncomeYtd, setNetIncomeYtd] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);
  const [balanced, setBalanced] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/accounting/reports?type=neraca&asOf=${asOf}`)
      .then((r) => r.json())
      .then((d) => {
        setAssets(d.assets || []);
        setLiabilities(d.liabilities || []);
        setEquity(d.equity || []);
        setNetIncomeYtd(d.netIncomeYtd || 0);
        setTotalAssets(d.totalAssets || 0);
        setTotalLiabilities(d.totalLiabilities || 0);
        setTotalEquity(d.totalEquity || 0);
        setBalanced(Boolean(d.balanced));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const Section = ({
    title,
    rows,
    extra,
    total,
    totalLabel,
  }: {
    title: string;
    rows: AccRow[];
    extra?: React.ReactNode;
    total: number;
    totalLabel: string;
  }) => (
    <Card>
      <CardBody>
        <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="space-y-2">
          {rows
            .filter((r) => Math.abs(r.balance) > 0.009)
            .map((r) => (
              <div key={r.id} className="flex justify-between text-sm">
                <span>
                  <span className="font-mono text-slate-400 mr-2">{r.code}</span>
                  {r.name}
                </span>
                <span className="font-medium">{formatCurrency(r.balance)}</span>
              </div>
            ))}
          {extra}
          <div className="flex justify-between pt-3 border-t font-semibold">
            <span>{totalLabel}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Neraca"
        description={`Posisi keuangan per ${formatShortDate(asOf)}`}
        action={
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Cetak
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <Input
          label="Per tanggal"
          type="date"
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
        />
        <Button onClick={load} disabled={loading}>
          {loading ? "Memuat..." : "Tampilkan"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Aset" rows={assets} total={totalAssets} totalLabel="Total Aset" />
        <div className="space-y-6">
          <Section
            title="Kewajiban"
            rows={liabilities}
            total={totalLiabilities}
            totalLabel="Total Kewajiban"
          />
          <Section
            title="Ekuitas"
            rows={equity}
            extra={
              Math.abs(netIncomeYtd) > 0.009 ? (
                <div className="flex justify-between text-sm">
                  <span>Laba/(Rugi) Tahun Berjalan</span>
                  <span className="font-medium">{formatCurrency(netIncomeYtd)}</span>
                </div>
              ) : null
            }
            total={totalEquity}
            totalLabel="Total Ekuitas"
          />
          <Card>
            <CardBody>
              <div className="flex justify-between font-semibold">
                <span>Total Kewajiban + Ekuitas</span>
                <span>{formatCurrency(totalLiabilities + totalEquity)}</span>
              </div>
              <p className={`text-sm mt-2 ${balanced ? "text-emerald-700" : "text-red-600"}`}>
                {balanced
                  ? "Neraca balance (Aset = Kewajiban + Ekuitas)."
                  : "Neraca belum balance — periksa jurnal atau modal awal."}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
