"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader, Card, CardBody, Table, Th, Td, Button } from "@/components/ui";
import { AccountingPeriodBar } from "@/components/accounting/AccountingPeriodBar";
import { accountTypeLabel } from "@/lib/chart-of-accounts";
import { formatCurrency, getMonthName } from "@/lib/utils";

type Row = {
  id: number;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  totalDebit: number;
  totalCredit: number;
  balance: number;
};

export default function NeracaSaldoPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [balanced, setBalanced] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/accounting/reports?type=trial-balance&month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows || []);
        setTotalDebit(d.totalDebit || 0);
        setTotalCredit(d.totalCredit || 0);
        setBalanced(Boolean(d.balanced));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Neraca Saldo"
        description={`Trial balance — ${getMonthName(parseInt(month))} ${year}`}
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

      <Card>
        <CardBody className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Kode</Th>
                <Th>Nama Akun</Th>
                <Th>Tipe</Th>
                <Th className="text-right">Debit</Th>
                <Th className="text-right">Kredit</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="font-mono">{r.code}</Td>
                  <Td>{r.name}</Td>
                  <Td>{accountTypeLabel(r.type)}</Td>
                  <Td className="text-right">
                    {r.totalDebit > 0 ? formatCurrency(r.totalDebit) : "—"}
                  </Td>
                  <Td className="text-right">
                    {r.totalCredit > 0 ? formatCurrency(r.totalCredit) : "—"}
                  </Td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <Td colSpan={3}>Total</Td>
                <Td className="text-right">{formatCurrency(totalDebit)}</Td>
                <Td className="text-right">{formatCurrency(totalCredit)}</Td>
              </tr>
            </tbody>
          </Table>
          <div className={`px-6 py-3 text-sm ${balanced ? "text-emerald-700" : "text-red-600"}`}>
            {balanced ? "Neraca saldo balance." : "Neraca saldo tidak balance — periksa jurnal."}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
