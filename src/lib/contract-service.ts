import { formatCurrency, formatDate, getMonthName } from "@/lib/utils";
import { formatMarital, monthsFromLeaseValue, parseAdditionalOccupants } from "@/lib/tenant-utils";

export interface ContractProfile {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  managerName: string | null;
  contractLocation: string | null;
  latePenaltyPerDay: number | string;
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

export function toContractTenant(tenant: {
  id: number;
  checkIn: Date;
  dueDate: Date | null;
  monthlyRent: { toString(): string } | number | string;
  deposit: { toString(): string } | number | string;
  leaseDuration: string | null;
  emergencyPhone: string | null;
  additionalOccupants: unknown;
  user: ContractTenant["user"];
  room: { roomNumber: string; floor: number };
}): ContractTenant {
  return {
    ...tenant,
    monthlyRent: Number(tenant.monthlyRent),
    deposit: Number(tenant.deposit),
    checkIn: tenant.checkIn,
    dueDate: tenant.dueDate,
  };
}

export interface InventoryItem {
  name: string;
  quantity: number;
  checked?: boolean;
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseAmount(v: number | string): number {
  return typeof v === "string" ? parseFloat(v) : v;
}

function formatDateParts(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return {
    dayName: DAY_NAMES[d.getDay()],
    date: d.getDate(),
    month: getMonthName(d.getMonth() + 1),
    year: d.getFullYear(),
    short: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`,
  };
}

function relationshipLabel(rel: string): string {
  const map: Record<string, string> = {
    SPOUSE: "Pasangan",
    SIBLING: "Saudara",
    OTHER: "Lainnya",
    Pasangan: "Pasangan",
    Saudara: "Saudara",
    Lainnya: "Lainnya",
  };
  return map[rel] || rel || "-";
}

function renderAdditionalOccupant(o: {
  relationship?: string;
  name?: string;
  ktp?: string;
  ktpAddress?: string;
  correspondenceAddress?: string;
  phone?: string;
  workplace?: string;
  workplaceAddress?: string;
}): string {
  return `
    <p><strong>Penghuni tambahan Pihak Kedua</strong></p>
    <p>Status hubungan dengan Pihak Penyewa: ${esc(relationshipLabel(o.relationship || ""))}</p>
    <table class="field-table">
      <tr><td class="label">Nama</td><td>${esc(o.name)}</td></tr>
      <tr><td class="label">No. KTP</td><td>${esc(o.ktp)}</td></tr>
      <tr><td class="label">Alamat KTP</td><td>${esc(o.ktpAddress)}</td></tr>
      <tr><td class="label">Alamat Korespondensi</td><td>${esc(o.correspondenceAddress)}</td></tr>
      <tr><td class="label">Nomor Kontak</td><td>${esc(o.phone)}</td></tr>
      <tr><td class="label">Tempat Kerja</td><td>${esc(o.workplace)}</td></tr>
      <tr><td class="label">Alamat Tempat Kerja</td><td>${esc(o.workplaceAddress)}</td></tr>
    </table>`;
}

const CONTRACT_STYLES = `
  @page { margin: 2cm; }
  body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.5; color: #000; max-width: 21cm; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 13pt; margin: 0; }
  .kosan-name { text-align: center; font-size: 14pt; font-weight: bold; margin: 8px 0 16px; }
  h2 { font-size: 11pt; margin: 16px 0 8px; }
  p { margin: 6px 0; text-align: justify; }
  .field-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .field-table td { padding: 3px 6px; vertical-align: top; }
  .field-table .label { width: 180px; font-weight: normal; }
  .party-label { font-weight: bold; margin-top: 12px; }
  ol { padding-left: 20px; }
  ol li { margin-bottom: 4px; text-align: justify; }
  .signature { margin-top: 40px; display: flex; justify-content: space-between; }
  .signature-box { width: 45%; text-align: center; }
  .signature-line { margin-top: 60px; border-top: 1px solid #000; display: inline-block; min-width: 200px; }
  .materai { color: #c00; font-style: italic; font-size: 10pt; }
  .checklist { list-style: none; padding: 0; }
  .checklist li::before { content: "☐ "; }
  .checklist li.checked::before { content: "☑ "; }
  .page-break { page-break-before: always; }
  @media print { body { padding: 0; } }
`;

export function buildContractHtml(
  profile: ContractProfile,
  tenant: ContractTenant,
  signDate?: Date
): string {
  const sign = signDate || new Date();
  const parts = formatDateParts(sign);
  const checkInParts = formatDateParts(tenant.checkIn);
  const occupants = parseAdditionalOccupants(tenant.additionalOccupants);
  const leaseMonths = monthsFromLeaseValue(tenant.leaseDuration || "1 Bulan");
  const roomLabel = `Lantai ${tenant.room.floor} - ${tenant.room.roomNumber}`;
  const deposit = parseAmount(tenant.deposit);
  const rent = parseAmount(tenant.monthlyRent);
  const penalty = parseAmount(profile.latePenaltyPerDay) || 50000;
  const location = profile.contractLocation || profile.address?.split(",")[0] || "Tangerang";

  const additionalHtml =
    occupants.length > 0
      ? occupants.map(renderAdditionalOccupant).join("")
      : `<p><em>Tidak ada penghuni tambahan.</em></p>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Perjanjian Sewa Kamar - ${esc(tenant.user.name)}</title>
  <style>${CONTRACT_STYLES}</style>
</head>
<body>
  <div class="kosan-name">${esc(profile.name).toUpperCase()}</div>
  <h1>PERJANJIAN SEWA KAMAR (KOST)</h1>

  <p>Pada hari ini, <strong>${parts.dayName}</strong>, tanggal <strong>${parts.date}</strong> bulan <strong>${parts.month}</strong> tahun <strong>${parts.year}</strong>, telah dibuat dan ditandatangani Perjanjian Sewa Kamar (Kost) oleh dan antara:</p>

  <h2>PASAL 1. PIHAK-PIHAK</h2>

  <p><strong>A. Pihak yang Menyewakan</strong></p>
  <table class="field-table">
    <tr><td class="label">Nama Tempat</td><td>${esc(profile.name)}</td></tr>
    <tr><td class="label">Alamat</td><td>${esc(profile.address)}</td></tr>
    <tr><td class="label">Pengurus</td><td>${esc(profile.managerName || "Pengurus Kosan")}</td></tr>
    <tr><td class="label">Nomor Kontak</td><td>${esc(profile.phone)}</td></tr>
  </table>
  <p class="party-label">Selanjutnya disebut <strong>PIHAK PERTAMA</strong></p>

  <p><strong>B. Penyewa</strong></p>
  <table class="field-table">
    <tr><td class="label">Nama</td><td>${esc(tenant.user.name)}</td></tr>
    <tr><td class="label">Status</td><td>${esc(formatMarital(tenant.user.maritalStatus))}</td></tr>
    <tr><td class="label">No. KTP</td><td>${esc(tenant.user.ktp)}</td></tr>
    <tr><td class="label">Alamat KTP</td><td>${esc(tenant.user.ktpAddress)}</td></tr>
    <tr><td class="label">Alamat Korespondensi</td><td>${esc(tenant.user.correspondenceAddress || tenant.user.ktpAddress)}</td></tr>
    <tr><td class="label">Nomor Kontak</td><td>${esc(tenant.user.phone)}</td></tr>
    <tr><td class="label">Tempat Kerja</td><td>${esc(tenant.user.workplace)}</td></tr>
    <tr><td class="label">Alamat Tempat Kerja</td><td>${esc(tenant.user.workplaceAddress)}</td></tr>
  </table>
  <p class="party-label">Selanjutnya disebut <strong>PIHAK KEDUA</strong></p>

  ${additionalHtml}

  <p><strong>Keadaan Darurat / Emergency Contact</strong></p>
  <table class="field-table">
    <tr><td class="label">Nama</td><td>-</td></tr>
    <tr><td class="label">Nomor Kontak</td><td>${esc(tenant.emergencyPhone)}</td></tr>
  </table>

  <p>Kedua belah pihak sepakat untuk mengikatkan diri dalam Perjanjian Sewa Kamar (Kost) dengan syarat dan ketentuan sebagai berikut:</p>

  <h2>PASAL 2. OBJEK SEWA</h2>
  <table class="field-table">
    <tr><td class="label">Unit / Nomor Kamar</td><td><strong>${esc(roomLabel)}</strong></td></tr>
    <tr><td class="label">Tanggal Mulai Sewa</td><td>${checkInParts.short}</td></tr>
    <tr><td class="label">Masa Sewa</td><td>${leaseMonths > 0 ? `${leaseMonths} bulan` : tenant.leaseDuration || "1 bulan"} (diperpanjang otomatis per bulan kecuali ada pemberitahuan)</td></tr>
    <tr><td class="label">Harga Sewa per Bulan</td><td><strong>${formatCurrency(rent)}</strong></td></tr>
  </table>
  <p><em>Catatan: Sewa dimulai tanggal 1 setiap bulan. Untuk periode awal, penyesuaian prorata (berdasarkan 30 hari) akan diterapkan.</em></p>
  <p><em>Perubahan harga sewa memerlukan pemberitahuan minimal 1 (satu) bulan sebelumnya dan persetujuan PIHAK KEDUA.</em></p>

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
    <li>PIHAK KEDUA wajib membayar deposit sebesar <strong>${formatCurrency(deposit > 0 ? deposit : 1500000)}</strong> (satu kali pembayaran).</li>
    <li>Deposit bukan merupakan pembayaran sewa dan tidak dapat digunakan untuk bulan terakhir.</li>
    <li>Sewa wajib dibayar paling lambat tanggal <strong>2</strong> setiap bulannya.</li>
    <li>Keterlambatan lebih dari 3 (tiga) hari kalender dikenakan denda <strong>${formatCurrency(penalty)}</strong> per hari.</li>
    <li>Jika pembayaran terlambat lebih dari 14 (empat belas) hari, PIHAK PERTAMA berhak memutus akses fasilitas atau mengakhiri perjanjian secara sepihak.</li>
  </ol>

  <h2>PASAL 4. DEPOSIT DAN PENGEMBALIANNYA</h2>
  <ol>
    <li>Deposit dikembalikan setelah PIHAK KEDUA mengakhiri sewa dan memenuhi seluruh kewajiban.</li>
    <li>Deposit dapat dipotong untuk: tunggakan sewa, tagihan listrik/air yang belum dibayar, kerusakan fasilitas akibat kelalaian penghuni, kehilangan inventaris kamar, biaya pembersihan berlebihan jika kamar dikembalikan dalam kondisi tidak layak.</li>
    <li>Pengembalian deposit diproses paling lambat 7 (tujuh) hari kerja setelah inspeksi kamar selesai dilakukan.</li>
  </ol>

  <h2>PASAL 5. KEWAJIBAN PIHAK KEDUA</h2>
  <ol>
    <li>Mematuhi seluruh peraturan di ${esc(profile.name)}.</li>
    <li>Menjaga kebersihan, keamanan, dan ketertiban.</li>
    <li>Merawat seluruh fasilitas kamar dan bersama.</li>
    <li>Tidak menyewakan, memindahkan, atau meminjamkan kamar kepada pihak lain tanpa persetujuan tertulis PIHAK PERTAMA.</li>
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
    <li>Pelanggaran dapat mengakibatkan pengakhiran sepihak tanpa pengembalian deposit.</li>
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
    <li>PIHAK PERTAMA tidak bertanggung jawab atas kehilangan barang pribadi kecuali terbukti kelalaian pengelola.</li>
  </ol>

  <h2>PASAL 9. PENGAKHIRAN SEWA</h2>
  <ol>
    <li>PIHAK KEDUA wajib memberitahukan minimal 7 (tujuh) hari sebelum check-out.</li>
    <li>Tidak ada pengembalian sewa untuk bulan yang tersisa jika check-out lebih awal.</li>
    <li>Kamar harus dikembalikan dalam kondisi bersih dan baik sesuai daftar inventaris awal.</li>
  </ol>

  <h2>PASAL 10. PENYELESAIAN PERSELISIHAN</h2>
  <p>Perselisihan diselesaikan melalui musyawarah. Jika tidak tercapai kesepakatan, mengikuti hukum Republik Indonesia.</p>

  <p>Demikian Perjanjian ini dibuat dalam keadaan sadar, sehat, tanpa paksaan dari pihak manapun, dan berlaku mengikat bagi kedua belah pihak.</p>

  <p>Dibuat di : <strong>${esc(location)}</strong><br />
  Tanggal : <strong>${parts.short}</strong></p>

  <div class="signature">
    <div class="signature-box">
      <p><strong>PIHAK PERTAMA</strong></p>
      <p>${esc(profile.name)}</p>
      <div class="signature-line"></div>
      <p>(${esc(profile.managerName || "____________________")})</p>
    </div>
    <div class="signature-box">
      <p><strong>PIHAK KEDUA</strong></p>
      <p class="materai">Materai Rp10.000</p>
      <div class="signature-line"></div>
      <p>(${esc(tenant.user.name)})</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildInventoryBaHtml(
  profile: ContractProfile,
  tenant: ContractTenant,
  items: InventoryItem[],
  type: "checkin" | "checkout" = "checkin"
): string {
  const parts = formatDateParts(new Date());
  const roomLabel = `Lantai ${tenant.room.floor} - ${tenant.room.roomNumber}`;
  const title = type === "checkin" ? "BERITA ACARA SERAH TERIMA INVENTARIS KAMAR" : "BERITA ACARA INSPEKSI INVENTARIS KAMAR (CHECK-OUT)";
  const checklist = items.length > 0
    ? items.map((i) => `<li class="${i.checked ? "checked" : ""}">${esc(i.name)}${i.quantity > 1 ? ` (${i.quantity})` : ""}</li>`).join("")
    : `<li>Kunci kamar</li><li>Kunci pagar</li><li>Kasur</li><li>Lemari</li><li>AC</li><li>Lampu</li><li>Stop kontak</li><li>Kamar mandi</li><li>Water heater</li><li>Meja / Kursi</li><li>WiFi akses</li><li>Lainnya: _______________</li>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${title} - ${esc(tenant.user.name)}</title>
  <style>${CONTRACT_STYLES}</style>
</head>
<body>
  <div class="kosan-name">${esc(profile.name).toUpperCase()}</div>
  <h1>${title}</h1>

  <p>Pada hari ini, <strong>${parts.dayName}</strong>, tanggal <strong>${parts.date}</strong> bulan <strong>${parts.month}</strong> tahun <strong>${parts.year}</strong>, telah dilakukan ${type === "checkin" ? "serah terima" : "inspeksi"} inventaris kamar dengan rincian sebagai berikut:</p>

  <table class="field-table">
    <tr><td class="label">Nama Penghuni</td><td>${esc(tenant.user.name)}</td></tr>
    <tr><td class="label">Kamar</td><td>${esc(roomLabel)}</td></tr>
    <tr><td class="label">Tanggal Masuk</td><td>${formatDate(tenant.checkIn)}</td></tr>
    ${type === "checkout" ? `<tr><td class="label">Tanggal Keluar</td><td>${tenant.dueDate ? formatDate(tenant.dueDate) : "-"}</td></tr>` : ""}
  </table>

  <h2>Lampiran Inventaris Kamar (Checklist)</h2>
  <ul class="checklist">${checklist}</ul>

  <p>Kedua belah pihak menyatakan bahwa inventaris di atas telah ${type === "checkin" ? "diserahkan dalam kondisi baik" : "diperiksa dan dicatat kondisinya"}.</p>

  <div class="signature">
    <div class="signature-box">
      <p><strong>PIHAK PERTAMA</strong></p>
      <p>${esc(profile.name)}</p>
      <div class="signature-line"></div>
      <p>(${esc(profile.managerName || "Pengurus")})</p>
    </div>
    <div class="signature-box">
      <p><strong>PIHAK KEDUA</strong></p>
      <p>&nbsp;</p>
      <div class="signature-line"></div>
      <p>(${esc(tenant.user.name)})</p>
    </div>
  </div>
</body>
</html>`;
}

export async function getRoomInventoryItems(roomId: number): Promise<InventoryItem[]> {
  const { prisma } = await import("@/lib/prisma");
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      template: { include: { items: { include: { item: true } } } },
      roomAssets: { include: { item: true }, where: { status: { in: ["DEPLOYED", "IN_USE"] } } },
    },
  });
  if (!room) return [];

  if (room.template?.items.length) {
    return room.template.items.map((ti) => ({
      name: ti.item.name,
      quantity: ti.quantity,
      checked: true,
    }));
  }

  const grouped = new Map<string, number>();
  for (const a of room.roomAssets) {
    const n = a.item.name;
    grouped.set(n, (grouped.get(n) || 0) + 1);
  }
  return Array.from(grouped.entries()).map(([name, quantity]) => ({
    name,
    quantity,
    checked: true,
  }));
}
