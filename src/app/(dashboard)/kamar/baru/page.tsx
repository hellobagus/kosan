"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, CardBody, Input, Select, Textarea, Button } from "@/components/ui";
import RoomInventoryFields, {
  EMPTY_ROOM_INVENTORY,
  getRoomInventoryTexts,
  type RoomInventoryFormValue,
  type InventoryItemOption,
} from "@/components/RoomInventoryFields";

export default function TambahKamarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([]);
  const [inventory, setInventory] = useState<RoomInventoryFormValue>(EMPTY_ROOM_INVENTORY);
  const [form, setForm] = useState({
    roomNumber: "",
    floor: "1",
    price: "",
    dailyPrice: "",
    description: "",
  });

  useEffect(() => {
    fetch("/api/inventory/items?locationType=ROOM")
      .then((r) => r.json())
      .then(setInventoryItems)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const texts = getRoomInventoryTexts(inventory, inventoryItems);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          templateId: inventory.templateId || undefined,
          facilities: texts.facilities,
          equipment: texts.equipment,
          inventoryFacilities: inventory.facilityItems,
          inventoryEquipment: inventory.equipmentItems,
          customFacilities: inventory.customFacilities,
          customEquipment: inventory.customEquipment,
          autoDeploy: inventory.autoDeploy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      if (data.deployResult && data.deployResult.deployed < data.deployResult.requested) {
        alert(
          `Kamar berhasil dibuat. ${data.deployResult.deployed} dari ${data.deployResult.requested} barang dideploy dari gudang. Sisanya perlu ditempatkan manual dari menu Gudang.`
        );
      }
      router.push("/kamar");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Input Kamar Baru"
        description="Tambahkan kamar baru — fasilitas & kelengkapan terhubung ke inventaris"
      />

      <Card className="max-w-3xl">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Nomor Kamar"
                placeholder="Contoh: 01, A1"
                value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                required
              />
              <Select
                label="Colour / Zone"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
              >
                <option value="1">Blue</option>
                <option value="2">Green</option>
                <option value="3">Purple</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Harga Sewa Bulanan (Rp)"
                type="number"
                placeholder="900000"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
              <Input
                label="Harga Sewa Harian (Rp)"
                type="number"
                placeholder="100000"
                value={form.dailyPrice}
                onChange={(e) => setForm({ ...form, dailyPrice: e.target.value })}
              />
            </div>

            <RoomInventoryFields
              value={inventory}
              onChange={setInventory}
            />

            <Textarea
              label="Catatan Kamar"
              rows={2}
              placeholder="Catatan khusus (hanya untuk pemilik & pengelola)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan Kamar"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Batal
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
