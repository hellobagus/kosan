"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader, Card, CardBody, Button } from "@/components/ui";
import { AccountingPeriodBar } from "@/components/accounting/AccountingPeriodBar";
import { formatCurrency, getMonthName } from "@/lib/utils";

type AccRow = { id: number; code: string; name: string; balance: number };

export default function LabaRugiPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [revenues, setRevenues] = useState<AccRow[]>([]);
  const [expenses, setExpenses] = useState<AccRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [netIncome, setNetIncome] = useState(0);

  const load = () => {
    setLoading(true);
    fetch(`/api/accounting/reports?type=laba-rugi&month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        setRevenues(d.revenues || []);
        setExpenses(d.expenses || []);
        setTotalRevenue(d.totalRevenue || 0);
        setTotalExpense(d.totalExpense || 0);
        setNetIncome(d.netIncome || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Laporan Laba Rugi"
        description={`Pendapatan dan beban — ${getMonthName(parseInt(month))} ${year}`}
        action={
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Cetak
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-slate-900 mb-4">Pendapatan</h3>
            <div className="space-y-2">
              {revenues
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
              <div className="flex justify-between pt-3 border-t font-semibold">
                <span>Total Pendapatan</span>
                <span className="text-emerald-700">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-slate-900 mb-4">Beban</h3>
            <div className="space-y-2">
              {expenses
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
              <div className="flex justify-between pt-3 border-t font-semibold">
                <span>Total Beban</span>
                <span className="text-red-700">{formatCurrency(totalExpense)}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Laba / (Rugi) Bersih</div>
              <div
                className={`text-2xl font-bold ${netIncome >= 0 ? "text-emerald-700" : "text-red-700"}`}
              >
                {formatCurrency(netIncome)}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
