"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { Select, Input, Textarea } from "@/components/ui";
import { buildInventoryTextLines } from "@/lib/inventory-service";

export interface InventoryItemOption {
  id: number;
  name: string;
  unit: string;
  category: { name: string } | null;
}

export interface ItemSelection {
  itemId: number;
  quantity: number;
}

export interface RoomInventoryFormValue {
  templateId: string;
  facilityItems: ItemSelection[];
  equipmentItems: ItemSelection[];
  customFacilities: string;
  customEquipment: string;
  autoDeploy: boolean;
}

export const EMPTY_ROOM_INVENTORY: RoomInventoryFormValue = {
  templateId: "",
  facilityItems: [],
  equipmentItems: [],
  customFacilities: "",
  customEquipment: "",
  autoDeploy: false,
};

interface Template {
  id: number;
  name: string;
  items: Array<{ itemId: number; quantity: number; required: boolean; item: InventoryItemOption }>;
}

interface RoomInventoryFieldsProps {
  value: RoomInventoryFormValue;
  onChange: (value: RoomInventoryFormValue) => void;
  roomId?: number;
}

function mergeSelection(list: ItemSelection[], itemId: number, quantity: number): ItemSelection[] {
  const existing = list.find((i) => i.itemId === itemId);
  if (quantity <= 0) return list.filter((i) => i.itemId !== itemId);
  if (existing) {
    return list.map((i) => (i.itemId === itemId ? { ...i, quantity } : i));
  }
  return [...list, { itemId, quantity }];
}

export function getRoomInventoryTexts(
  value: RoomInventoryFormValue,
  items: InventoryItemOption[]
) {
  const itemMap = new Map(items.map((i) => [i.id, i.name]));
  const facilityLines = value.facilityItems.map((s) => ({
    name: itemMap.get(s.itemId) || `Item #${s.itemId}`,
    quantity: s.quantity,
  }));
  const equipmentLines = value.equipmentItems.map((s) => ({
    name: itemMap.get(s.itemId) || `Item #${s.itemId}`,
    quantity: s.quantity,
  }));
  return {
    facilities: buildInventoryTextLines(facilityLines, value.customFacilities),
    equipment: buildInventoryTextLines(equipmentLines, value.customEquipment),
  };
}

export default function RoomInventoryFields({ value, onChange, roomId }: RoomInventoryFieldsProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [items, setItems] = useState<InventoryItemOption[]>([]);
  const [deployedSummary, setDeployedSummary] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory/templates").then((r) => r.json()),
      fetch("/api/inventory/items?locationType=ROOM").then((r) => r.json()),
    ]).then(([t, i]) => {
      setTemplates(t);
      setItems(i);
    });
  }, []);

  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/inventory/assets?roomId=${roomId}`)
      .then((r) => r.json())
      .then((assets: Array<{ item: { id: number; name: string } }>) => {
        if (!assets.length) return;
        const counts = new Map<number, number>();
        for (const a of assets) {
          counts.set(a.item.id, (counts.get(a.item.id) || 0) + 1);
        }
        const names = [...counts.entries()].map(([id, qty]) => {
          const item = items.find((i) => i.id === id);
          return `${item?.name || id} (${qty})`;
        });
        setDeployedSummary(names.join(", "));
      });
  }, [roomId, items]);

  const applyTemplate = (templateId: string) => {
    const template = templates.find((t) => String(t.id) === templateId);
    if (!template) {
      onChange({ ...value, templateId });
      return;
    }
    onChange({
      ...value,
      templateId,
      facilityItems: template.items
        .filter((i) => i.required)
        .map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
      equipmentItems: template.items
        .filter((i) => !i.required)
        .map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
    });
  };

  const preview = useMemo(() => getRoomInventoryTexts(value, items), [value, items]);

  const toggleFacility = (itemId: number, checked: boolean) => {
    onChange({
      ...value,
      facilityItems: checked
        ? mergeSelection(value.facilityItems, itemId, 1)
        : value.facilityItems.filter((i) => i.itemId !== itemId),
    });
  };

  const toggleEquipment = (itemId: number, checked: boolean) => {
    onChange({
      ...value,
      equipmentItems: checked
        ? mergeSelection(value.equipmentItems, itemId, 1)
        : value.equipmentItems.filter((i) => i.itemId !== itemId),
    });
  };

  return (
    <div className="space-y-4 border border-teal-100 bg-teal-50/40 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-teal-600" />
            Inventaris Kamar
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Fasilitas & kelengkapan diambil dari master barang inventaris
          </p>
        </div>
        <Link href="/inventaris/barang" className="text-xs text-teal-700 hover:underline whitespace-nowrap">
          Master Barang →
        </Link>
      </div>

      <Select
        label="Template Inventaris"
        value={value.templateId}
        onChange={(e) => applyTemplate(e.target.value)}
      >
        <option value="">-- Pilih template (opsional) --</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </Select>

      <div>
        <p className="text-sm font-medium text-slate-800 mb-2">Fasilitas Kamar *</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-white rounded-lg border border-slate-200 p-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400 col-span-2">Belum ada barang kamar di master inventaris.</p>
          ) : (
            items.map((item) => {
              const sel = value.facilityItems.find((s) => s.itemId === item.id);
              const checked = !!sel;
              return (
                <div key={`fac-${item.id}`} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleFacility(item.id, e.target.checked)}
                    id={`fac-${item.id}`}
                  />
                  <label htmlFor={`fac-${item.id}`} className="flex-1 cursor-pointer">
                    {item.name}
                    {item.category && <span className="text-slate-400 text-xs"> ({item.category.name})</span>}
                  </label>
                  {checked && (
                    <Input
                      type="number"
                      min={1}
                      value={String(sel?.quantity || 1)}
                      onChange={(e) => onChange({
                        ...value,
                        facilityItems: mergeSelection(value.facilityItems, item.id, parseInt(e.target.value) || 1),
                      })}
                      className="!w-16 !py-1 !text-xs"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
        <Textarea
          label="Tambahan fasilitas (teks bebas)"
          rows={2}
          placeholder="Kamar mandi dalam, balkon, dll."
          value={value.customFacilities}
          onChange={(e) => onChange({ ...value, customFacilities: e.target.value })}
          className="mt-2"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-800 mb-2">Kelengkapan Kamar Lainnya</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-white rounded-lg border border-slate-200 p-3">
          {items.map((item) => {
            const sel = value.equipmentItems.find((s) => s.itemId === item.id);
            const checked = !!sel;
            return (
              <div key={`eq-${item.id}`} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleEquipment(item.id, e.target.checked)}
                  id={`eq-${item.id}`}
                />
                <label htmlFor={`eq-${item.id}`} className="flex-1 cursor-pointer">{item.name}</label>
                {checked && (
                  <Input
                    type="number"
                    min={1}
                    value={String(sel?.quantity || 1)}
                    onChange={(e) => onChange({
                      ...value,
                      equipmentItems: mergeSelection(value.equipmentItems, item.id, parseInt(e.target.value) || 1),
                    })}
                    className="!w-16 !py-1 !text-xs"
                  />
                )}
              </div>
            );
          })}
        </div>
        <Textarea
          label="Tambahan kelengkapan (teks bebas)"
          rows={2}
          placeholder="Kunci cadangan, remote AC, dll."
          value={value.customEquipment}
          onChange={(e) => onChange({ ...value, customEquipment: e.target.value })}
          className="mt-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.autoDeploy}
          onChange={(e) => onChange({ ...value, autoDeploy: e.target.checked })}
        />
        Deploy barang dari gudang otomatis jika stok tersedia
      </label>

      {deployedSummary && (
        <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-2">
          Asset sudah di kamar: {deployedSummary}
        </p>
      )}

      {(preview.facilities || preview.equipment) && (
        <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-3 space-y-1">
          <p className="font-medium text-slate-800">Preview tersimpan:</p>
          {preview.facilities && <p><span className="font-medium">Fasilitas:</span> {preview.facilities.replace(/\n/g, ", ")}</p>}
          {preview.equipment && <p><span className="font-medium">Kelengkapan:</span> {preview.equipment.replace(/\n/g, ", ")}</p>}
        </div>
      )}
    </div>
  );
}
