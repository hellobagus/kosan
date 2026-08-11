"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  MapPin,
  Phone,
  Mail,
  Wifi,
  Shield,
  Sparkles,
  Home,
} from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import { formatCurrency } from "@/lib/utils";

type LeasePackage = { months: number; gift: string; bonusMonths: number };

type PublicInfo = {
  project: {
    code: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    paymentNotes: string | null;
  };
  facilities: string[];
  leasePackages: LeasePackage[];
  stats: { availableRooms: number; totalRooms: number };
};

type PublicRoom = {
  id: number;
  roomNumber: string;
  price: string;
  type: string | null;
  zone: { key: string; label: string; hex: string };
  facilities: string[];
  description: string | null;
};

export function LandingPage() {
  const [info, setInfo] = useState<PublicInfo | null>(null);
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/public/info").then((r) => r.json()),
      fetch("/api/public/rooms").then((r) => r.json()),
    ])
      .then(([infoData, roomsData]) => {
        if (!infoData.error) setInfo(infoData);
        if (roomsData.rooms) setRooms(roomsData.rooms.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  const name = info?.project.name || "KosanKu";

  return (
    <PublicShell projectName={info?.project.name}>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-slate-800 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-teal-300 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal-100">
              Hunian siap huni
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{name}</h1>
            <p className="mt-4 max-w-xl text-lg text-teal-50/90">
              Lihat fasilitas, pilih kamar kosong, dan daftar sebagai calon penghuni secara online.
              Tim kami akan menindaklanjuti permohonan Anda.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/kamar-tersedia"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-teal-800 shadow-sm hover:bg-teal-50"
              >
                Lihat kamar tersedia
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/daftar"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
              >
                Isi formulir daftar
              </Link>
            </div>
            {!loading && info && (
              <div className="mt-10 flex flex-wrap gap-6 text-sm text-teal-100">
                <div>
                  <p className="text-2xl font-bold text-white">{info.stats.availableRooms}</p>
                  <p>Kamar tersedia</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{info.stats.totalRooms}</p>
                  <p>Total unit</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{info.leasePackages.length}</p>
                  <p>Paket sewa</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold">Kenapa di sini?</h2>
            <ul className="mt-4 space-y-3 text-sm text-teal-50">
              <li className="flex gap-3">
                <Home className="mt-0.5 h-4 w-4 shrink-0" />
                Pilih kamar yang masih kosong secara transparan
              </li>
              <li className="flex gap-3">
                <Wifi className="mt-0.5 h-4 w-4 shrink-0" />
                Fasilitas umum jelas sebelum Anda mendaftar
              </li>
              <li className="flex gap-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                Proses calon penghuni terverifikasi oleh pengelola
              </li>
              <li className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                Promo paket sewa langsung terlihat di form
              </li>
            </ul>
            {(info?.project.address || info?.project.phone) && (
              <div className="mt-6 space-y-2 border-t border-white/20 pt-4 text-sm text-teal-50">
                {info.project.address && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {info.project.address}
                  </p>
                )}
                {info.project.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    {info.project.phone}
                  </p>
                )}
                {info.project.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" />
                    {info.project.email}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="fasilitas" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-slate-900">Fasilitas</h2>
          <p className="mt-2 text-slate-600">
            Fasilitas umum yang tersedia untuk penghuni. Detail tiap kamar bisa berbeda.
          </p>
        </div>
        {loading ? (
          <div className="mt-8 flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
          </div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(info?.facilities.length ? info.facilities : ["WIFI", "Keamanan", "Area bersama"]).map(
              (f) => (
                <div
                  key={f}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5"
                >
                  <span className="mt-0.5 rounded-full bg-teal-50 p-1 text-teal-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium text-slate-800">{f}</span>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {info && info.leasePackages.length > 0 && (
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold text-slate-900">Paket sewa</h2>
            <p className="mt-2 text-slate-600">Pilih lama sewa sesuai kebutuhan. Promo berlaku untuk pembayaran lunas.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {info.leasePackages.map((pkg) => (
                <div
                  key={pkg.months}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {pkg.months === 12 ? "1 Tahun" : `${pkg.months} Bulan`}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {pkg.gift || "Tanpa bonus"}
                  </p>
                  {pkg.bonusMonths > 0 && (
                    <p className="mt-2 text-xs text-teal-700">
                      +{pkg.bonusMonths} bulan pemakaian
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Kamar tersedia</h2>
            <p className="mt-2 text-slate-600">Beberapa unit yang siap dipilih. Lihat semua untuk opsi lengkap.</p>
          </div>
          <Link
            href="/kamar-tersedia"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            Lihat semua
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
          </div>
        ) : rooms.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
            Belum ada kamar tersedia saat ini.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <article
                key={room.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-slate-900">Kamar {room.roomNumber}</p>
                    <p className="text-sm text-slate-500">
                      {room.type || "Unit"} · {room.zone.label}
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
                {room.facilities.length > 0 && (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                    {room.facilities.slice(0, 4).join(" · ")}
                  </p>
                )}
                <Link
                  href={`/daftar?roomId=${room.id}`}
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Pilih & daftar
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-2xl font-bold">Siap menjadi penghuni?</h2>
            <p className="mt-2 max-w-xl text-slate-300">
              Isi formulir calon penghuni. Pengelola akan meninjau data Anda di menu Calon Penghuni.
            </p>
          </div>
          <Link
            href="/daftar"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-400"
          >
            Mulai pendaftaran
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
