"use client";

import { useEffect, useState } from "react";
import { useProjectRefreshKey } from "@/hooks/useProjectRefresh";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState, Button,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

interface Room {
  id: number;
  roomNumber: string;
  floor: number;
  price: string;
  facilities: string | null;
  status: string;
  tenants: Array<{ user: { name: string } }>;
}

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
  AVAILABLE: { label: "Kosong", variant: "success" },
  OCCUPIED: { label: "Terisi", variant: "info" },
  MAINTENANCE: { label: "Perbaikan", variant: "warning" },
};

export default function RoomListPage({
  title,
  description,
  filter,
  showAdd = true,
}: {
  title: string;
  description: string;
  filter?: string;
  showAdd?: boolean;
}) {
  const refreshKey = useProjectRefreshKey();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = filter ? `/api/rooms?status=${filter}` : "/api/rooms";
    fetch(url)
      .then((res) => res.json())
      .then(setRooms)
      .finally(() => setLoading(false));
  }, [filter, refreshKey]);

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
            <Link href="/kamar/baru">
              <Button><Plus className="w-4 h-4" /> Tambah Kamar</Button>
            </Link>
          ) : undefined
        }
      />

      <Card>
        <CardBody className="p-0">
          {rooms.length === 0 ? (
            <EmptyState message="Belum ada data kamar" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>No. Kamar</Th>
                  <Th>Lantai</Th>
                  <Th>Harga/Bulan</Th>
                  <Th>Fasilitas</Th>
                  <Th>Status</Th>
                  <Th>Penghuni</Th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const st = statusMap[room.status] || statusMap.AVAILABLE;
                  return (
                    <tr key={room.id} className="hover:bg-slate-50">
                      <Td><span className="font-semibold text-slate-900">{room.roomNumber}</span></Td>
                      <Td>Lantai {room.floor}</Td>
                      <Td>{formatCurrency(room.price)}</Td>
                      <Td><span className="text-slate-500 text-xs">{room.facilities || "-"}</span></Td>
                      <Td><Badge variant={st.variant}>{st.label}</Badge></Td>
                      <Td>{room.tenants[0]?.user.name || "-"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
