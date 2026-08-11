import type { NormalizedRole } from "@/lib/rbac";

export type GuideStep = {
  title: string;
  detail: string;
};

export type GuideSection = {
  title: string;
  steps: GuideStep[];
};

export type RoleGuide = {
  role: NormalizedRole;
  title: string;
  summary: string;
  focus: string[];
  sections: GuideSection[];
  tips?: string[];
};

export const ROLE_GUIDE_ORDER: NormalizedRole[] = [
  "SUPER_ADMIN",
  "ENTITY_MANAGER",
  "PROJECT_MANAGER",
  "FRONT_OFFICE",
  "FINANCE",
  "MAINTENANCE",
  "TENANT",
];

export const USER_GUIDES: Record<NormalizedRole, RoleGuide> = {
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    title: "Super Admin",
    summary:
      "Menguasai seluruh organisasi: struktur holding/entity/project, semua modul operasional, akun, dan hak akses.",
    focus: [
      "Struktur organisasi & project",
      "Semua modul (kamar, penghuni, keuangan, inventaris)",
      "Akun pengguna & Menu & Hak Akses",
      "Laporan & pengumuman",
    ],
    sections: [
      {
        title: "Persiapan awal",
        steps: [
          {
            title: "Login & pilih konteks",
            detail: "Masuk dengan akun Super Admin, lalu pastikan Entity dan Project di header sudah benar.",
          },
          {
            title: "Atur struktur organisasi",
            detail: "Buka Pengaturan → Struktur Organisasi untuk holding, entity, project, gedung, dan lantai.",
          },
          {
            title: "Atur profil kosan",
            detail: "Di Pengaturan → Profil / Pengaturan Kosan, lengkapi paket sewa, grace period, dan denda keterlambatan.",
          },
        ],
      },
      {
        title: "Mengelola akses tim",
        steps: [
          {
            title: "Buat akun staf & penghuni",
            detail: "Buka Daftar Akun untuk menambah pengelola atau akun portal penghuni.",
          },
          {
            title: "Sesuaikan menu per peran",
            detail: "Di Pengaturan → Menu & Hak Akses, aktifkan/nonaktifkan menu sesuai kebutuhan organisasi.",
          },
        ],
      },
      {
        title: "Operasional harian",
        steps: [
          {
            title: "Pantau Dashboard",
            detail: "Cek okupansi, penghuni aktif, dan ringkasan keuangan.",
          },
          {
            title: "Override proses penting",
            detail: "Bantu Front Office / Finance / Maintenance bila ada persetujuan, koreksi data, atau laporan.",
          },
        ],
      },
    ],
    tips: [
      "Ganti password akun demo sebelum dipakai produksi.",
      "Hak akses default bisa berbeda setelah diubah di Menu & Hak Akses.",
    ],
  },

  ENTITY_MANAGER: {
    role: "ENTITY_MANAGER",
    title: "Entity Manager",
    summary:
      "Mengelola project di bawah entity yang ditugaskan: operasional penuh hingga laporan, tanpa mengatur organisasi pusat.",
    focus: [
      "Project di entity Anda",
      "Kamar, penghuni, kontrak",
      "Keuangan, inventaris, utilitas",
      "Akun & laporan",
    ],
    sections: [
      {
        title: "Mulai kerja",
        steps: [
          {
            title: "Pilih Entity & Project",
            detail: "Pastikan konteks di header sesuai lokasi yang sedang dikelola.",
          },
          {
            title: "Kelola project",
            detail: "Gunakan Pengaturan → Entity & Project untuk project di bawah entity Anda.",
          },
        ],
      },
      {
        title: "Operasional",
        steps: [
          {
            title: "Kamar & penghuni",
            detail: "Input kamar, proses calon penghuni hingga check-in, serta pantau penghuni aktif.",
          },
          {
            title: "Keuangan & inventaris",
            detail: "Pantau pemasukan/pengeluaran, utilitas, aset kamar, dan maintenance.",
          },
          {
            title: "Laporan",
            detail: "Cetak laporan okupansi dan keuangan sesuai periode yang dibutuhkan.",
          },
        ],
      },
    ],
    tips: ["Jika project tidak muncul, minta Super Admin menambahkan akses entity/project Anda."],
  },

  PROJECT_MANAGER: {
    role: "PROJECT_MANAGER",
    title: "Project Manager",
    summary:
      "Manajer operasional di lokasi kosan: kamar, penghuni, inventaris, maintenance, dan pengawasan keuangan.",
    focus: [
      "Kamar & penghuni (penuh)",
      "Inventaris & utilitas",
      "Maintenance & inspeksi",
      "Lihat tagihan & laporan",
    ],
    sections: [
      {
        title: "Alur penghuni baru",
        steps: [
          {
            title: "Input calon",
            detail: "Penghuni → Input Penghuni Baru, lalu proses di Calon Penghuni.",
          },
          {
            title: "Kontrak & check-in",
            detail: "Kirim kontrak, unggah TTD, generate BA inventaris, lalu check-in aktif.",
          },
          {
            title: "Checkout",
            detail: "Saat keluar, jalankan inspeksi inventaris dan selesaikan checkout agar kamar kosong kembali.",
          },
        ],
      },
      {
        title: "Mengawasi lokasi",
        steps: [
          {
            title: "Dashboard & laporan",
            detail: "Pantau okupansi dan ringkasan keuangan; cetak laporan bila diperlukan.",
          },
          {
            title: "Koordinasi tim",
            detail: "Serahkan detail tagihan ke Finance dan tiket perbaikan ke Maintenance.",
          },
        ],
      },
    ],
  },

  FRONT_OFFICE: {
    role: "FRONT_OFFICE",
    title: "Front Office / Pengurus",
    summary:
      "Pelayanan harian: kamar, calon/penghuni aktif, kontrak, permintaan perbaikan, dan pengumuman.",
    focus: [
      "Informasi kamar",
      "Calon → aktif (kontrak & check-in)",
      "Penghuni aktif & pindah kamar",
      "Permintaan perbaikan",
    ],
    sections: [
      {
        title: "Kamar",
        steps: [
          {
            title: "Tambah & pantau kamar",
            detail: "Menu Informasi Kamar → Input Kamar Baru, Kamar Kosong, dan Kamar Terisi.",
          },
        ],
      },
      {
        title: "Penghuni baru (langkah demi langkah)",
        steps: [
          {
            title: "1. Input data",
            detail: "Penghuni → Input Penghuni Baru. Status: Menunggu Verifikasi.",
          },
          {
            title: "2. Setujui calon",
            detail: "Penghuni → Calon Penghuni → Setujui. Status: Disetujui.",
          },
          {
            title: "3. Kirim & TTD kontrak",
            detail: "Kirim kontrak ke email, lalu unggah scan yang sudah ditandatangani.",
          },
          {
            title: "4. BA & check-in",
            detail: "Generate BA inventaris, lalu Check-in Aktif. Kamar menjadi Terisi.",
          },
        ],
      },
      {
        title: "Pelayanan penghuni",
        steps: [
          {
            title: "Penghuni aktif",
            detail: "Update data, catat pembayaran (jika diizinkan), extend sewa, atau mulai checkout.",
          },
          {
            title: "Pindah kamar",
            detail: "Proses permohonan di Penghuni → Pindah Unit / Kamar bersama persetujuan yang diperlukan.",
          },
          {
            title: "Perbaikan",
            detail: "Tangani tiket perbaikan dari penghuni atau buat tiket baru bila perlu.",
          },
        ],
      },
    ],
    tips: ["Keuangan penuh biasanya dikelola role Finance; Anda lebih fokus operasional penghuni."],
  },

  FINANCE: {
    role: "FINANCE",
    title: "Finance",
    summary:
      "Fokus keuangan: tagihan, pembayaran, pemasukan/pengeluaran, dan laporan keuangan.",
    focus: [
      "Keuangan (pemasukan & pengeluaran)",
      "Tagihan & pembayaran",
      "Laporan keuangan",
      "Lihat data penghuni",
    ],
    sections: [
      {
        title: "Pencatatan harian",
        steps: [
          {
            title: "Buka Keuangan",
            detail: "Menu Keuangan → Ringkasan, Pemasukan, atau Pengeluaran.",
          },
          {
            title: "Filter periode",
            detail: "Gunakan filter bulanan, tahunan, atau rentang tanggal sebelum mencatat/melihat data.",
          },
          {
            title: "Catat transaksi",
            detail: "Input pemasukan (sewa, utilitas, dll.) dan pengeluaran operasional dengan keterangan jelas.",
          },
        ],
      },
      {
        title: "Tagihan & laporan",
        steps: [
          {
            title: "Pantau pembayaran penghuni",
            detail: "Cek status bayar dari data penghuni / tagihan yang tersedia di akses Anda.",
          },
          {
            title: "Cetak laporan",
            detail: "Menu Cetak Laporan untuk rekap keuangan yang siap dicetak atau diunduh.",
          },
        ],
      },
    ],
    tips: ["Modul kamar dan inventaris biasanya tidak dibuka untuk Finance."],
  },

  MAINTENANCE: {
    role: "MAINTENANCE",
    title: "Maintenance",
    summary:
      "Fokus inventaris, utilitas, tiket perbaikan, dan inspeksi checkout.",
    focus: [
      "Inventaris & gudang",
      "Aset per kamar",
      "Utilitas & tagihan utilitas",
      "Maintenance & inspeksi checkout",
    ],
    sections: [
      {
        title: "Inventaris",
        steps: [
          {
            title: "Master & template",
            detail: "Isi Master Barang dan Template Kamar agar aset standar siap dipakai.",
          },
          {
            title: "Deploy aset",
            detail: "Pasang aset ke kamar / area bersama; pantau gudang dan pembelian.",
          },
        ],
      },
      {
        title: "Perbaikan & checkout",
        steps: [
          {
            title: "Tiket perbaikan",
            detail: "Buka Inventaris → Maintenance untuk mengerjakan permintaan dari penghuni atau staf.",
          },
          {
            title: "Inspeksi checkout",
            detail: "Saat penghuni keluar, lakukan inspeksi; catat kerusakan yang memengaruhi deposit.",
          },
          {
            title: "Utilitas",
            detail: "Catat meter / pemakaian per kamar dan pantau tagihan utilitas bulanan.",
          },
        ],
      },
    ],
    tips: ["Billing sewa penuh biasanya dikelola Finance; fokus Anda di aset dan perbaikan."],
  },

  TENANT: {
    role: "TENANT",
    title: "Penghuni",
    summary:
      "Portal pribadi untuk melihat kamar, membayar tagihan, mengajukan pindah, dan meminta perbaikan.",
    focus: [
      "Beranda & profil",
      "Tagihan & invoice",
      "Permohonan pindah",
      "Permintaan perbaikan & pengumuman",
    ],
    sections: [
      {
        title: "Setelah login",
        steps: [
          {
            title: "Buka Beranda",
            detail: "Anda langsung masuk Portal. Lihat nomor kamar dan status pembayaran di Beranda.",
          },
          {
            title: "Lengkapi profil",
            detail: "Menu Profil Saya untuk memastikan data diri sudah benar.",
          },
        ],
      },
      {
        title: "Bayar tagihan",
        steps: [
          {
            title: "Buka Tagihan & Invoice",
            detail: "Lihat tagihan sewa/utilitas dan sisa yang harus dibayar.",
          },
          {
            title: "Pilih metode bayar",
            detail: "Bayar via Transfer atau Midtrans (jika diaktifkan pengelola), lalu simpan bukti/invoice.",
          },
        ],
      },
      {
        title: "Layanan lain",
        steps: [
          {
            title: "Minta perbaikan",
            detail: "Permintaan Perbaikan → pilih jenis masalah → isi deskripsi → kirim, lalu pantau statusnya.",
          },
          {
            title: "Ajukan pindah kamar",
            detail: "Permohonan Pindah → isi alasan → kirim. Tunggu persetujuan pengelola.",
          },
          {
            title: "Baca pengumuman",
            detail: "Menu Pengumuman untuk info dari pengelola kosan.",
          },
        ],
      },
    ],
    tips: [
      "Portal hanya untuk data Anda sendiri; menu staf tidak tersedia.",
      "Lupa password? Hubungi pengelola / Front Office.",
    ],
  },
};

export function getGuideForRole(role: string): RoleGuide {
  const key = (ROLE_GUIDE_ORDER.includes(role as NormalizedRole)
    ? role
    : role === "OWNER"
      ? "SUPER_ADMIN"
      : role === "MANAGER"
        ? "PROJECT_MANAGER"
        : "TENANT") as NormalizedRole;
  return USER_GUIDES[key] || USER_GUIDES.TENANT;
}
