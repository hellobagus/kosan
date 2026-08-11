"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BookOpen, DoorOpen, User, Wallet, Wrench } from "lucide-react";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { formatCurrency, formatShortDate } from "@/lib/utils";

type PortalHomeData = {
  user: { name: string };
  tenancy: {
    roomNumber: string;
    projectName?: string;
    paymentStatus: string;
    dueDate?: string;
    monthlyRent: string | number;
  };
};

export default function TenantPortalHomePage() {
  const [data, setData] = useState<PortalHomeData | null>(null);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        title={`Halo, ${data?.user.name || "Penghuni"}`}
        description="Portal penghuni — profil, tagihan, perbaikan unit, permohonan pindah, dan pengumuman."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Kamar Anda</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {data?.tenancy.roomNumber ? `Kamar ${data.tenancy.roomNumber}` : "—"}
            </p>
            <p className="text-sm text-slate-500 mt-1">{data?.tenancy.projectName}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Status Pembayaran</p>
            <p className="text-2xl font-bold text-teal-700 mt-1">{data?.tenancy.paymentStatus || "—"}</p>
            <p className="text-sm text-slate-500 mt-1">
              Jatuh tempo: {data?.tenancy.dueDate ? formatShortDate(data.tenancy.dueDate) : "—"}
            </p>
            <p className="text-sm font-medium text-slate-700 mt-2">
              Sewa: {formatCurrency(data?.tenancy.monthlyRent || 0)}
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {[
          { href: "/panduan", label: "Panduan Penggunaan", icon: BookOpen },
          { href: "/portal/profil", label: "Profil Saya", icon: User },
          { href: "/portal/tagihan", label: "Tagihan & Invoice", icon: Wallet },
          { href: "/portal/perbaikan", label: "Permintaan Perbaikan", icon: Wrench },
          { href: "/portal/pindah", label: "Permohonan Pindah", icon: DoorOpen },
          { href: "/portal/pengumuman", label: "Pengumuman", icon: Bell },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm transition-all"
          >
            <item.icon className="w-5 h-5 text-teal-600" />
            <span className="font-medium text-slate-800">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
