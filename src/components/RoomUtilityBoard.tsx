"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Link2 } from "lucide-react";
import {
  PageHeader, Card, CardBody, Table, Th, Td, Badge, EmptyState,
  Input, Select, Button,
} from "@/components/ui";
import { formatUtilityRate, UTILITY_TYPE_LABELS } from "@/lib/utility-service";

interface Room {
  id: number;
  roomNumber: string;
  floor: number;
  status: string;
}

interface Utility {
  id: number;
  utilityName: string;
  utilityType: string;
  billingMethod: "METER" | "LUMPSUM";
  amount: string;
  unitLabel: string | null;
  active: boolean;
}

interface RoomUtility {
  id: number;
  roomId: number;
  utilityId: number;
  lastReading: string | null;
  customAmount: string | null;
  active: boolean;
  room: Room;
  utility: Utility;
}

export default function RoomUtilityBoard() {
  const [roomUtilities, setRoomUtilities] = useState<RoomUtility[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ roomId: "", utilityId: "", customAmount: "", lastReading: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/room-utilities").then((r) => r.json()),
      fetch("/api/rooms").then((r) => r.json()),
      fetch("/api/utilities").then((r) => r.json()),
    ]).then(([ru, rm, ut]) => {
      setRoomUtilities(ru);
      setRooms(rm);
      setUtilities(ut.filter((u: Utility) => u.active));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const selectedUtility = utilities.find((u) => u.id === parseInt(form.utilityId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/room-utilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan");
      setSubmitting(false);
      return;
    }
    setShowForm(false);
    setForm({ roomId: "", utilityId: "", customAmount: "", lastReading: "" });
    fetchData();
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus utility dari kamar ini?")) return;
    await fetch(`/api/room-utilities?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const grouped = rooms.map((room) => ({
    room,
    items: roomUtilities.filter((ru) => ru.roomId === room.id),
  })).filter((g) => g.items.length > 0 || showForm);

  return (
    <div>
      <PageHeader
        title="Utility per Kamar"
        description="Pasang utility ke setiap kamar. Semua tagihan melekat pada kamar/unit."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" /> Pasang Utility
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Pasang Utility ke Kamar
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Kamar"
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                required
              >
                <option value="">Pilih kamar...</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Lantai {r.floor} — Kamar {r.roomNumber}
                  </option>
                ))}
              </Select>
              <Select
                label="Utility"
                value={form.utilityId}
                onChange={(e) => setForm({ ...form, utilityId: e.target.value })}
                required
              >
                <option value="">Pilih utility...</option>
                {utilities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.utilityName} ({UTILITY_TYPE_LABELS[u.utilityType as keyof typeof UTILITY_TYPE_LABELS]})
                  </option>
                ))}
              </Select>
              <Input
                label="Tarif Khusus (opsional, override tarif default)"
                type="number"
                min="0"
                value={form.customAmount}
                onChange={(e) => setForm({ ...form, customAmount: e.target.value })}
                placeholder="Kosongkan untuk pakai tarif default"
              />
              {selectedUtility?.billingMethod === "METER" && (
                <Input
                  label={`Angka Meter Awal (${selectedUtility.unitLabel || "unit"})`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.lastReading}
                  onChange={(e) => setForm({ ...form, lastReading: e.target.value })}
                  placeholder="Contoh: 1250.5"
                />
              )}
              {error && <p className="text-red-500 text-sm md:col-span-2">{error}</p>}
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Pasang"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : roomUtilities.length === 0 ? (
        <Card><CardBody><EmptyState message="Belum ada utility terpasang di kamar manapun." /></CardBody></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ room, items }) => (
            <Card key={room.id}>
              <CardBody className="p-0">
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    Kamar {room.roomNumber} <span className="text-slate-400 font-normal">— Lantai {room.floor}</span>
                  </h3>
                  <Badge variant={room.status === "OCCUPIED" ? "success" : "default"}>
                    {room.status === "OCCUPIED" ? "Terisi" : room.status === "AVAILABLE" ? "Kosong" : "Maintenance"}
                  </Badge>
                </div>
                <Table>
                  <thead>
                    <tr>
                      <Th>Utility</Th>
                      <Th>Tipe</Th>
                      <Th>Metode</Th>
                      <Th>Tarif</Th>
                      <Th>Meter Terakhir</Th>
                      <Th>Status</Th>
                      <Th>Aksi</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((ru) => (
                      <tr key={ru.id}>
                        <Td className="font-medium">{ru.utility.utilityName}</Td>
                        <Td>{UTILITY_TYPE_LABELS[ru.utility.utilityType as keyof typeof UTILITY_TYPE_LABELS]}</Td>
                        <Td>
                          <Badge variant={ru.utility.billingMethod === "METER" ? "info" : "warning"}>
                            {ru.utility.billingMethod === "METER" ? "Meter" : "Lump Sum"}
                          </Badge>
                        </Td>
                        <Td>
                          {formatUtilityRate(
                            ru.utility.billingMethod,
                            parseFloat(ru.customAmount || ru.utility.amount),
                            ru.utility.unitLabel
                          )}
                        </Td>
                        <Td>
                          {ru.utility.billingMethod === "METER"
                            ? (ru.lastReading ? `${ru.lastReading} ${ru.utility.unitLabel || ""}` : "-")
                            : "-"}
                        </Td>
                        <Td>
                          <Badge variant={ru.active ? "success" : "default"}>
                            {ru.active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </Td>
                        <Td>
                          <button onClick={() => handleDelete(ru.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
