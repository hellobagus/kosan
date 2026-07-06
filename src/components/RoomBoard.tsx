"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  Building2,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button, Card, CardBody, EmptyState, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import RoomInventoryFields, {
  EMPTY_ROOM_INVENTORY,
  getRoomInventoryTexts,
  type RoomInventoryFormValue,
  type InventoryItemOption,
} from "@/components/RoomInventoryFields";

interface Room {
  id: number;
  roomNumber: string;
  floor: number;
  price: string;
  dailyPrice: string | null;
  facilities: string | null;
  equipment: string | null;
  description: string | null;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  tenants: Array<{ user: { name: string } }>;
  template?: { id: number; name: string } | null;
}

function parseList(text: string | null): string[] {
  if (!text) return [];
  return text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}

function formatPriceShort(amount: string | number | null): string {
  if (!amount) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `Rp.${num.toLocaleString("id-ID")},-`;
}

export default function RoomBoard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [floorFilter, setFloorFilter] = useState<number | "all">("all");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([]);
  const [inventory, setInventory] = useState<RoomInventoryFormValue>(EMPTY_ROOM_INVENTORY);
  const [editForm, setEditForm] = useState({
    roomNumber: "",
    floor: "1",
    price: "",
    dailyPrice: "",
    facilities: "",
    equipment: "",
    description: "",
    status: "AVAILABLE",
  });

  const fetchRooms = useCallback(() => {
    setLoading(true);
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => {
        setRooms(data);
        if (data.length > 0) {
          setSelectedId((prev) => prev ?? data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRooms();
    fetch("/api/inventory/items?locationType=ROOM")
      .then((r) => r.json())
      .then(setInventoryItems)
      .catch(() => {});
  }, [fetchRooms]);

  const floors = useMemo(
    () => [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b),
    [rooms]
  );

  const filteredRooms = useMemo(
    () =>
      floorFilter === "all"
        ? rooms
        : rooms.filter((r) => r.floor === floorFilter),
    [rooms, floorFilter]
  );

  const stats = useMemo(
    () => ({
      total: rooms.length,
      available: rooms.filter((r) => r.status === "AVAILABLE").length,
      occupied: rooms.filter((r) => r.status === "OCCUPIED").length,
    }),
    [rooms]
  );

  const selected = rooms.find((r) => r.id === selectedId) ?? filteredRooms[0] ?? null;

  useEffect(() => {
    if (filteredRooms.length > 0 && !filteredRooms.find((r) => r.id === selectedId)) {
      setSelectedId(filteredRooms[0].id);
    }
  }, [filteredRooms, selectedId]);

  const openEdit = async (room: Room) => {
    setEditForm({
      roomNumber: room.roomNumber,
      floor: String(room.floor),
      price: room.price,
      dailyPrice: room.dailyPrice || "",
      facilities: room.facilities || "",
      equipment: room.equipment || "",
      description: room.description || "",
      status: room.status,
    });

    let inv: RoomInventoryFormValue = {
      ...EMPTY_ROOM_INVENTORY,
      templateId: room.template?.id ? String(room.template.id) : "",
      customFacilities: room.facilities || "",
      customEquipment: room.equipment || "",
    };

    if (room.template?.id) {
      const templates = await fetch("/api/inventory/templates").then((r) => r.json());
      const template = templates.find((t: { id: number }) => t.id === room.template?.id);
      if (template) {
        inv = {
          ...inv,
          facilityItems: template.items
            .filter((i: { required: boolean }) => i.required)
            .map((i: { itemId: number; quantity: number }) => ({ itemId: i.itemId, quantity: i.quantity })),
          equipmentItems: template.items
            .filter((i: { required: boolean }) => !i.required)
            .map((i: { itemId: number; quantity: number }) => ({ itemId: i.itemId, quantity: i.quantity })),
          customFacilities: "",
          customEquipment: "",
        };
      }
    }

    setInventory(inv);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const texts = getRoomInventoryTexts(inventory, inventoryItems);
    const res = await fetch("/api/rooms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        ...editForm,
        facilities: texts.facilities,
        equipment: texts.equipment,
        templateId: inventory.templateId || null,
        inventoryFacilities: inventory.facilityItems,
        inventoryEquipment: inventory.equipmentItems,
        customFacilities: inventory.customFacilities,
        customEquipment: inventory.customEquipment,
        autoDeploy: inventory.autoDeploy,
      }),
    });
    const data = await res.json();
    if (data.deployResult && data.deployResult.deployed < data.deployResult.requested) {
      alert(
        `Kamar disimpan. ${data.deployResult.deployed} dari ${data.deployResult.requested} barang dideploy dari gudang.`
      );
    }
    setEditing(false);
    setSaving(false);
    fetchRooms();
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Hapus kamar ${selected.roomNumber}?`)) return;
    const res = await fetch(`/api/rooms?id=${selected.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    setSelectedId(null);
    fetchRooms();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Semua Kamar</h1>
          <Link href="/kamar/baru">
            <Button className="!bg-white !text-blue-600 border-2 border-blue-500 hover:!bg-blue-50">
              <Plus className="w-4 h-4" /> Kamar
            </Button>
          </Link>
        </div>
        <Card>
          <CardBody>
            <EmptyState message="Belum ada kamar. Klik + Kamar untuk menambahkan." />
          </CardBody>
        </Card>
      </div>
    );
  }

  const isAvailable = selected?.status === "AVAILABLE";
  const isOccupied = selected?.status === "OCCUPIED";
  const tenantName = selected?.tenants[0]?.user.name;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <Link href="/kamar/baru">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-blue-500 text-blue-600 font-semibold hover:bg-blue-50 transition-colors">
            <Plus className="w-5 h-5" />
            Kamar
          </button>
        </Link>

        <p className="text-slate-700 font-medium lg:flex-1 lg:text-center">
          Jumlah Kamar: <span className="font-bold">{stats.total}</span>
        </p>

        <div className="bg-slate-700 text-white rounded-lg px-5 py-3 flex gap-8 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-medium">Kamar Kosong</span>
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
              {stats.available}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-red-400 font-medium">Kamar Terisi</span>
            <span className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">
              {stats.occupied}
            </span>
          </div>
        </div>
      </div>

      {/* Floor filter */}
      <Card>
        <CardBody className="py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-500 mr-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Lantai:
            </span>
            <button
              onClick={() => setFloorFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                floorFilter === "all"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              )}
            >
              <Building2 className="w-4 h-4" />
              Semua
            </button>
            {floors.map((floor) => (
              <button
                key={floor}
                onClick={() => setFloorFilter(floor)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                  floorFilter === floor
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                )}
              >
                <Layers className="w-4 h-4" />
                Lantai {floor}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Room tabs */}
      <Card>
        <CardBody className="py-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filteredRooms.map((room) => {
              const active = room.id === selected?.id;
              const vacant = room.status === "AVAILABLE";
              const occupied = room.status === "OCCUPIED";
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedId(room.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 min-w-[72px] px-4 py-3 rounded-lg border-2 transition-all shrink-0",
                    active
                      ? "border-blue-500 bg-blue-50"
                      : "border-transparent bg-slate-50 hover:bg-slate-100"
                  )}
                >
                  <BedDouble
                    className={cn(
                      "w-7 h-7",
                      active ? "text-blue-600" : vacant ? "text-emerald-500" : occupied ? "text-red-500" : "text-amber-500"
                    )}
                  />
                  <span
                    className={cn(
                      "text-lg font-bold",
                      active ? "text-blue-600" : vacant ? "text-emerald-600" : occupied ? "text-red-600" : "text-amber-600"
                    )}
                  >
                    {room.roomNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Room detail */}
      {selected && (
        <Card>
          <CardBody className="p-0">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white",
                    isAvailable ? "bg-emerald-500" : isOccupied ? "bg-red-500" : "bg-amber-500"
                  )}
                >
                  {selected.roomNumber}
                </div>
                <div>
                  <span
                    className={cn(
                      "inline-block px-3 py-1 rounded text-xs font-bold tracking-wide",
                      isAvailable
                        ? "bg-emerald-100 text-emerald-700"
                        : isOccupied
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {isAvailable ? "KOSONG" : isOccupied ? "TERISI" : "PERBAIKAN"}
                  </span>
                  {tenantName && (
                    <p className="text-sm text-slate-500 mt-1">Penghuni: {tenantName}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">Lantai {selected.floor}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(selected)}
                  className="w-10 h-10 rounded-lg border-2 border-amber-400 flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-colors"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="w-10 h-10 rounded-lg border-2 border-red-400 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pricing */}
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <p className="text-slate-600">
                    Bulanan: <span className="font-bold text-slate-900 text-lg">{formatPriceShort(selected.price)}</span>
                  </p>
                  <p className="text-slate-600 mt-1">
                    Harian: <span className="font-bold text-slate-900 text-lg">{formatPriceShort(selected.dailyPrice)}</span>
                  </p>
                </div>
                {isAvailable && (
                  <Link href={`/penghuni/baru?roomId=${selected.id}`}>
                    <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                      Daftar Sewa
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Facilities grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="p-6">
                <h3 className="font-bold text-slate-800 mb-1">Fasilitas Kamar</h3>
                {selected.template && (
                  <p className="text-xs text-teal-700 mb-3">Template: {selected.template.name}</p>
                )}
                <ul className="space-y-2">
                  {parseList(selected.facilities).length > 0 ? (
                    parseList(selected.facilities).map((item, i) => (
                      <li key={i} className="text-slate-600 text-sm border-b border-slate-50 pb-2">
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 text-sm italic">Belum ada fasilitas</li>
                  )}
                </ul>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-slate-800 mb-4">Kelengkapan Kamar Lainnya</h3>
                <ul className="space-y-2">
                  {parseList(selected.equipment).length > 0 ? (
                    parseList(selected.equipment).map((item, i) => (
                      <li key={i} className="text-slate-600 text-sm border-b border-slate-50 pb-2">
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 text-sm italic">Belum ada kelengkapan</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Notes */}
            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800">
                Catatan Kamar:{" "}
                <span className="font-normal text-slate-500 text-sm">
                  (Hanya terlihat oleh Pemilik & Pengelola)
                </span>
              </h3>
              <p className="text-slate-600 text-sm mt-2">
                {selected.description || "Tidak ada catatan"}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Edit modal */}
      {editing && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">Edit Kamar {selected.roomNumber}</h2>
              <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="No. Kamar" value={editForm.roomNumber} onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })} />
                <Select label="Lantai" value={editForm.floor} onChange={(e) => setEditForm({ ...editForm, floor: e.target.value })}>
                  {[1, 2, 3, 4, 5].map((f) => (
                    <option key={f} value={f}>Lantai {f}</option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Harga Bulanan (Rp)" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                <Input label="Harga Harian (Rp)" type="number" value={editForm.dailyPrice} onChange={(e) => setEditForm({ ...editForm, dailyPrice: e.target.value })} />
              </div>
              <Select label="Status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="AVAILABLE">Kosong</option>
                <option value="OCCUPIED">Terisi</option>
                <option value="MAINTENANCE">Perbaikan</option>
              </Select>

              <RoomInventoryFields
                value={inventory}
                onChange={setInventory}
                roomId={selected.id}
              />

              <Textarea
                label="Catatan Kamar"
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>Batal</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
