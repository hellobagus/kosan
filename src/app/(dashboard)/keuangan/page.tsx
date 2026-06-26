"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";
import { PageHeader, Card, CardBody, Button } from "@/components/ui";
import { formatCurrency, getMonthName } from "@/lib/utils";

export default function KeuanganPage() {
  const now = new Date();
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [yearlyIncome, setYearlyIncome] = useState(0);
  const [yearlyExpense, setYearlyExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    Promise.all([
      fetch(`/api/finances?type=INCOME&month=${month}&year=${year}`).then((r) => r.json()),
      fetch(`/api/finances?type=EXPENSE&month=${month}&year=${year}`).then((r) => r.json()),
      fetch(`/api/finances?type=INCOME&year=${year}`).then((r) => r.json()),
      fetch(`/api/finances?type=EXPENSE&year=${year}`).then((r) => r.json()),
    ]).then(([mi, me, yi, ye]) => {
      setMonthlyIncome(mi.total || 0);
      setMonthlyExpense(me.total || 0);
      setYearlyIncome(yi.total || 0);
      setYearlyExpense(ye.total || 0);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  const netMonthly = monthlyIncome - monthlyExpense;
  const netYearly = yearlyIncome - yearlyExpense;

  return (
    <div>
      <PageHeader
        title="Keuangan"
        description={`Ringkasan keuangan — ${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`}
        action={
          <div className="flex gap-2">
            <Link href="/keuangan/pemasukan"><Button variant="secondary"><Plus className="w-4 h-4" /> Pemasukan</Button></Link>
            <Link href="/keuangan/pengeluaran"><Button variant="secondary"><Plus className="w-4 h-4" /> Pengeluaran</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-slate-900 mb-4">Bulan Ini</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">Pemasukan</span>
                </div>
                <span className="text-lg font-bold text-emerald-700">{formatCurrency(monthlyIncome)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Pengeluaran</span>
                </div>
                <span className="text-lg font-bold text-red-700">{formatCurrency(monthlyExpense)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-100 rounded-xl">
                <span className="text-sm font-medium text-slate-700">Saldo Bersih</span>
                <span className={`text-lg font-bold ${netMonthly >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {formatCurrency(netMonthly)}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-slate-900 mb-4">Tahun {now.getFullYear()}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">Total Pemasukan</span>
                </div>
                <span className="text-lg font-bold text-emerald-700">{formatCurrency(yearlyIncome)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Total Pengeluaran</span>
                </div>
                <span className="text-lg font-bold text-red-700">{formatCurrency(yearlyExpense)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-100 rounded-xl">
                <span className="text-sm font-medium text-slate-700">Saldo Bersih</span>
                <span className={`text-lg font-bold ${netYearly >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {formatCurrency(netYearly)}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
