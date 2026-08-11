"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProjectRefreshKey } from "@/hooks/useProjectRefresh";
import { Printer, Download } from "lucide-react";
import { PageHeader, Card, CardBody, Table, Th, Td, Select, Button } from "@/components/ui";
import { formatCurrency, formatShortDate, getMonthName } from "@/lib/utils";

interface ReportData {
  rooms: { total: number; occupied: number; available: number };
  tenants: { active: number; completed: number };
  finances: {
    income: number;
    expense: number;
    net: number;
    transactions: Array<{
      id: number;
      type: string;
      amount: string;
      description: string;
      category: string | null;
      transactionDate: string;
    }>;
  };
}

export default function LaporanPage() {
  const now = new Date();
  const [reportType, setReportType] = useState("monthly");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const [roomsRes, activeTenants, completedTenants] = await Promise.all([
        fetch("/api/rooms").then((r) => r.json()),
        fetch("/api/tenants?status=ACTIVE").then((r) => r.json()),
        fetch("/api/tenants?status=COMPLETED").then((r) => r.json()),
      ]);

      let incomeUrl = `/api/finances?type=INCOME&year=${year}`;
      let expenseUrl = `/api/finances?type=EXPENSE&year=${year}`;

      if (reportType === "monthly") {
        incomeUrl = `/api/finances?type=INCOME&month=${month}&year=${year}`;
        expenseUrl = `/api/finances?type=EXPENSE&month=${month}&year=${year}`;
      } else if (reportType === "date" && startDate && endDate) {
        incomeUrl = `/api/finances?type=INCOME&startDate=${startDate}&endDate=${endDate}`;
        expenseUrl = `/api/finances?type=EXPENSE&startDate=${startDate}&endDate=${endDate}`;
      }

      const [incomeData, expenseData] = await Promise.all([
        fetch(incomeUrl).then((r) => r.json()),
        fetch(expenseUrl).then((r) => r.json()),
      ]);

      const allTransactions = [
        ...(incomeData.finances || []),
        ...(expenseData.finances || []),
      ].sort((a: { transactionDate: string }, b: { transactionDate: string }) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );

      setData({
        rooms: {
          total: roomsRes.length,
          occupied: roomsRes.filter((r: { status: string }) => r.status === "OCCUPIED").length,
          available: roomsRes.filter((r: { status: string }) => r.status === "AVAILABLE").length,
        },
        tenants: {
          active: activeTenants.length,
          completed: completedTenants.length,
        },
        finances: {
          income: incomeData.total || 0,
          expense: expenseData.total || 0,
          net: (incomeData.total || 0) - (expenseData.total || 0),
          transactions: allTransactions,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshKey = useProjectRefreshKey();

  useEffect(() => { generateReport(); }, [refreshKey]);

  const handlePrint = () => window.print();

  const periodLabel = () => {
    if (reportType === "yearly") return `Tahun ${year}`;
    if (reportType === "date" && startDate && endDate) return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
    return `${getMonthName(parseInt(month))} ${year}`;
  };

  return (
    <div>
      <PageHeader
        title="Cetak Laporan"
        description="Generate dan cetak laporan kosan"
        action={
          <div className="flex gap-2 no-print">
            <Button onClick={generateReport} disabled={loading}>
              <Download className="w-4 h-4" /> Generate
            </Button>
            <Button onClick={handlePrint} disabled={!data}>
              <Printer className="w-4 h-4" /> Cetak
            </Button>
          </div>
        }
      />

      <Card className="mb-6 no-print">
        <CardBody>
          <h3 className="font-semibold text-slate-900 mb-3">Laporan Akuntansi</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/keuangan/neraca-saldo", label: "Neraca Saldo" },
              { href: "/keuangan/laba-rugi", label: "Laba Rugi" },
              { href: "/keuangan/neraca", label: "Neraca" },
              { href: "/keuangan/jurnal", label: "Jurnal Umum" },
              { href: "/keuangan/buku-besar", label: "Buku Besar" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-sm font-medium text-slate-700"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6 no-print">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <Select label="Jenis Laporan" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
              <option value="date">Berdasarkan Tanggal</option>
            </Select>
            {reportType === "monthly" && (
              <>
                <Select label="Bulan" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                  ))}
                </Select>
                <Select label="Tahun" value={year} onChange={(e) => setYear(e.target.value)}>
                  {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Select>
              </>
            )}
            {reportType === "yearly" && (
              <Select label="Tahun" value={year} onChange={(e) => setYear(e.target.value)}>
                {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            )}
            {reportType === "date" && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Dari</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Sampai</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm" />
                </div>
              </>
            )}
            <Button onClick={generateReport} disabled={loading}>
              {loading ? "Memuat..." : "Tampilkan"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {data && (
        <div id="report-content" className="space-y-6">
          <div className="text-center mb-8 print:block">
            <h2 className="text-2xl font-bold text-slate-900">Laporan KosanKu</h2>
            <p className="text-slate-500">Periode: {periodLabel()}</p>
            <p className="text-xs text-slate-400">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardBody className="text-center"><p className="text-sm text-slate-500">Total Kamar</p><p className="text-2xl font-bold">{data.rooms.total}</p></CardBody></Card>
            <Card><CardBody className="text-center"><p className="text-sm text-slate-500">Terisi</p><p className="text-2xl font-bold text-blue-600">{data.rooms.occupied}</p></CardBody></Card>
            <Card><CardBody className="text-center"><p className="text-sm text-slate-500">Kosong</p><p className="text-2xl font-bold text-emerald-600">{data.rooms.available}</p></CardBody></Card>
            <Card><CardBody className="text-center"><p className="text-sm text-slate-500">Penghuni Aktif</p><p className="text-2xl font-bold text-purple-600">{data.tenants.active}</p></CardBody></Card>
          </div>

          <Card>
            <CardBody>
              <h3 className="font-semibold text-slate-900 mb-4">Ringkasan Keuangan</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-600">Pemasukan</p>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(data.finances.income)}</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">Pengeluaran</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(data.finances.expense)}</p>
                </div>
                <div className="text-center p-4 bg-slate-100 rounded-lg">
                  <p className="text-sm text-slate-600">Saldo Bersih</p>
                  <p className={`text-xl font-bold ${data.finances.net >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatCurrency(data.finances.net)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-0">
              <div className="px-6 py-4 border-b"><h3 className="font-semibold">Detail Transaksi</h3></div>
              <Table>
                <thead>
                  <tr>
                    <Th>Tanggal</Th>
                    <Th>Keterangan</Th>
                    <Th>Kategori</Th>
                    <Th>Tipe</Th>
                    <Th>Jumlah</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.finances.transactions.map((t) => (
                    <tr key={t.id}>
                      <Td>{formatShortDate(t.transactionDate)}</Td>
                      <Td>{t.description}</Td>
                      <Td>{t.category || "-"}</Td>
                      <Td>{t.type === "INCOME" ? "Masuk" : "Keluar"}</Td>
                      <Td className={t.type === "INCOME" ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                        {formatCurrency(t.amount)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
