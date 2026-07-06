"use client";

import { useCallback, useEffect, useState } from "react";
import { Building, Layers, Plus } from "lucide-react";
import { Button, Card, CardBody, Input, PageHeader, Select } from "@/components/ui";

type BuildingRow = {
  id: number;
  name: string;
  code: string;
  floors: Array<{ id: number; name: string; level: number; _count: { rooms: number } }>;
};

export default function OrganizationBoard() {
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [holdings, setHoldings] = useState<Array<{ id: number; name: string; code: string; entities: Array<{ id: number; name: string; code: string }> }>>([]);
  const [loading, setLoading] = useState(true);
  const [buildingForm, setBuildingForm] = useState({ name: "", code: "" });
  const [floorForm, setFloorForm] = useState({ buildingId: "", name: "", level: "1" });

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/organization/buildings").then((r) => r.json()),
      fetch("/api/organization/entities").then((r) => r.json()),
    ])
      .then(([bld, hld]) => {
        if (Array.isArray(bld)) setBuildings(bld);
        if (Array.isArray(hld)) setHoldings(hld);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addBuilding = async () => {
    if (!buildingForm.name || !buildingForm.code) return;
    const res = await fetch("/api/organization/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildingForm),
    });
    if (res.ok) {
      setBuildingForm({ name: "", code: "" });
      fetchData();
    }
  };

  const addFloor = async () => {
    if (!floorForm.buildingId || !floorForm.name || !floorForm.level) return;
    const res = await fetch("/api/organization/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildingId: parseInt(floorForm.buildingId, 10),
        name: floorForm.name,
        level: parseInt(floorForm.level, 10),
      }),
    });
    if (res.ok) {
      setFloorForm({ buildingId: "", name: "", level: "1" });
      fetchData();
    }
  };

  if (loading) return <p className="text-slate-500">Memuat struktur organisasi...</p>;

  return (
    <div>
      <PageHeader
        title="Struktur Organisasi"
        description="Holding → Entity → Project (kos aktif di header) → Gedung → Lantai → Kamar"
      />

      <Card className="mb-6">
        <CardBody>
          <h3 className="font-semibold text-slate-800 mb-3">Holding & Entity</h3>
          <div className="space-y-3">
            {holdings.map((h) => (
              <div key={h.id} className="border border-slate-200 rounded-lg p-4">
                <p className="font-medium text-teal-700">{h.code} — {h.name}</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {h.entities?.map((e) => (
                    <li key={e.id}>↳ Entity: {e.code} — {e.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardBody>
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Building className="w-4 h-4" /> Tambah Gedung
            </h3>
            <div className="space-y-3">
              <Input label="Nama Gedung" value={buildingForm.name} onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })} />
              <Input label="Kode" value={buildingForm.code} onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })} placeholder="GDG01" />
              <Button onClick={addBuilding}><Plus className="w-4 h-4" /> Simpan Gedung</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4" /> Tambah Lantai
            </h3>
            <div className="space-y-3">
              <Select label="Gedung" value={floorForm.buildingId} onChange={(e) => setFloorForm({ ...floorForm, buildingId: e.target.value })}>
                <option value="">Pilih gedung</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                ))}
              </Select>
              <Input label="Nama Lantai" value={floorForm.name} onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })} placeholder="Lantai 1" />
              <Input label="Level (angka)" type="number" value={floorForm.level} onChange={(e) => setFloorForm({ ...floorForm, level: e.target.value })} />
              <Button onClick={addFloor}><Plus className="w-4 h-4" /> Simpan Lantai</Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="font-semibold mb-4">Gedung & Lantai — Project Aktif</h3>
          {buildings.length === 0 ? (
            <p className="text-slate-500 text-sm">Belum ada gedung. Tambahkan gedung dan lantai untuk project yang dipilih di header.</p>
          ) : (
            <div className="space-y-4">
              {buildings.map((b) => (
                <div key={b.id} className="border rounded-lg p-4">
                  <p className="font-medium">{b.code} — {b.name}</p>
                  <ul className="mt-2 text-sm text-slate-600 space-y-1">
                    {b.floors.map((f) => (
                      <li key={f.id}>
                        {f.name} (level {f.level}) — {f._count.rooms} kamar
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
