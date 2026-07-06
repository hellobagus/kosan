import { formatCurrency, formatDate, getMonthName } from "@/lib/utils";
import { formatMarital, monthsFromLeaseValue, parseAdditionalOccupants, type AdditionalOccupant } from "@/lib/tenant-utils";

export interface ContractProfile {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  managerName: string | null;
  contractLocation: string | null;
  latePenaltyPerDay: number | string;
  contractTemplate?: string | null;
  inventoryBaTemplate?: string | null;
}

export interface ContractTenant {
  id: number;
  checkIn: Date | string;
  dueDate: Date | string | null;
  monthlyRent: number | string;
  deposit: number | string;
  leaseDuration: string | null;
  emergencyPhone: string | null;
  additionalOccupants: unknown;
  user: {
    name: string;
    phone: string | null;
    ktp: string | null;
    maritalStatus: string | null;
    ktpAddress: string | null;
    correspondenceAddress: string | null;
    workplace: string | null;
    workplaceAddress: string | null;
  };
  room: {
    roomNumber: string;
    floor: number;
  };
}

export interface InventoryItem {
  name: string;
  quantity: number;
  checked?: boolean;
}

export interface PlaceholderInfo {
  key: string;
  label: string;
  group: string;
  example?: string;
}

export const CONTRACT_PLACEHOLDERS: PlaceholderInfo[] = [
  { key: "nama_kosan", label: "Nama kosan", group: "Pihak Pertama", example: "Sixty Six Home Sweet Home" },
  { key: "nama_kosan_upper", label: "Nama kosan (huruf besar)", group: "Pihak Pertama" },
  { key: "alamat_kosan", label: "Alamat kosan", group: "Pihak Pertama" },
  { key: "nama_pengurus", label: "Nama pengurus", group: "Pihak Pertama" },
  { key: "telepon_kosan", label: "Telepon kosan", group: "Pihak Pertama" },
  { key: "hari", label: "Hari (Senin, ...)", group: "Tanggal" },
  { key: "tanggal", label: "Tanggal (angka)", group: "Tanggal" },
  { key: "bulan", label: "Bulan (Juni, ...)", group: "Tanggal" },
  { key: "tahun", label: "Tahun", group: "Tanggal" },
  { key: "tanggal_short", label: "Tanggal (DD/MM/YY)", group: "Tanggal" },
  { key: "lokasi_kontrak", label: "Lokasi penandatanganan", group: "Tanggal" },
  { key: "nama_penghuni", label: "Nama penghuni", group: "Pihak Kedua" },
  { key: "status_penghuni", label: "Status (Menikah/Single)", group: "Pihak Kedua" },
  { key: "ktp_penghuni", label: "No. KTP", group: "Pihak Kedua" },
  { key: "alamat_ktp_penghuni", label: "Alamat KTP", group: "Pihak Kedua" },
  { key: "alamat_korespondensi", label: "Alamat korespondensi", group: "Pihak Kedua" },
  { key: "telepon_penghuni", label: "Telepon penghuni", group: "Pihak Kedua" },
  { key: "tempat_kerja", label: "Tempat kerja", group: "Pihak Kedua" },
  { key: "alamat_tempat_kerja", label: "Alamat tempat kerja", group: "Pihak Kedua" },
  { key: "penghuni_tambahan", label: "Blok HTML penghuni tambahan", group: "Pihak Kedua" },
  { key: "kontak_darurat", label: "Kontak darurat", group: "Pihak Kedua" },
  { key: "nomor_kamar", label: "Unit / nomor kamar", group: "Objek Sewa" },
  { key: "tanggal_mulai_sewa", label: "Tanggal mulai sewa", group: "Objek Sewa" },
  { key: "masa_sewa", label: "Masa sewa", group: "Objek Sewa" },
  { key: "harga_sewa", label: "Harga sewa / bulan", group: "Objek Sewa" },
  { key: "deposit", label: "Nominal deposit", group: "Objek Sewa" },
  { key: "denda_per_hari", label: "Denda keterlambatan / hari", group: "Objek Sewa" },
];

export const BA_PLACEHOLDERS: PlaceholderInfo[] = [
  { key: "nama_kosan", label: "Nama kosan", group: "Umum" },
  { key: "nama_kosan_upper", label: "Nama kosan (huruf besar)", group: "Umum" },
  { key: "judul_ba", label: "Judul dokumen BA", group: "Umum" },
  { key: "hari", label: "Hari", group: "Tanggal" },
  { key: "tanggal", label: "Tanggal", group: "Tanggal" },
  { key: "bulan", label: "Bulan", group: "Tanggal" },
  { key: "tahun", label: "Tahun", group: "Tanggal" },
  { key: "keterangan_ba", label: "Teks keterangan serah terima/inspeksi", group: "Umum" },
  { key: "nama_penghuni", label: "Nama penghuni", group: "Penghuni" },
  { key: "nomor_kamar", label: "Nomor kamar", group: "Penghuni" },
  { key: "tanggal_masuk", label: "Tanggal masuk", group: "Penghuni" },
  { key: "tanggal_keluar", label: "Tanggal keluar (checkout)", group: "Penghuni" },
  { key: "daftar_inventaris", label: "Blok HTML checklist inventaris", group: "Inventaris" },
  { key: "nama_pengurus", label: "Nama pengurus", group: "Tanda Tangan" },
  { key: "pernyataan_ba", label: "Pernyataan akhir BA", group: "Umum" },
];

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const DEFAULT_CONTRACT_TEMPLATE = `<div class="kosan-name">{{nama_kosan_upper}}</div>
<h1>PERJANJIAN SEWA KAMAR (KOST)</h1>

<p>Pada hari ini, <strong>{{hari}}</strong>, tanggal <strong>{{tanggal}}</strong> bulan <strong>{{bulan}}</strong> tahun <strong>{{tahun}}</strong>, telah dibuat dan ditandatangani Perjanjian Sewa Kamar (Kost) oleh dan antara:</p>

<h2>PASAL 1. PIHAK-PIHAK</h2>

<p><strong>A. Pihak yang Menyewakan</strong></p>
<table class="field-table">
  <tr><td class="label">Nama Tempat</td><td>{{nama_kosan}}</td></tr>
  <tr><td class="label">Alamat</td><td>{{alamat_kosan}}</td></tr>
  <tr><td class="label">Pengurus</td><td>{{nama_pengurus}}</td></tr>
  <tr><td class="label">Nomor Kontak</td><td>{{telepon_kosan}}</td></tr>
</table>
<p class="party-label">Selanjutnya disebut <strong>PIHAK PERTAMA</strong></p>

<p><strong>B. Penyewa</strong></p>
<table class="field-table">
  <tr><td class="label">Nama</td><td>{{nama_penghuni}}</td></tr>
  <tr><td class="label">Status</td><td>{{status_penghuni}}</td></tr>
  <tr><td class="label">No. KTP</td><td>{{ktp_penghuni}}</td></tr>
  <tr><td class="label">Alamat KTP</td><td>{{alamat_ktp_penghuni}}</td></tr>
  <tr><td class="label">Alamat Korespondensi</td><td>{{alamat_korespondensi}}</td></tr>
  <tr><td class="label">Nomor Kontak</td><td>{{telepon_penghuni}}</td></tr>
  <tr><td class="label">Tempat Kerja</td><td>{{tempat_kerja}}</td></tr>
  <tr><td class="label">Alamat Tempat Kerja</td><td>{{alamat_tempat_kerja}}</td></tr>
</table>
<p class="party-label">Selanjutnya disebut <strong>PIHAK KEDUA</strong></p>

{{penghuni_tambahan}}

<p><strong>Keadaan Darurat / Emergency Contact</strong></p>
<table class="field-table">
  <tr><td class="label">Nama</td><td>-</td></tr>
  <tr><td class="label">Nomor Kontak</td><td>{{kontak_darurat}}</td></tr>
</table>

<p>Kedua belah pihak sepakat untuk mengikatkan diri dalam Perjanjian Sewa Kamar (Kost) dengan syarat dan ketentuan sebagai berikut:</p>

<h2>PASAL 2. OBJEK SEWA</h2>
<table class="field-table">
  <tr><td class="label">Unit / Nomor Kamar</td><td><strong>{{nomor_kamar}}</strong></td></tr>
  <tr><td class="label">Tanggal Mulai Sewa</td><td>{{tanggal_mulai_sewa}}</td></tr>
  <tr><td class="label">Masa Sewa</td><td>{{masa_sewa}}</td></tr>
  <tr><td class="label">Harga Sewa per Bulan</td><td><strong>{{harga_sewa}}</strong></td></tr>
</table>
<p><em>Catatan: Sewa dimulai tanggal 1 setiap bulan. Untuk periode awal, penyesuaian prorata (berdasarkan 30 hari) akan diterapkan.</em></p>

<div class="page-break"></div>

<p><strong>Fasilitas yang termasuk dalam harga sewa:</strong></p>
<ol type="a">
  <li>Hak menggunakan kamar pribadi selama masa sewa.</li>
  <li>Hak menggunakan fasilitas bersama seperti WiFi, area parkir, air minum, lobby, dan fasilitas umum lainnya.</li>
  <li>Penerimaan laporan/tagihan dan bukti pembayaran.</li>
  <li>Listrik dan air dibayar berdasarkan pemakaian aktual dan ditagih terpisah dari sewa bulanan.</li>
</ol>

<h2>PASAL 3. JANGKA WAKTU DAN PEMBAYARAN</h2>
<ol>
  <li>Masa sewa dihitung per bulan (±30 hari kalender) dan diperpanjang otomatis setiap bulan kecuali ada pemberitahuan pengakhiran minimal 7 (tujuh) hari sebelum jatuh tempo.</li>
  <li>PIHAK KEDUA wajib membayar deposit sebesar <strong>{{deposit}}</strong> (satu kali pembayaran).</li>
  <li>Deposit bukan merupakan pembayaran sewa dan tidak dapat digunakan untuk bulan terakhir.</li>
  <li>Sewa wajib dibayar paling lambat tanggal <strong>2</strong> setiap bulannya.</li>
  <li>Keterlambatan lebih dari 3 (tiga) hari kalender dikenakan denda <strong>{{denda_per_hari}}</strong> per hari.</li>
  <li>Jika pembayaran terlambat lebih dari 14 (empat belas) hari, PIHAK PERTAMA berhak memutus akses fasilitas atau mengakhiri perjanjian secara sepihak.</li>
</ol>

<h2>PASAL 4. DEPOSIT DAN PENGEMBALIANNYA</h2>
<ol>
  <li>Deposit dikembalikan setelah PIHAK KEDUA mengakhiri sewa dan memenuhi seluruh kewajiban.</li>
  <li>Deposit dapat dipotong untuk: tunggakan sewa, tagihan listrik/air, kerusakan fasilitas, kehilangan inventaris, biaya pembersihan berlebihan.</li>
  <li>Pengembalian deposit diproses paling lambat 7 (tujuh) hari kerja setelah inspeksi kamar selesai.</li>
</ol>

<h2>PASAL 5. KEWAJIBAN PIHAK KEDUA</h2>
<ol>
  <li>Mematuhi seluruh peraturan di {{nama_kosan}}.</li>
  <li>Menjaga kebersihan, keamanan, dan ketertiban.</li>
  <li>Merawat seluruh fasilitas kamar dan bersama.</li>
  <li>Tidak menyewakan atau meminjamkan kamar tanpa persetujuan tertulis PIHAK PERTAMA.</li>
  <li>Melaporkan kerusakan fasilitas segera setelah diketahui.</li>
  <li>Bertanggung jawab penuh atas barang pribadi.</li>
  <li>Menjaga hubungan baik dengan penghuni lain.</li>
</ol>

<div class="page-break"></div>

<h2>PASAL 6. LARANGAN</h2>
<ol>
  <li>Menggunakan kamar untuk kegiatan ilegal.</li>
  <li>Menyimpan narkotika, senjata, bahan peledak, atau barang terlarang.</li>
  <li>Membuat kebisingan atau mengganggu penghuni lain.</li>
  <li>Mengubah kamar atau instalasi listrik tanpa izin.</li>
  <li>Menerima tamu menginap tanpa persetujuan pengelola.</li>
  <li>Menggunakan alamat kosan untuk kegiatan usaha tanpa izin.</li>
</ol>

<h2>PASAL 7. TAMU DAN KEAMANAN</h2>
<ol>
  <li>Tamu wajib mematuhi peraturan rumah.</li>
  <li>PIHAK KEDUA bertanggung jawab penuh atas tamunya.</li>
  <li>PIHAK PERTAMA berhak menolak tamu yang mengganggu keamanan atau kenyamanan.</li>
</ol>

<h2>PASAL 8. TANGGUNG JAWAB DAN PEMBEBASAN</h2>
<ol>
  <li>PIHAK KEDUA bertanggung jawab atas seluruh tindakan pribadi selama tinggal.</li>
  <li>Masalah hukum yang melibatkan PIHAK KEDUA menjadi tanggung jawabnya sendiri.</li>
  <li>PIHAK PERTAMA dibebaskan dari tuntutan hukum akibat tindakan PIHAK KEDUA.</li>
</ol>

<h2>PASAL 9. PENGAKHIRAN SEWA</h2>
<ol>
  <li>PIHAK KEDUA wajib memberitahukan minimal 7 (tujuh) hari sebelum check-out.</li>
  <li>Tidak ada pengembalian sewa untuk bulan yang tersisa jika check-out lebih awal.</li>
  <li>Kamar harus dikembalikan sesuai daftar inventaris awal.</li>
</ol>

<h2>PASAL 10. PENYELESAIAN PERSELISIHAN</h2>
<p>Perselisihan diselesaikan melalui musyawarah. Jika tidak tercapai kesepakatan, mengikuti hukum Republik Indonesia.</p>

<p>Demikian Perjanjian ini dibuat dalam keadaan sadar, sehat, tanpa paksaan dari pihak manapun, dan berlaku mengikat bagi kedua belah pihak.</p>

<p>Dibuat di : <strong>{{lokasi_kontrak}}</strong><br />
Tanggal : <strong>{{tanggal_short}}</strong></p>

<div class="signature">
  <div class="signature-box">
    <p><strong>PIHAK PERTAMA</strong></p>
    <p>{{nama_kosan}}</p>
    <div class="signature-line"></div>
    <p>({{nama_pengurus}})</p>
  </div>
  <div class="signature-box">
    <p><strong>PIHAK KEDUA</strong></p>
    <p class="materai">Materai Rp10.000</p>
    <div class="signature-line"></div>
    <p>({{nama_penghuni}})</p>
  </div>
</div>`;

export const DEFAULT_BA_TEMPLATE = `<div class="kosan-name">{{nama_kosan_upper}}</div>
<h1>{{judul_ba}}</h1>

<p>Pada hari ini, <strong>{{hari}}</strong>, tanggal <strong>{{tanggal}}</strong> bulan <strong>{{bulan}}</strong> tahun <strong>{{tahun}}</strong>, {{keterangan_ba}}</p>

<table class="field-table">
  <tr><td class="label">Nama Penghuni</td><td>{{nama_penghuni}}</td></tr>
  <tr><td class="label">Kamar</td><td>{{nomor_kamar}}</td></tr>
  <tr><td class="label">Tanggal Masuk</td><td>{{tanggal_masuk}}</td></tr>
  {{baris_tanggal_keluar}}
</table>

<h2>Lampiran Inventaris Kamar (Checklist)</h2>
<ul class="checklist">{{daftar_inventaris}}</ul>

<p>{{pernyataan_ba}}</p>

<div class="signature">
  <div class="signature-box">
    <p><strong>PIHAK PERTAMA</strong></p>
    <p>{{nama_kosan}}</p>
    <div class="signature-line"></div>
    <p>({{nama_pengurus}})</p>
  </div>
  <div class="signature-box">
    <p><strong>PIHAK KEDUA</strong></p>
    <p>&nbsp;</p>
    <div class="signature-line"></div>
    <p>({{nama_penghuni}})</p>
  </div>
</div>`;

export const SAMPLE_TENANT: ContractTenant = {
  id: 0,
  checkIn: new Date(),
  dueDate: null,
  monthlyRent: 1500000,
  deposit: 1500000,
  leaseDuration: "1 Bulan",
  emergencyPhone: "08123456789",
  additionalOccupants: [],
  user: {
    name: "Budi Santoso",
    phone: "08129876543",
    ktp: "3201010101010001",
    maritalStatus: "SINGLE",
    ktpAddress: "Jl. Merdeka No. 10, Jakarta",
    correspondenceAddress: "Jl. Merdeka No. 10, Jakarta",
    workplace: "PT Contoh Indonesia",
    workplaceAddress: "Jl. Sudirman No. 1, Jakarta",
  },
  room: { roomNumber: "Ungu 1", floor: 2 },
};

export const SAMPLE_PROFILE: ContractProfile = {
  name: "Sixty Six Home Sweet Home",
  address: "Bida Asri 1 Blok C1 No. 65–66",
  phone: "08123456789",
  email: "info@kosan.com",
  managerName: "Ibu Yuli",
  contractLocation: "Tangerang",
  latePenaltyPerDay: 50000,
  contractTemplate: null,
  inventoryBaTemplate: null,
};

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateParts(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return {
    dayName: DAY_NAMES[d.getDay()],
    date: String(d.getDate()),
    month: getMonthName(d.getMonth() + 1),
    year: String(d.getFullYear()),
    short: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`,
  };
}

function relationshipLabel(rel: string): string {
  const map: Record<string, string> = {
    SPOUSE: "Pasangan", SIBLING: "Saudara", OTHER: "Lainnya",
    Pasangan: "Pasangan", Saudara: "Saudara", Lainnya: "Lainnya",
  };
  return map[rel] || rel || "-";
}

export function renderAdditionalOccupantsHtml(additionalOccupants: unknown): string {
  const occupants = parseAdditionalOccupants(additionalOccupants);
  if (occupants.length === 0) {
    return `<p><em>Tidak ada penghuni tambahan.</em></p>`;
  }
  return occupants.map((o) => {
    const extra = o as AdditionalOccupant & {
      relationship?: string;
      ktpAddress?: string;
      phone?: string;
    };
    return `
    <p><strong>Penghuni tambahan Pihak Kedua</strong></p>
    <p>Status hubungan: ${esc(relationshipLabel(extra.relationship || ""))}</p>
    <table class="field-table">
      <tr><td class="label">Nama</td><td>${esc(extra.name)}</td></tr>
      <tr><td class="label">No. KTP</td><td>${esc(extra.ktp)}</td></tr>
      <tr><td class="label">Alamat KTP</td><td>${esc(extra.ktpAddress)}</td></tr>
      <tr><td class="label">Nomor Kontak</td><td>${esc(extra.phone)}</td></tr>
    </table>`;
  }).join("");
}

export function renderInventoryListHtml(items: InventoryItem[]): string {
  if (items.length === 0) {
    return `<li>Kunci kamar</li><li>Kasur</li><li>Lemari</li><li>AC</li><li>WiFi akses</li>`;
  }
  return items.map((i) =>
    `<li class="${i.checked ? "checked" : ""}">${esc(i.name)}${i.quantity > 1 ? ` (${i.quantity})` : ""}</li>`
  ).join("");
}

export function buildContractMergeVars(
  profile: ContractProfile,
  tenant: ContractTenant,
  signDate?: Date
): Record<string, string> {
  const sign = signDate || new Date();
  const parts = formatDateParts(sign);
  const checkInParts = formatDateParts(tenant.checkIn);
  const leaseMonths = monthsFromLeaseValue(tenant.leaseDuration || "1 Bulan");
  const roomLabel = `Lantai ${tenant.room.floor} - ${tenant.room.roomNumber}`;
  const deposit = Number(tenant.deposit);
  const rent = Number(tenant.monthlyRent);
  const penalty = Number(profile.latePenaltyPerDay) || 50000;
  const location = profile.contractLocation || profile.address?.split(",")[0] || "Tangerang";
  const masaSewa = leaseMonths > 0
    ? `${leaseMonths} bulan (diperpanjang otomatis per bulan kecuali ada pemberitahuan)`
    : `${tenant.leaseDuration || "1 bulan"}`;

  return {
    nama_kosan: esc(profile.name),
    nama_kosan_upper: esc(profile.name).toUpperCase(),
    alamat_kosan: esc(profile.address),
    nama_pengurus: esc(profile.managerName || "Pengurus Kosan"),
    telepon_kosan: esc(profile.phone),
    hari: parts.dayName,
    tanggal: parts.date,
    bulan: parts.month,
    tahun: parts.year,
    tanggal_short: parts.short,
    lokasi_kontrak: esc(location),
    nama_penghuni: esc(tenant.user.name),
    status_penghuni: esc(formatMarital(tenant.user.maritalStatus)),
    ktp_penghuni: esc(tenant.user.ktp),
    alamat_ktp_penghuni: esc(tenant.user.ktpAddress),
    alamat_korespondensi: esc(tenant.user.correspondenceAddress || tenant.user.ktpAddress),
    telepon_penghuni: esc(tenant.user.phone),
    tempat_kerja: esc(tenant.user.workplace),
    alamat_tempat_kerja: esc(tenant.user.workplaceAddress),
    penghuni_tambahan: renderAdditionalOccupantsHtml(tenant.additionalOccupants),
    kontak_darurat: esc(tenant.emergencyPhone),
    nomor_kamar: esc(roomLabel),
    tanggal_mulai_sewa: checkInParts.short,
    masa_sewa: masaSewa,
    harga_sewa: formatCurrency(rent),
    deposit: formatCurrency(deposit > 0 ? deposit : 1500000),
    denda_per_hari: formatCurrency(penalty),
  };
}

export function buildBaMergeVars(
  profile: ContractProfile,
  tenant: ContractTenant,
  items: InventoryItem[],
  type: "checkin" | "checkout" = "checkin"
): Record<string, string> {
  const parts = formatDateParts(new Date());
  const roomLabel = `Lantai ${tenant.room.floor} - ${tenant.room.roomNumber}`;
  const isCheckin = type === "checkin";

  return {
    nama_kosan: esc(profile.name),
    nama_kosan_upper: esc(profile.name).toUpperCase(),
    judul_ba: isCheckin
      ? "BERITA ACARA SERAH TERIMA INVENTARIS KAMAR"
      : "BERITA ACARA INSPEKSI INVENTARIS KAMAR (CHECK-OUT)",
    hari: parts.dayName,
    tanggal: parts.date,
    bulan: parts.month,
    tahun: parts.year,
    keterangan_ba: isCheckin
      ? "telah dilakukan serah terima inventaris kamar dengan rincian sebagai berikut:"
      : "telah dilakukan inspeksi inventaris kamar dengan rincian sebagai berikut:",
    nama_penghuni: esc(tenant.user.name),
    nomor_kamar: esc(roomLabel),
    tanggal_masuk: formatDate(tenant.checkIn),
    tanggal_keluar: tenant.dueDate ? formatDate(tenant.dueDate) : "-",
    baris_tanggal_keluar: isCheckin
      ? ""
      : `<tr><td class="label">Tanggal Keluar</td><td>${tenant.dueDate ? formatDate(tenant.dueDate) : "-"}</td></tr>`,
    daftar_inventaris: renderInventoryListHtml(items),
    nama_pengurus: esc(profile.managerName || "Pengurus"),
    pernyataan_ba: isCheckin
      ? "Kedua belah pihak menyatakan bahwa inventaris di atas telah diserahkan dalam kondisi baik."
      : "Kedua belah pihak menyatakan bahwa inventaris di atas telah diperiksa dan dicatat kondisinya.",
  };
}

export function mergeTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}

export function getContractTemplateBody(custom: string | null | undefined): string {
  return custom?.trim() || DEFAULT_CONTRACT_TEMPLATE;
}

export function getBaTemplateBody(custom: string | null | undefined): string {
  return custom?.trim() || DEFAULT_BA_TEMPLATE;
}
