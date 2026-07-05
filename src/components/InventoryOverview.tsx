"use client";

import { useEffect, useState } from "react";
import {
  Package, Warehouse, DoorOpen, Users, Wrench, ClipboardCheck,
  ArrowRight, ShoppingCart, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { PageHeader, Card, CardHeader, CardBody, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface InventoryStats {
  totalRooms: number;
  totalAssets: number;
  damagedAssets: number;
  maintenanceOpen: number;
  assetValue: number;
}

const FLOW_STEPS = [
  { label: "Pembelian Barang", href: "/inventaris/pembelian", icon: ShoppingCart },
  { label: "Barang Masuk Gudang", href: "/inventaris/gudang", icon: Warehouse },
  { label: "Penempatan ke Kamar", href: "/inventaris/kamar", icon: DoorOpen },
  { label: "Check-In Penyewa", href: "/penghuni/aktif", icon: Users },
  { label: "Penggunaan Barang", href: "/inventaris/kamar", icon: Package },
  { label: "Maintenance", href: "/inventaris/maintenance", icon: Wrench },
  { label: "Check-Out Penyewa", href: "/penghuni/selesai", icon: Users },
  { label: "Inspeksi Barang", href: "/inventaris/inspeksi", icon: ClipboardCheck },
  { label: "Potong Deposit", href: "/inventaris/inspeksi", icon: AlertTriangle },
  { label: "Barang Kembali Aktif", href: "/inventaris/kamar", icon: Package },
];

export default function InventoryOverview() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Inventaris Kosan"
        description="Kelola aset barang dari pembelian hingga inspeksi checkout"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard title="Total Kamar" value={stats?.totalRooms || 0} icon={DoorOpen} color="teal" />
        <StatCard title="Total Asset" value={stats?.totalAssets || 0} icon={Package} color="blue" />
        <StatCard title="Barang Rusak" value={stats?.damagedAssets || 0} icon={AlertTriangle} color="red" />
        <StatCard title="Maintenance Open" value={stats?.maintenanceOpen || 0} icon={Wrench} color="amber" />
        <StatCard title="Nilai Asset" value={formatCurrency(stats?.assetValue || 0)} icon={ShoppingCart} color="purple" />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <h3 className="font-semibold text-slate-900">Ringkasan Inventaris</h3>
        </CardHeader>
        <CardBody>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 text-slate-600 font-medium">Total Kamar</td>
                <td className="py-3 text-right font-bold text-slate-900">{stats?.totalRooms || 0}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 text-slate-600 font-medium">Total Asset</td>
                <td className="py-3 text-right font-bold text-slate-900">{stats?.totalAssets || 0}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 text-slate-600 font-medium">Barang Rusak</td>
                <td className="py-3 text-right font-bold text-red-600">{stats?.damagedAssets || 0}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 text-slate-600 font-medium">Maintenance Open</td>
                <td className="py-3 text-right font-bold text-amber-600">{stats?.maintenanceOpen || 0}</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-600 font-medium">Nilai Asset</td>
                <td className="py-3 text-right font-bold text-teal-600">{formatCurrency(stats?.assetValue || 0)}</td>
              </tr>
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">Alur Inventaris</h3>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <Link
                  href={step.href}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-teal-50 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors text-sm"
                >
                  <step.icon className="w-4 h-4 text-teal-600" />
                  <span className="text-slate-700 font-medium">{step.label}</span>
                </Link>
                {i < FLOW_STEPS.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
