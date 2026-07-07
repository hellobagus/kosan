"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { formatShortDate } from "@/lib/utils";

type ProfileData = {
  user: {
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    gender?: string | null;
    ktp?: string | null;
    occupation?: string | null;
  };
  tenancy: {
    roomNumber: string;
    floor: number;
    checkIn: string;
    dueDate?: string | null;
    leaseDuration?: string | null;
    status: string;
    projectName?: string;
  };
};

export default function TenantProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);

  useEffect(() => {
    fetch("/api/portal/me").then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>;
  }

  return (
    <div>
      <PageHeader title="Profil Saya" description="Informasi akun dan sewa Anda." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody className="space-y-3 text-sm">
            <h3 className="font-semibold text-slate-900">Data Pribadi</h3>
            <Row label="Nama" value={data.user.name} />
            <Row label="Email" value={data.user.email} />
            <Row label="Telepon" value={data.user.phone || "—"} />
            <Row label="Alamat" value={data.user.address || "—"} />
            <Row label="Gender" value={data.user.gender || "—"} />
            <Row label="KTP" value={data.user.ktp || "—"} />
            <Row label="Pekerjaan" value={data.user.occupation || "—"} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-3 text-sm">
            <h3 className="font-semibold text-slate-900">Informasi Sewa</h3>
            <Row label="Project" value={data.tenancy.projectName || "—"} />
            <Row label="Kamar" value={`${data.tenancy.roomNumber} (Lantai ${data.tenancy.floor})`} />
            <Row label="Status" value={data.tenancy.status} />
            <Row label="Check-in" value={formatShortDate(data.tenancy.checkIn)} />
            <Row label="Jatuh tempo" value={data.tenancy.dueDate ? formatShortDate(data.tenancy.dueDate) : "—"} />
            <Row label="Durasi sewa" value={data.tenancy.leaseDuration || "—"} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}
