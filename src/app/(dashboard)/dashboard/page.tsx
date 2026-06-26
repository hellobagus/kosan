"use client";

import { useEffect, useState } from "react";
import {
  DoorOpen,
  Users,
  Wallet,
  TrendingUp,
  Building,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { StatCard, Card, CardHeader, CardBody, Badge, PageHeader } from "@/components/ui";
import { formatCurrency, formatShortDate } from "@/lib/utils";

interface DashboardData {
  stats: {
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    activeTenants: number;
    monthlyIncome: number;
    monthlyExpense: number;
    yearlyIncome: number;
    occupancyRate: number;
  };
  recentTenants: Array<{
    id: number;
    checkIn: string;
    user: { name: string };
    room: { roomNumber: string };
  }>;
  recentFinances: Array<{
    id: number;
    type: string;
    amount: string;
    description: string;
    transactionDate: string;
    tenant?: { user: { name: string } };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  const stats = data?.stats;
  const netMonthly = (stats?.monthlyIncome || 0) - (stats?.monthlyExpense || 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Ringkasan kosan — ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Kamar"
          value={stats?.totalRooms || 0}
          icon={DoorOpen}
          trend={`${stats?.occupancyRate || 0}% terisi`}
          color="teal"
        />
        <StatCard
          title="Kamar Terisi"
          value={stats?.occupiedRooms || 0}
          icon={Building}
          trend={`${stats?.availableRooms || 0} kamar kosong`}
          color="blue"
        />
        <StatCard
          title="Penghuni Aktif"
          value={stats?.activeTenants || 0}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Pemasukan Bulan Ini"
          value={formatCurrency(stats?.monthlyIncome || 0)}
          icon={Wallet}
          trend={`Net: ${formatCurrency(netMonthly)}`}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Ringkasan Keuangan</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm font-medium">Pemasukan Bulan Ini</span>
                </div>
                <p className="text-xl font-bold text-emerald-700">
                  {formatCurrency(stats?.monthlyIncome || 0)}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="text-sm font-medium">Pengeluaran Bulan Ini</span>
                </div>
                <p className="text-xl font-bold text-red-700">
                  {formatCurrency(stats?.monthlyExpense || 0)}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Pemasukan Tahun Ini</span>
                </div>
                <p className="text-xl font-bold text-blue-700">
                  {formatCurrency(stats?.yearlyIncome || 0)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Tingkat Hunian</h3>
          </CardHeader>
          <CardBody className="flex flex-col items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#0d9488"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(stats?.occupancyRate || 0) * 3.52} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{stats?.occupancyRate || 0}%</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              {stats?.occupiedRooms} dari {stats?.totalRooms} kamar terisi
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Penghuni Terbaru</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {data?.recentTenants?.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Belum ada penghuni</p>
            )}
            {data?.recentTenants?.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{t.user.name}</p>
                  <p className="text-sm text-slate-500">Kamar {t.room.roomNumber}</p>
                </div>
                <div className="text-right">
                  <Badge variant="success">Aktif</Badge>
                  <p className="text-xs text-slate-400 mt-1">{formatShortDate(t.checkIn)}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Transaksi Terbaru</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {data?.recentFinances?.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Belum ada transaksi</p>
            )}
            {data?.recentFinances?.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{f.description}</p>
                  <p className="text-sm text-slate-500">
                    {f.tenant?.user?.name || "Umum"} &middot; {formatShortDate(f.transactionDate)}
                  </p>
                </div>
                <p className={`font-semibold ${f.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                  {f.type === "INCOME" ? "+" : "-"}{formatCurrency(f.amount)}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
