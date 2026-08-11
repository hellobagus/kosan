"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, CardBody, Table, Th, Td, Select } from "@/components/ui";
import { AccountingPeriodBar } from "@/components/accounting/AccountingPeriodBar";
import { formatCurrency, formatShortDate } from "@/lib/utils";

type Account = { id: number; code: string; name: string };
type Movement = {
  id: number;
  entryDate: string;
  entryNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export default function BukuBesarPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    account: Account & { normalBalance?: string };
    openingBalance: number;
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
    movements: Movement[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/accounting/accounts")
      .then((r) => r.json())
      .then((d) => {
        const list = d.accounts || [];
        setAccounts(list);
        if (list.length && !accountId) setAccountId(String(list[0].id));
      });
  }, []);

  const load = () => {
    if (!accountId) return;
    setLoading(true);
    fetch(`/api/accounting/ledger?accountId=${accountId}&month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setData(null);
          alert(d.error);
        } else {
          setData(d);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (accountId) load();
  }, [accountId]);

  return (
    <div>
      <PageHeader
        title="Buku Besar"
        description="Mutasi dan saldo per akun"
      />

      <AccountingPeriodBar
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onRefresh={load}
        loading={loading}
        extra={
          <Select
            label="Akun"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </Select>
        }
      />

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardBody>
                <div className="text-xs text-slate-500">Saldo Awal</div>
                <div className="text-lg font-semibold">{formatCurrency(data.openingBalance)}</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-xs text-slate-500">Total Debit</div>
                <div className="text-lg font-semibold text-emerald-700">
                  {formatCurrency(data.totalDebit)}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-xs text-slate-500">Total Kredit</div>
                <div className="text-lg font-semibold text-red-700">
                  {formatCurrency(data.totalCredit)}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-xs text-slate-500">Saldo Akhir</div>
                <div className="text-lg font-semibold">{formatCurrency(data.closingBalance)}</div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody className="p-0">
              <Table>
                <thead>
                  <tr>
                    <Th>Tanggal</Th>
                    <Th>No. Jurnal</Th>
                    <Th>Keterangan</Th>
                    <Th className="text-right">Debit</Th>
                    <Th className="text-right">Kredit</Th>
                    <Th className="text-right">Saldo</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-50">
                    <Td colSpan={3} className="font-medium">
                      Saldo awal
                    </Td>
                    <Td></Td>
                    <Td></Td>
                    <Td className="text-right font-medium">
                      {formatCurrency(data.openingBalance)}
                    </Td>
                  </tr>
                  {data.movements.map((m) => (
                    <tr key={m.id}>
                      <Td>{formatShortDate(m.entryDate)}</Td>
                      <Td className="font-mono text-sm">{m.entryNumber}</Td>
                      <Td>{m.description}</Td>
                      <Td className="text-right">
                        {m.debit > 0 ? formatCurrency(m.debit) : "—"}
                      </Td>
                      <Td className="text-right">
                        {m.credit > 0 ? formatCurrency(m.credit) : "—"}
                      </Td>
                      <Td className="text-right font-medium">{formatCurrency(m.balance)}</Td>
                    </tr>
                  ))}
                  {data.movements.length === 0 && (
                    <tr>
                      <Td colSpan={6} className="text-center text-slate-500 py-8">
                        Tidak ada mutasi di periode ini
                      </Td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
