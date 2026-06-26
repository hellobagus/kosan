"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, CreditCard, Smartphone, Trash2, X } from "lucide-react";
import { PageHeader, Card, CardBody, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import {
  AdditionalFee,
  EXTRA_OCCUPANT_FEE,
  LEASE_OPTIONS,
  calcDueDate,
  calcExtraOccupantFee,
  calcTotalAmount,
  normalizeAdditionalFees,
  parseAmount,
} from "@/lib/tenant-utils";

interface Room {
  id: number;
  roomNumber: string;
  price: string;
  dailyPrice?: string | null;
  floor: number;
}

const inputClass =
  "w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";
const selectClass = `${inputClass} bg-white`;

function RequiredMark() {
  return <span className="text-red-500 ml-0.5">*</span>;
}

function FormRow({
  label,
  required,
  children,
  hint,
  hintClassName,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: React.ReactNode;
  hintClassName?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-2 md:gap-6 py-3.5 border-b border-slate-100 items-start">
      <label className="font-semibold text-sm text-slate-800 md:pt-2">
        {label}
        {required && <RequiredMark />}
      </label>
      <div>
        {children}
        {hint && <p className={`text-xs mt-1.5 ${hintClassName || "text-slate-500"}`}>{hint}</p>}
      </div>
    </div>
  );
}

function AdditionalFeesEditor({
  fees,
  onChange,
}: {
  fees: AdditionalFee[];
  onChange: (fees: AdditionalFee[]) => void;
}) {
  const addFee = () => onChange([...fees, { name: "", amount: 0 }]);

  const updateFee = (index: number, field: "name" | "amount", value: string) => {
    onChange(
      fees.map((f, i) =>
        i === index
          ? field === "name"
            ? { ...f, name: value }
            : { ...f, amount: parseFloat(value) || 0 }
          : f
      )
    );
  };

  const removeFee = (index: number) => onChange(fees.filter((_, i) => i !== index));

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_48px] gap-3 items-center text-sm font-semibold text-slate-700 mb-3">
        <span />
        <div className="flex items-center gap-2">
          <span>Biaya Tambahan</span>
          <button
            type="button"
            onClick={addFee}
            className="w-7 h-7 flex items-center justify-center border-2 border-blue-500 text-blue-600 rounded text-lg leading-none hover:bg-blue-50"
            title="Tambah biaya"
          >
            +
          </button>
        </div>
        <span className="text-center">Opsi</span>
      </div>

      {fees.map((fee, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_48px] gap-3 items-start mb-3 pb-3 border-b border-slate-100 last:border-0"
        >
          <div />
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nama Biaya Tambahan"
              value={fee.name}
              onChange={(e) => updateFee(index, "name", e.target.value)}
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              placeholder="Nominal Harga"
              value={fee.amount || ""}
              onChange={(e) => updateFee(index, "amount", e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={() => removeFee(index)}
            className="w-9 h-9 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600"
            title="Hapus"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function TambahPenghuniPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      }
    >
      <TambahPenghuniForm />
    </Suspense>
  );
}

function TambahPenghuniForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRoomId = searchParams.get("roomId") || "";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [ktpFileName, setKtpFileName] = useState("");
  const [form, setForm] = useState({
    rentType: "",
    name: "",
    phone: "",
    gender: "",
    ktp: "",
    npwp: "",
    maritalStatus: "",
    occupation: "",
    roomId: preselectedRoomId,
    checkIn: "",
    monthlyRent: "",
    deposit: "0",
    leaseDuration: "",
    occupantCount: "",
    discount: "0",
    additionalFees: [] as AdditionalFee[],
    status: "ACTIVE",
    notes: "",
    password: "penghuni123",
  });

  useEffect(() => {
    fetch("/api/rooms?status=AVAILABLE")
      .then((res) => res.json())
      .then((data: Room[]) => {
        const priced = data.filter((r) => parseAmount(r.price) > 0);
        setRooms(priced);
        if (preselectedRoomId) {
          const room = priced.find((r) => r.id === parseInt(preselectedRoomId));
          if (room) {
            setForm((prev) => ({
              ...prev,
              roomId: preselectedRoomId,
              monthlyRent: room.price.toString(),
            }));
          }
        }
      });
  }, [preselectedRoomId]);

  const selectedRoom = rooms.find((r) => r.id === parseInt(form.roomId));
  const isDaily = form.rentType === "HARIAN";

  const leaseOptions = useMemo(() => {
    if (form.rentType === "HARIAN") return LEASE_OPTIONS.filter((o) => o.value === "1 Hari");
    if (form.rentType === "BULANAN") return LEASE_OPTIONS.filter((o) => o.value !== "1 Hari");
    return [];
  }, [form.rentType]);

  const availableRooms = useMemo(() => {
    if (!form.rentType) return [];
    return rooms.filter((r) => {
      if (isDaily) return parseAmount(r.dailyPrice) > 0 || parseAmount(r.price) > 0;
      return parseAmount(r.price) > 0;
    });
  }, [rooms, form.rentType, isDaily]);

  const validFees = normalizeAdditionalFees(form.additionalFees);
  const otherFees = validFees.reduce((s, f) => s + f.amount, 0);
  const rent = parseFloat(form.monthlyRent || "0");
  const deposit = parseFloat(form.deposit || "0");
  const discount = parseFloat(form.discount || "0");
  const occupantCount = parseInt(form.occupantCount || "1");
  const extraOcc = calcExtraOccupantFee(occupantCount);

  const checkInDate = form.checkIn ? new Date(form.checkIn) : undefined;
  const dueDate =
    form.checkIn && form.leaseDuration ? calcDueDate(new Date(form.checkIn), form.leaseDuration) : null;

  const opt = LEASE_OPTIONS.find((o) => o.value === form.leaseDuration);
  let roomTotal = 0;
  if (rent > 0 && form.leaseDuration) {
    if (isDaily || form.leaseDuration === "1 Hari") {
      roomTotal = selectedRoom?.dailyPrice
        ? parseAmount(selectedRoom.dailyPrice)
        : rent;
    } else if (opt && opt.months > 0) {
      roomTotal = rent * opt.months;
    } else if (checkInDate && dueDate) {
      roomTotal = calcTotalAmount({
        monthlyRent: rent,
        dailyPrice: selectedRoom?.dailyPrice ? parseAmount(selectedRoom.dailyPrice) : null,
        isDaily,
        leaseDuration: form.leaseDuration,
        occupantCount: 1,
        discount: 0,
        deposit: 0,
        additionalFees: [],
        checkIn: checkInDate,
        dueDate,
      });
    }
  }

  const subTotal = roomTotal + extraOcc + otherFees + deposit;
  const grandTotal = Math.max(0, subTotal - discount);

  const handleRentTypeChange = (rentType: string) => {
    setForm((prev) => ({
      ...prev,
      rentType,
      leaseDuration: "",
      roomId: "",
      monthlyRent: "",
    }));
  };

  const handleRoomChange = (roomId: string) => {
    const room = availableRooms.find((r) => r.id === parseInt(roomId));
    const price = room
      ? isDaily
        ? (room.dailyPrice ? room.dailyPrice.toString() : room.price.toString())
        : room.price.toString()
      : "";
    setForm({ ...form, roomId, monthlyRent: price });
  };

  const handleKtpPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setKtpFileName("");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran foto KTP maksimal 2MB.");
      e.target.value = "";
      setKtpFileName("");
      return;
    }
    setError("");
    setKtpFileName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("Centang 'Data Sudah Benar' sebelum menyimpan.");
      return;
    }
    if (!ktpFileName) {
      setError("Foto KTP wajib diunggah.");
      return;
    }
    if (form.phone && !form.phone.startsWith("08")) {
      setError("Nomor handphone harus diawali dengan 08.");
      return;
    }
    if (form.ktp && form.ktp.length !== 16) {
      setError("No. KTP harus 16 digit.");
      return;
    }

    setLoading(true);
    setError("");

    const notesParts = [form.notes.trim()];
    if (form.npwp.trim()) notesParts.push(`NPWP: ${form.npwp.trim()}`);
    if (ktpFileName) notesParts.push(`Foto KTP: ${ktpFileName}`);

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          isDaily,
          notes: notesParts.filter(Boolean).join("\n") || undefined,
          occupantCount: form.occupantCount || "1",
          leaseDuration: form.leaseDuration || "1 Bulan",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push(form.status === "RESERVED" ? "/penghuni/reservasi" : "/penghuni/aktif");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Input Penghuni Baru" />

      <Card>
        <CardBody className="p-0">
          {showBanner && (
            <div className="flex items-start gap-3 mx-6 mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
              <div className="w-1 self-stretch bg-blue-500 rounded-full shrink-0" />
              <p className="flex-1">
                Isi data Penghuni sesuai data KTP. Data Kamar &amp; Foto KTP tidak dapat dirubah setelah
                proses Simpan.
              </p>
              <button
                type="button"
                onClick={() => setShowBanner(false)}
                className="text-slate-400 hover:text-slate-600 shrink-0"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2">
            {error && (
              <div className="p-3 mt-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <FormRow
              label="Jenis Sewa Kamar"
              required
              hint="Pilihan Sewa Bulanan / Harian"
            >
              <select
                className={selectClass}
                value={form.rentType}
                onChange={(e) => handleRentTypeChange(e.target.value)}
                required
              >
                <option value="">- Pilih Jenis Sewa Kamar -</option>
                <option value="BULANAN">Sewa Bulanan</option>
                <option value="HARIAN">Sewa Harian</option>
              </select>
            </FormRow>

            <FormRow label="Tanggal Masuk" required>
              <div className="relative">
                <input
                  type="date"
                  className={`${inputClass} pr-10`}
                  value={form.checkIn}
                  onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                  required
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </FormRow>

            <FormRow
              label="Kamar"
              required
              hint={
                <>
                  Kamar dengan harga Rp.0,- tidak ditampilkan.{" "}
                  <Link href="/kamar" className="text-blue-600 hover:underline font-medium">
                    KLIK DISINI
                  </Link>{" "}
                  untuk merubah harga kamar.
                </>
              }
            >
              <select
                className={selectClass}
                value={form.roomId}
                onChange={(e) => handleRoomChange(e.target.value)}
                required
                disabled={!form.rentType}
              >
                <option value="">- Pilih Kamar -</option>
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} (Lantai {r.floor})
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Lama Sewa" required>
              <select
                className={selectClass}
                value={form.leaseDuration}
                onChange={(e) => setForm({ ...form, leaseDuration: e.target.value })}
                required
                disabled={!form.rentType}
              >
                <option value="">- Pilih Lama Sewa -</option>
                {leaseOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Nama Penghuni" required>
              <input
                className={inputClass}
                placeholder="Masukan Nama sesuai KTP"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </FormRow>

            <FormRow label="Nomor Handphone" required hint="Awali nomor dengan 08.">
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className={`${inputClass} pl-9`}
                  placeholder="08987654321"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
            </FormRow>

            <FormRow label="Jenis Kelamin" required>
              <select
                className={selectClass}
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                required
              >
                <option value="">- Pilih Kelamin -</option>
                <option value="MALE">Pria</option>
                <option value="FEMALE">Wanita</option>
              </select>
            </FormRow>

            <FormRow label="No. KTP Penghuni" required>
              <input
                className={inputClass}
                placeholder="Masukan 16 digit no.ktp"
                value={form.ktp}
                onChange={(e) => setForm({ ...form, ktp: e.target.value.replace(/\D/g, "").slice(0, 16) })}
                maxLength={16}
                required
              />
            </FormRow>

            <FormRow
              label="Foto KTP"
              required
              hint={
                <>
                  <span className="text-red-500">Ukuran foto maksimal 2MB.</span>
                  <br />
                  Pastikan Foto KTP sudah benar, ukuran foto Landscape menyesuaikan ukuran KTP. Foto KTP
                  tidak dapat dirubah setelah data diproses/tersimpan.
                </>
              }
            >
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
                <input
                  type="file"
                  accept="image/*"
                  className={`${inputClass} pl-9 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200`}
                  onChange={handleKtpPhoto}
                  required
                />
              </div>
            </FormRow>

            <FormRow label="No. NPWP">
              <input
                className={inputClass}
                placeholder="15 digit no.NPWP"
                value={form.npwp}
                onChange={(e) => setForm({ ...form, npwp: e.target.value.replace(/\D/g, "").slice(0, 15) })}
                maxLength={15}
              />
            </FormRow>

            <FormRow label="Status Penghuni" required>
              <select
                className={selectClass}
                value={form.maritalStatus}
                onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                required
              >
                <option value="">- Pilih Status -</option>
                <option value="SINGLE">Belum Menikah</option>
                <option value="MARRIED">Menikah</option>
              </select>
            </FormRow>

            <FormRow label="Pekerjaan Penghuni" required>
              <input
                className={inputClass}
                placeholder="Pekerjaan Penghuni"
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                required
              />
            </FormRow>

            <FormRow
              label="Jumlah Penghuni"
              required
              hint={`Biaya tambah penghuni Rp.${EXTRA_OCCUPANT_FEE.toLocaleString("id-ID")}, mulai orang ke 2.`}
            >
              <select
                className={selectClass}
                value={form.occupantCount}
                onChange={(e) => setForm({ ...form, occupantCount: e.target.value })}
                required
              >
                <option value="">- Pilih Jumlah Penghuni -</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} Orang
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Keterangan">
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="keterangan seputar penghuni masukan disini"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormRow>

            <FormRow label="Biaya Deposit" required>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.deposit}
                onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                required
              />
            </FormRow>

            <FormRow label="Biaya Lainnya">
              <AdditionalFeesEditor
                fees={form.additionalFees}
                onChange={(additionalFees) => setForm({ ...form, additionalFees })}
              />
            </FormRow>

            <FormRow label="Diskon Harga" required>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                required
              />
            </FormRow>

            <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-100 text-center font-semibold text-sm text-slate-800 py-2.5 border-b border-emerald-200">
                Perhitungan Harga
              </div>
              <dl className="text-sm px-4 py-3 space-y-2">
                <div className="flex justify-between">
                  <dt>Harga Kamar</dt>
                  <dd>{formatCurrency(roomTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Tambah Penghuni</dt>
                  <dd>{formatCurrency(extraOcc)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Biaya Lainnya</dt>
                  <dd>{formatCurrency(otherFees)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Lama Sewa</dt>
                  <dd>{form.leaseDuration || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Deposit</dt>
                  <dd>{formatCurrency(deposit)}</dd>
                </div>
                <div className="flex justify-between font-medium border-t border-slate-200 pt-2">
                  <dt>Total</dt>
                  <dd>{formatCurrency(subTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Diskon</dt>
                  <dd>{formatCurrency(discount)}</dd>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200 pt-2">
                  <dt>Grand Total</dt>
                  <dd>{formatCurrency(grandTotal)}</dd>
                </div>
              </dl>
            </div>

            <p className="text-xs text-slate-500 text-center mt-6">
              Pastikan Data diatas Sudah Benar, Kamar &amp; Foto KTP tidak dapat dirubah setelah data
              diproses/tersimpan.
            </p>

            <label className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>
                Data Sudah Benar<RequiredMark />
              </span>
            </label>

            <div className="flex gap-3 mt-6 justify-end">
              <Button
                type="button"
                variant="secondary"
                className="bg-slate-500 hover:bg-slate-600 text-white"
                onClick={() => router.back()}
              >
                Kembali
              </Button>
              <Button
                type="submit"
                disabled={loading || !form.rentType || availableRooms.length === 0}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>

            {form.rentType && availableRooms.length === 0 && (
              <p className="text-sm text-amber-600 text-center mt-3">
                Tidak ada kamar tersedia dengan harga valid saat ini.
              </p>
            )}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
