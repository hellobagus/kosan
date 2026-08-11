"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/public/PublicShell";
import { formatCurrency, cn } from "@/lib/utils";

type PublicRoom = {
  id: number;
  roomNumber: string;
  price: string;
  dailyPrice: string | null;
  type: string | null;
  zone: { key: string; label: string; hex: string };
  facilities: string[];
  description: string | null;
  suggestedDeposit: number;
};

export function RoomCatalogPage() {
  const [projectName, setProjectName] = useState("");
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [zone, setZone] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/rooms")
      .then((r) => r.json())
      .then((data) => {
        setProjectName(data.projectName || "");
        setRooms(data.rooms || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const zones = useMemo(() => {
    const map = new Map<string, { label: string; hex: string }>();
    for (const r of rooms) {
      if (!map.has(r.zone.key)) map.set(r.zone.key, { label: r.zone.label, hex: r.zone.hex });
    }
    return [...map.entries()];
  }, [rooms]);

  const filtered = zone === "all" ? rooms : rooms.filter((r) => r.zone.key === zone);

  return (
    <PublicShell projectName={projectName}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900">Kamar tersedia</h1>
          <p className="mt-2 text-slate-600">
            Pilih unit yang masih kosong, lalu lanjutkan ke formulir calon penghuni.
          </p>
        </div>

        {zones.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setZone("all")}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium",
                zone === "all"
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              )}
            >
              Semua
            </button>
            {zones.map(([key, z]) => (
              <button
                key={key}
                type="button"
                onClick={() => setZone(key)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium",
                  zone === key ? "text-white border-transparent" : "bg-white text-slate-700 border-slate-200"
                )}
                style={zone === key ? { backgroundColor: z.hex } : undefined}
              >
                {z.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center text-slate-500">
            Tidak ada kamar pada filter ini.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((room) => (
              <article
                key={room.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Kamar {room.roomNumber}</h2>
                    <p className="text-sm text-slate-500">
                      {room.type || "Unit"} · Zona {room.zone.label}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: room.zone.hex }}
                  >
                    {room.zone.label}
                  </span>
                </div>

                <p className="mt-4 text-xl font-bold text-teal-700">
                  {formatCurrency(room.price)}
                  <span className="text-sm font-medium text-slate-500"> / bulan</span>
                </p>
                {room.suggestedDeposit > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Deposit disarankan {formatCurrency(room.suggestedDeposit)}
                  </p>
                )}

                {room.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">{room.description}</p>
                )}

                {room.facilities.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {room.facilities.slice(0, 6).map((f) => (
                      <li
                        key={f}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href={`/daftar?roomId=${room.id}`}
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Pilih kamar ini
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
