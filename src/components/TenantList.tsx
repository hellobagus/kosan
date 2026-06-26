"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, UserCheck } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState, Button,
} from "@/components/ui";
import { formatCurrency, formatShortDate } from "@/lib/utils";

interface Tenant {
  id: number;
  checkIn: string;
  checkOut: string | null;
  monthlyRent: string;
  deposit: string;
  status: string;
  user: { name: string; email: string; phone: string | null };
  room: { roomNumber: string };
}

export default function TenantListPage({
  title,
  description,
  status,
  showAdd = false,
  showCheckout = false,
}: {
  title: string;
  description: string;
  status: string;
  showAdd?: boolean;
  showCheckout?: boolean;
}) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = () => {
    fetch(`/api/tenants?status=${status}`)
      .then((res) => res.json())
      .then(setTenants)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, [status]);

  const handleCheckout = async (id: number) => {
    if (!confirm("Yakin ingin menyelesaikan sewa penghuni ini?")) return;
    await fetch("/api/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "COMPLETED", checkOut: new Date().toISOString() }),
    });
    fetchTenants();
  };

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
        title={title}
        description={description}
        action={
          showAdd ? (
            <Link href="/penghuni/baru">
              <Button><Plus className="w-4 h-4" /> Tambah Penghuni</Button>
            </Link>
          ) : undefined
        }
      />

      <Card>
        <CardBody className="p-0">
          {tenants.length === 0 ? (
            <EmptyState message="Belum ada data penghuni" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Nama</Th>
                  <Th>Kamar</Th>
                  <Th>Kontak</Th>
                  <Th>Sewa/Bulan</Th>
                  <Th>Masuk</Th>
                  {status === "COMPLETED" && <Th>Keluar</Th>}
                  <Th>Status</Th>
                  {showCheckout && <Th>Aksi</Th>}
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <Td><span className="font-semibold">{t.user.name}</span></Td>
                    <Td>{t.room.roomNumber}</Td>
                    <Td>
                      <div className="text-xs">
                        <p>{t.user.email}</p>
                        <p className="text-slate-400">{t.user.phone || "-"}</p>
                      </div>
                    </Td>
                    <Td>{formatCurrency(t.monthlyRent)}</Td>
                    <Td>{formatShortDate(t.checkIn)}</Td>
                    {status === "COMPLETED" && <Td>{t.checkOut ? formatShortDate(t.checkOut) : "-"}</Td>}
                    <Td>
                      <Badge variant={t.status === "ACTIVE" ? "success" : "default"}>
                        {t.status === "ACTIVE" ? "Aktif" : "Selesai"}
                      </Badge>
                    </Td>
                    {showCheckout && (
                      <Td>
                        <Button variant="ghost" className="!px-2 !py-1.5 text-xs" onClick={() => handleCheckout(t.id)}>
                          <UserCheck className="w-4 h-4" /> Selesai
                        </Button>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
