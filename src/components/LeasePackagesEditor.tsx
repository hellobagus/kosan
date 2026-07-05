"use client";

import { Trash2 } from "lucide-react";
import {
  DEFAULT_LEASE_PACKAGES,
  LEASE_MONTH_CHOICES,
  type LeasePackage,
} from "@/lib/tenant-utils";

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";
const selectClass = `${inputClass} bg-white`;

export function LeasePackagesEditor({
  packages,
  onChange,
}: {
  packages: LeasePackage[];
  onChange: (packages: LeasePackage[]) => void;
}) {
  const addPackage = () =>
    onChange([...packages, { months: 1, gift: "", bonusMonths: 0 }]);

  const updatePackage = (
    index: number,
    field: keyof LeasePackage,
    value: string
  ) => {
    onChange(
      packages.map((p, i) => {
        if (i !== index) return p;
        if (field === "months") {
          return { ...p, months: parseInt(value, 10) || 1 };
        }
        if (field === "bonusMonths") {
          return { ...p, bonusMonths: Math.max(0, parseInt(value, 10) || 0) };
        }
        return { ...p, gift: value };
      })
    );
  };

  const removePackage = (index: number) =>
    onChange(packages.filter((_, i) => i !== index));

  const usedMonths = new Set(packages.map((p) => p.months));

  return (
    <div>
      <div className="grid grid-cols-[120px_minmax(0,1.5fr)_100px_48px] gap-3 items-center text-sm font-semibold text-slate-700 mb-3">
        <span>Lama Sewa</span>
        <div className="flex items-center gap-2">
          <span>Free Gift / Hadiah</span>
          <button
            type="button"
            onClick={addPackage}
            className="w-7 h-7 flex items-center justify-center border-2 border-blue-500 text-blue-600 rounded text-lg leading-none hover:bg-blue-50"
            title="Tambah paket sewa"
          >
            +
          </button>
        </div>
        <span className="text-xs font-normal text-slate-500">Bulan Bonus*</span>
        <span className="text-center">Opsi</span>
      </div>

      {packages.length === 0 && (
        <p className="text-sm text-slate-500 mb-3">
          Belum ada paket lama sewa. Klik + untuk menambahkan.
        </p>
      )}

      {packages.map((pkg, index) => (
        <div
          key={index}
          className="grid grid-cols-[120px_minmax(0,1.5fr)_100px_48px] gap-3 items-start mb-3 pb-3 border-b border-slate-100 last:border-0"
        >
          <select
            className={selectClass}
            value={pkg.months}
            onChange={(e) => updatePackage(index, "months", e.target.value)}
          >
            {LEASE_MONTH_CHOICES.map((m) => (
              <option
                key={m}
                value={m}
                disabled={usedMonths.has(m) && pkg.months !== m}
              >
                {m === 12 ? "12 Bulan" : `${m} Bulan`}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Contoh: Gratis 1 bulan, Voucher laundry, dll."
            value={pkg.gift}
            onChange={(e) => updatePackage(index, "gift", e.target.value)}
            className={inputClass}
          />
          <input
            type="number"
            min={0}
            max={12}
            placeholder="0"
            value={pkg.bonusMonths || ""}
            onChange={(e) => updatePackage(index, "bonusMonths", e.target.value)}
            className={inputClass}
            title="Bulan tambahan masa sewa (hanya jika bayar lunas)"
          />
          <button
            type="button"
            onClick={() => removePackage(index)}
            className="w-9 h-9 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600"
            title="Hapus"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <p className="text-xs text-slate-500 mt-2">
        *Bulan Bonus memperpanjang masa sewa saat penghuni memilih <strong>Bayar Lunas Sekaligus</strong>.
        Free Gift adalah teks bebas yang ditampilkan ke penghuni (bisa berupa hadiah non-bulan).
      </p>
    </div>
  );
}

export { DEFAULT_LEASE_PACKAGES };

