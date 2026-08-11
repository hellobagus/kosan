"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import { formatCurrency } from "@/lib/utils";
import {
  calcDueDate,
  calcExtraOccupantFee,
  calcTotalAmount,
  findLeasePackage,
  formatLeaseDurationLabel,
  formatLeasePackageOption,
  getLeaseBonusMonths,
  leaseValueFromMonths,
  parseAmount,
  type AdditionalOccupant,
  type LeasePackage,
  type TenantPaymentType,
} from "@/lib/tenant-utils";

type Room = {
  id: number;
  roomNumber: string;
  price: string;
  dailyPrice: string | null;
  type: string | null;
  zone: { label: string; hex: string };
  suggestedDeposit: number;
  facilities: string[];
};

const inputClass =
  "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";

function ApplyFormInner() {
  const searchParams = useSearchParams();
  const preselectedRoomId = searchParams.get("roomId") || "";

  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [terms, setTerms] = useState("");
  const [leasePackages, setLeasePackages] = useState<LeasePackage[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    roomNumber: string;
    email: string;
    totalAmount?: string;
  } | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [additionalOccupants, setAdditionalOccupants] = useState<AdditionalOccupant[]>([]);

  const [form, setForm] = useState({
    rentType: "BULANAN",
    name: "",
    email: "",
    phone: "",
    password: "",
    emergencyPhone: "",
    gender: "",
    ktp: "",
    maritalStatus: "",
    occupation: "",
    ktpAddress: "",
    correspondenceAddress: "",
    workplace: "",
    workplaceAddress: "",
    roomId: preselectedRoomId,
    checkIn: "",
    leaseDuration: "",
    paymentType: "FULL" as TenantPaymentType,
    occupantCount: "1",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/public/info").then((r) => r.json()),
      fetch("/api/public/rooms").then((r) => r.json()),
    ])
      .then(([info, roomsData]) => {
        if (info.project) {
          setProjectName(info.project.name || "");
          setProjectCode(info.project.code || "");
          setTerms(info.project.termsAndConditions || "");
          setLeasePackages(info.leasePackages || []);
        }
        const list: Room[] = roomsData.rooms || [];
        setRooms(list);
        if (preselectedRoomId) {
          const exists = list.find((r) => r.id === parseInt(preselectedRoomId, 10));
          if (exists) {
            setForm((prev) => ({ ...prev, roomId: preselectedRoomId }));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [preselectedRoomId]);

  useEffect(() => {
    const count = parseInt(form.occupantCount || "1", 10);
    const needed = Math.max(0, count - 1);
    setAdditionalOccupants((prev) => {
      const next = [...prev];
      while (next.length < needed) next.push({ name: "", ktp: "" });
      while (next.length > needed) next.pop();
      return next;
    });
  }, [form.occupantCount]);

  const selectedRoom = rooms.find((r) => r.id === parseInt(form.roomId || "0", 10));
  const isDaily = form.rentType === "HARIAN";

  const leaseOptions = useMemo(() => {
    if (isDaily) return [{ value: "1 Hari", label: "1 Hari", months: 0 }];
    return leasePackages.map((pkg) => ({
      value: leaseValueFromMonths(pkg.months),
      label: formatLeasePackageOption(pkg, form.paymentType),
      months: pkg.months,
    }));
  }, [isDaily, leasePackages, form.paymentType]);

  const monthlyRent = selectedRoom
    ? isDaily
      ? parseAmount(selectedRoom.dailyPrice) || parseAmount(selectedRoom.price)
      : parseAmount(selectedRoom.price)
    : 0;
  const deposit = selectedRoom?.suggestedDeposit || monthlyRent;
  const occupantCount = parseInt(form.occupantCount || "1", 10) || 1;
  const bonusMonths = getLeaseBonusMonths(form.leaseDuration, leasePackages, form.paymentType);
  const selectedPkg = findLeasePackage(form.leaseDuration, leasePackages);
  const dueDate =
    form.checkIn && form.leaseDuration
      ? calcDueDate(new Date(form.checkIn), form.leaseDuration, bonusMonths)
      : null;
  const total =
    selectedRoom && form.leaseDuration
      ? calcTotalAmount({
          monthlyRent,
          dailyPrice: selectedRoom.dailyPrice ? parseAmount(selectedRoom.dailyPrice) : null,
          isDaily,
          leaseDuration: form.leaseDuration,
          occupantCount,
          discount: 0,
          deposit,
          additionalFees: [],
          checkIn: form.checkIn ? new Date(form.checkIn) : undefined,
          dueDate,
        })
      : 0;

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!agreedTerms) {
      setError("Anda harus menyetujui Syarat & Ketentuan");
      return;
    }
    if (!form.roomId) {
      setError("Pilih kamar terlebih dahulu");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectCode,
          ...form,
          agreedTerms: true,
          additionalOccupants,
          contractRequested: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Pendaftaran gagal");
        return;
      }
      setSuccess({
        roomNumber: data.application?.roomNumber || selectedRoom?.roomNumber || "-",
        email: data.application?.email || form.email,
        totalAmount: data.application?.totalAmount,
      });
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <PublicShell projectName={projectName}>
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Pendaftaran terkirim</h1>
            <p className="mt-2 text-slate-600">
              Permohonan calon penghuni untuk kamar <strong>{success.roomNumber}</strong> sudah
              masuk. Tim pengelola akan menghubungi Anda melalui email{" "}
              <strong>{success.email}</strong>.
            </p>
            {success.totalAmount && (
              <p className="mt-4 text-sm text-slate-500">
                Estimasi total: {formatCurrency(success.totalAmount)}
              </p>
            )}
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Kembali ke beranda
              </Link>
              <Link
                href="/kamar-tersedia"
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Lihat kamar lain
              </Link>
            </div>
          </div>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell projectName={projectName}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Formulir calon penghuni</h1>
          <p className="mt-2 text-slate-600">
            Lengkapi data di bawah. Setelah dikirim, status Anda akan menjadi{" "}
            <strong>Calon Penghuni</strong> dan diproses oleh pengelola.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">Pilihan sewa & kamar</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Jenis sewa *</label>
                  <select
                    className={inputClass}
                    value={form.rentType}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        rentType: e.target.value,
                        leaseDuration: "",
                        paymentType: e.target.value === "HARIAN" ? "FULL" : prev.paymentType,
                      }));
                    }}
                    required
                  >
                    <option value="BULANAN">Bulanan</option>
                    <option value="HARIAN">Harian</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tanggal masuk *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.checkIn}
                    onChange={(e) => setField("checkIn", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Kamar *</label>
                  <select
                    className={inputClass}
                    value={form.roomId}
                    onChange={(e) => setField("roomId", e.target.value)}
                    required
                  >
                    <option value="">Pilih kamar</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} · {r.zone.label} · {formatCurrency(r.price)}/bln
                        {r.type ? ` · ${r.type}` : ""}
                      </option>
                    ))}
                  </select>
                  {rooms.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      Tidak ada kamar tersedia.{" "}
                      <Link href="/kamar-tersedia" className="underline">
                        Cek daftar kamar
                      </Link>
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Lama sewa *</label>
                  <select
                    className={inputClass}
                    value={form.leaseDuration}
                    onChange={(e) => setField("leaseDuration", e.target.value)}
                    required
                  >
                    <option value="">Pilih lama sewa</option>
                    {leaseOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {!isDaily && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Tipe pembayaran
                    </label>
                    <select
                      className={inputClass}
                      value={form.paymentType}
                      onChange={(e) => setField("paymentType", e.target.value)}
                    >
                      <option value="FULL">Lunas (dapat promo)</option>
                      <option value="INSTALLMENT">Cicilan</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Jumlah penghuni
                  </label>
                  <select
                    className={inputClass}
                    value={form.occupantCount}
                    onChange={(e) => setField("occupantCount", e.target.value)}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} orang
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedRoom && (
                <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Kamar {selectedRoom.roomNumber}</span>
                    {" · "}
                    {formatCurrency(monthlyRent)}
                    {isDaily ? " / hari" : " / bulan"}
                    {deposit > 0 && ` · Deposit ${formatCurrency(deposit)}`}
                  </p>
                  {form.leaseDuration && (
                    <p className="mt-1 text-slate-500">
                      Paket:{" "}
                      {formatLeaseDurationLabel(
                        form.leaseDuration,
                        bonusMonths,
                        form.paymentType === "FULL" ? selectedPkg?.gift : null
                      )}
                      {total > 0 && ` · Estimasi ${formatCurrency(total)}`}
                      {occupantCount > 1 &&
                        ` (termasuk biaya tambah penghuni ${formatCurrency(calcExtraOccupantFee(occupantCount))})`}
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">Data diri</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama lengkap *</label>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password akun (opsional)
                  </label>
                  <input
                    type="password"
                    className={inputClass}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="Min. 6 karakter"
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">No. HP *</label>
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    No. darurat
                  </label>
                  <input
                    className={inputClass}
                    value={form.emergencyPhone}
                    onChange={(e) => setField("emergencyPhone", e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Jenis kelamin</label>
                  <select
                    className={inputClass}
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                  >
                    <option value="">Pilih</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">No. KTP *</label>
                  <input
                    className={inputClass}
                    value={form.ktp}
                    onChange={(e) => setField("ktp", e.target.value.replace(/\D/g, "").slice(0, 16))}
                    inputMode="numeric"
                    maxLength={16}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    className={inputClass}
                    value={form.maritalStatus}
                    onChange={(e) => setField("maritalStatus", e.target.value)}
                  >
                    <option value="">Pilih</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                    <option value="Menikah">Menikah</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Pekerjaan</label>
                  <input
                    className={inputClass}
                    value={form.occupation}
                    onChange={(e) => setField("occupation", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Alamat KTP</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={form.ktpAddress}
                    onChange={(e) => setField("ktpAddress", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Alamat korespondensi
                  </label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={form.correspondenceAddress}
                    onChange={(e) => setField("correspondenceAddress", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tempat kerja</label>
                  <input
                    className={inputClass}
                    value={form.workplace}
                    onChange={(e) => setField("workplace", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Alamat tempat kerja
                  </label>
                  <input
                    className={inputClass}
                    value={form.workplaceAddress}
                    onChange={(e) => setField("workplaceAddress", e.target.value)}
                  />
                </div>
              </div>

              {additionalOccupants.length > 0 && (
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-800">Penghuni tambahan</h3>
                  {additionalOccupants.map((occ, idx) => (
                    <div key={idx} className="grid gap-3 sm:grid-cols-2">
                      <input
                        className={inputClass}
                        placeholder={`Nama penghuni ${idx + 2}`}
                        value={occ.name}
                        onChange={(e) => {
                          const next = [...additionalOccupants];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setAdditionalOccupants(next);
                        }}
                        required
                      />
                      <input
                        className={inputClass}
                        placeholder="No. KTP 16 digit"
                        value={occ.ktp}
                        onChange={(e) => {
                          const next = [...additionalOccupants];
                          next[idx] = {
                            ...next[idx],
                            ktp: e.target.value.replace(/\D/g, "").slice(0, 16),
                          };
                          setAdditionalOccupants(next);
                        }}
                        required
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Catatan</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Opsional"
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">Syarat & Ketentuan</h2>
              {terms ? (
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  {terms}
                </pre>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Dengan mendaftar, Anda bersedia mengikuti tata tertib penghuni dan proses verifikasi
                  pengelola.
                </p>
              )}
              <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                />
                <span>Saya menyetujui Syarat & Ketentuan dan menyatakan data yang diisi sudah benar.</span>
              </label>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Link
                href="/kamar-tersedia"
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Kembali ke daftar kamar
              </Link>
              <button
                type="submit"
                disabled={submitting || rooms.length === 0}
                className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Mengirim..." : "Kirim pendaftaran"}
              </button>
            </div>
          </form>
        )}
      </div>
    </PublicShell>
  );
}

export function ApplyFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      }
    >
      <ApplyFormInner />
    </Suspense>
  );
}
