# Panduan Penggunaan KosanKu

Panduan ini menjelaskan cara memakai **KosanKu** untuk mengelola kosan sehari-hari. Ditulis untuk pengguna (bukan developer): pengelola, staf, dan penghuni.

> **Di dalam aplikasi:** buka menu **Panduan Penggunaan** (`/panduan`). Isi panduan ditampilkan per peran — staf bisa melihat semua role, penghuni hanya melihat panduan portal.

---

## Daftar Isi

1. [Apa itu KosanKu?](#1-apa-itu-kosanku)
2. [Cara Login & Keluar](#2-cara-login--keluar)
3. [Peran (Roles) Pengguna](#3-peran-roles-pengguna)
4. [Ringkasan Hak Akses per Peran](#4-ringkasan-hak-akses-per-peran)
5. [Panduan untuk Staf / Pengelola](#5-panduan-untuk-staf--pengelola)
6. [Panduan untuk Penghuni (Portal)](#6-panduan-untuk-penghuni-portal)
7. [Alur Kerja Umum](#7-alur-kerja-umum)
8. [Istilah yang Sering Dipakai](#8-istilah-yang-sering-dipakai)
9. [Tips & FAQ](#9-tips--faq)

---

## 1. Apa itu KosanKu?

KosanKu adalah aplikasi web untuk mengelola kosan, mencakup:

- Informasi kamar (kosong / terisi)
- Data penghuni & kontrak sewa
- Tagihan, pembayaran, dan keuangan
- Utilitas (listrik, air, dll.)
- Inventaris & aset kamar
- Permintaan perbaikan / maintenance
- Laporan & pengumuman

Sistem mendukung **banyak lokasi (project)**. Staf yang punya akses ke beberapa project bisa berganti Entity / Project lewat pemilih di bagian atas halaman.

Ada **dua tampilan berbeda**:

| Jenis akun | Setelah login masuk ke | Digunakan oleh |
|------------|------------------------|----------------|
| Staf / Pengelola | **Dashboard** (`/dashboard`) | Super Admin, Entity Manager, Project Manager, Front Office, Finance, Maintenance |
| Penghuni | **Portal Penghuni** (`/portal`) | Tenant / penghuni |

---

## 2. Cara Login & Keluar

### Login

1. Buka halaman login aplikasi.
2. Masukkan **email** dan **password** yang diberikan pengelola.
3. Klik **Masuk**.
4. Sistem mengarahkan Anda sesuai peran:
   - Penghuni → Portal Penghuni
   - Staf → Dashboard

### Keluar

Klik tombol **Keluar** di menu / sidebar.

> Sesi login aktif sekitar **24 jam**. Setelah itu Anda perlu login ulang.

---

## 3. Peran (Roles) Pengguna

Setiap akun punya **satu peran**. Peran menentukan menu yang terlihat dan aksi yang boleh dilakukan.

### 3.1 Super Admin

**Tugas utama:** menguasai seluruh organisasi (holding → entity → project) dan semua modul.

**Bisa melakukan:**
- Mengatur struktur organisasi (entity, project, gedung, lantai)
- Mengelola semua kamar, penghuni, kontrak, keuangan, inventaris, utilitas
- Mengatur akun pengguna & hak akses menu
- Melihat semua laporan
- Membuat pengumuman

**Cocok untuk:** pemilik / admin pusat.

---

### 3.2 Entity Manager

**Tugas utama:** mengelola project di bawah entity yang ditugaskan.

**Bisa melakukan:**
- Mengelola project di entity-nya
- Operasional penuh: kamar, penghuni, kontrak, inventaris, utilitas, billing, maintenance
- Mengelola akun (sesuai akses)
- Laporan & pengumuman

**Tidak bisa:** mengatur organisasi di level holding/entity secara penuh seperti Super Admin.

**Cocok untuk:** manajer regional / pengelola beberapa kosan dalam satu badan usaha.

---

### 3.3 Project Manager

**Tugas utama:** operasional satu atau beberapa project kosan.

**Bisa melakukan:**
- Mengelola kamar, penghuni, kontrak
- Inventaris & utilitas
- Maintenance & inspeksi
- Melihat tagihan & pembayaran (umumnya view)
- Laporan
- Mengelola akun pengelola / penghuni (sesuai akses)
- Pengumuman

**Cocok untuk:** manajer operasional di lokasi kosan.

---

### 3.4 Front Office (Pengurus)

**Tugas utama:** pelayanan harian: kamar, penghuni, kontrak, dan permintaan perbaikan.

**Bisa melakukan:**
- Input & kelola kamar
- Input calon penghuni, approve, kirim kontrak, check-in
- Catat pembayaran (lihat tagihan)
- Buat / tangani permintaan perbaikan
- Lihat inventaris & utilitas (umumnya view)
- Laporan terbatas
- Pengumuman

**Tidak fokus pada:** pengaturan organisasi, akun staf (biasanya tidak ada akses), dan pengelolaan keuangan penuh.

**Cocok untuk:** resepsionis / pengurus kosan.

---

### 3.5 Finance

**Tugas utama:** keuangan, tagihan, pembayaran, dan laporan keuangan.

**Bisa melakukan:**
- Mengelola pemasukan & pengeluaran
- Mengelola billing & payment
- Melihat data penghuni (view)
- Laporan keuangan lengkap
- Pengumuman

**Tidak fokus pada:** input kamar, inventaris, atau maintenance.

**Cocok untuk:** bagian keuangan / kasir.

---

### 3.6 Maintenance

**Tugas utama:** inventaris, utilitas, perbaikan, dan inspeksi.

**Bisa melakukan:**
- Mengelola inventaris, gudang, aset kamar
- Mengelola utilitas & tagihan utilitas
- Menangani tiket perbaikan & inspeksi checkout
- Melihat kamar & penghuni (view)
- Laporan terbatas

**Tidak fokus pada:** billing/payment penuh dan pengaturan akun.

**Cocok untuk:** teknisi / staf maintenance.

---

### 3.7 Penghuni (Tenant)

**Tugas utama:** memakai **Portal Penghuni** untuk urusan pribadi.

**Bisa melakukan:**
- Melihat profil & info kamar
- Melihat & membayar tagihan
- Mengajukan pindah kamar
- Membuat permintaan perbaikan
- Membaca pengumuman

**Tidak bisa:** membuka menu Dashboard staf (kamar, keuangan, akun, dll.).

---

### Catatan peran lama (legacy)

| Peran lama di database | Diperlakukan sebagai |
|------------------------|----------------------|
| Owner / Pemilik | Super Admin |
| Manager | Project Manager |

---

## 4. Ringkasan Hak Akses per Peran

Keterangan level:
- **Penuh** = bisa melihat & mengubah
- **Lihat** = hanya melihat
- **Terbatas** = sebagian fitur
- **Sendiri** = hanya data milik sendiri
- **Buat** = bisa membuat (mis. tiket perbaikan)
- **—** = tidak ada akses

| Modul | Super Admin | Entity Manager | Project Manager | Front Office | Finance | Maintenance | Penghuni |
|-------|:-----------:|:--------------:|:---------------:|:------------:|:-------:|:-----------:|:--------:|
| Dashboard | Lihat | Lihat | Lihat | Lihat | Lihat | Lihat | Lihat* |
| Organisasi (Entity) | Penuh | — | — | — | — | — | — |
| Project | Penuh | Penuh | — | — | — | — | — |
| Kamar | Penuh | Penuh | Penuh | Penuh | — | Lihat | — |
| Penghuni | Penuh | Penuh | Penuh | Penuh | Lihat | Lihat | Sendiri |
| Kontrak | Penuh | Penuh | Penuh | Penuh | Lihat | — | Sendiri |
| Inventaris | Penuh | Penuh | Penuh | Lihat | — | Penuh | — |
| Utilitas | Penuh | Penuh | Penuh | Lihat | Lihat | Penuh | Sendiri |
| Tagihan | Penuh | Penuh | Lihat | Lihat | Penuh | — | Sendiri |
| Pembayaran | Penuh | Penuh | Lihat | Lihat | Penuh | — | Sendiri |
| Maintenance | Penuh | Penuh | Penuh | Penuh | — | Penuh | Buat |
| Laporan | Penuh | Penuh | Penuh | Terbatas | Penuh | Terbatas | Sendiri |
| Akun | Penuh | Penuh | Penuh | — | — | — | — |
| Pengumuman | Penuh | Penuh | Penuh | Penuh | Penuh | Lihat | Sendiri |

\*Penghuni memakai beranda portal, bukan dashboard staf.

> Hak akses bisa disesuaikan oleh admin lewat **Pengaturan → Menu & Hak Akses**. Tabel di atas adalah **default**.

---

## 5. Panduan untuk Staf / Pengelola

### 5.1 Setelah login

1. Pastikan **Entity** dan **Project** yang dipilih di header sudah benar.
2. Gunakan menu di sidebar sesuai tugas Anda.
3. Menu yang tidak muncul biasanya berarti peran Anda tidak punya akses modul tersebut.

### 5.2 Menu utama staf

| Menu | Fungsi singkat |
|------|----------------|
| **Dashboard** | Ringkasan kamar, penghuni, dan keuangan |
| **Informasi Kamar** | Input kamar baru, daftar kamar terisi / kosong |
| **Penghuni** | Calon, aktif, reservasi, pindah, selesai |
| **Keuangan** | Ringkasan, pemasukan, pengeluaran |
| **Utilitas** | Daftar utilitas, per kamar, tagihan bulanan |
| **Inventaris** | Barang, template, gudang, aset kamar, inspeksi |
| **Cetak Laporan** | Laporan okupansi & keuangan |
| **Pengaturan** | Organisasi, profil kosan, template kontrak, hak akses |
| **Daftar Akun** | Akun pengelola & akun penghuni |

---

### 5.3 Mengelola kamar

1. Buka **Informasi Kamar**.
2. Untuk menambah kamar: **Kamar Baru** → isi nomor, tipe, harga, status, dll. → simpan.
3. Pantau:
   - **Kamar Kosong** — siap diisi
   - **Kamar Terisi** — sedang dihuni

---

### 5.4 Mendaftarkan penghuni baru (alur kontrak)

Alur standar dari calon hingga aktif:

1. **Input Penghuni Baru** (`Penghuni → Baru`)  
   Isi data calon. Status awal: **Menunggu Verifikasi**.

2. **Setujui / Tolak** (`Penghuni → Calon`)  
   - Setujui → status **Disetujui**  
   - Tolak → hapus / batalkan data

3. **Kirim Kontrak**  
   Sistem mengirim kontrak (PDF) ke email calon. Status: **Kontrak Terkirim**.

4. **TTD Manual**  
   Cetak kontrak → ditandatangani (bisa dengan materai) → unggah hasil scan. Status: **Kontrak Ditandatangani**.

5. **Generate BA Inventaris**  
   Buat berita acara serah terima inventaris kamar.

6. **Check-in Aktif**  
   Penghuni menjadi **Aktif**, kamar menjadi **Terisi**.

Setelah itu, data muncul di **Penghuni Aktif**.

**Status yang sering muncul:**
Menunggu Verifikasi → Disetujui → Kontrak Terkirim → Kontrak Ditandatangani → Aktif / Reservasi / Menunggu Checkout / Selesai.

---

### 5.5 Operasional penghuni aktif

Di **Penghuni → Aktif**, staf yang berwenang biasanya bisa:

- Melihat & mengedit profil
- Mencatat pembayaran
- Menyesuaikan biaya (sewa, deposit, diskon)
- Memperpanjang masa sewa (**extend**)
- Melakukan **checkout** (biasanya disertai inspeksi inventaris; kerusakan dapat mengurangi deposit)
- Mengaktifkan penghuni yang berstatus reservasi
- Mengirim pengingat pembayaran

---

### 5.6 Keuangan

1. Buka **Keuangan**.
2. Gunakan filter bulanan / tahunan / rentang tanggal.
3. Catat **pemasukan** (sewa, utilitas, dll.) dan **pengeluaran** (operasional).
4. Role **Finance** fokus penuh di modul ini; role lain mungkin hanya melihat.

---

### 5.7 Utilitas & inventaris

**Utilitas**
- Daftarkan jenis utilitas (listrik, air, internet, dll.)
- Catat pemakaian per kamar
- Buat / pantau tagihan utilitas bulanan

**Inventaris**
- Master barang & template kamar
- Gudang & pembelian
- Deploy aset ke kamar / area bersama
- Maintenance inventaris & inspeksi checkout

---

### 5.8 Laporan

1. Buka **Cetak Laporan**.
2. Pilih jenis laporan (okupansi / keuangan) dan periode.
3. Cetak atau unduh sesuai kebutuhan.

---

### 5.9 Pengaturan & akun (role terbatas)

Biasanya hanya **Super Admin**, **Entity Manager**, dan/atau **Project Manager**:

- Struktur organisasi & project
- Profil / pengaturan kosan (paket sewa, denda, grace period)
- Template kontrak & BA
- Menu & hak akses
- Daftar akun pengelola dan penghuni

---

## 6. Panduan untuk Penghuni (Portal)

Setelah login sebagai penghuni, Anda masuk ke **Portal**. Menu yang tersedia:

| Menu | Fungsi |
|------|--------|
| **Beranda** | Ringkasan kamar & status pembayaran |
| **Profil Saya** | Data diri |
| **Tagihan & Invoice** | Lihat tagihan & bayar |
| **Permohonan Pindah** | Ajukan pindah kamar |
| **Permintaan Perbaikan** | Lapor kerusakan / minta perbaikan |
| **Pengumuman** | Baca info dari pengelola |

### 6.1 Membayar tagihan

1. Buka **Tagihan & Invoice**.
2. Lihat tagihan sewa / utilitas dan sisa bayar.
3. Pilih metode pembayaran (mis. **Transfer** atau **Midtrans** jika diaktifkan).
4. Selesaikan pembayaran.
5. Simpan / unduh invoice bila diperlukan.

### 6.2 Mengajukan pindah kamar

1. Buka **Permohonan Pindah**.
2. Isi alasan & kamar tujuan (jika diminta).
3. Kirim pengajuan.
4. Tunggu persetujuan staf. Proses lanjutan (selisih sewa, inspeksi, serah terima) dikerjakan pengelola.

### 6.3 Meminta perbaikan

1. Buka **Permintaan Perbaikan**.
2. Pilih jenis masalah (AC, listrik, plumbing, dll.).
3. Isi deskripsi → kirim.
4. Pantau status permintaan di halaman yang sama.

---

## 7. Alur Kerja Umum

### 7.1 Dari kamar kosong sampai terisi

```text
Tambah kamar → Kamar kosong
     ↓
Input calon penghuni → Verifikasi → Kontrak → TTD → BA inventaris → Check-in
     ↓
Kamar terisi / Penghuni aktif
```

### 7.2 Checkout penghuni

```text
Ajukan / mulai checkout → Inspeksi inventaris
     ↓
Hitung potongan deposit (jika ada kerusakan)
     ↓
Selesaikan checkout → Kamar kembali kosong → Status penghuni selesai
```

### 7.3 Pindah kamar (ringkas)

```text
Pengajuan → Persetujuan → Hitung selisih sewa/deposit
     ↓
Surat pindah → Inspeksi kamar lama → Closing meter
     ↓
Serah terima kamar baru → Opening meter → Update kontrak & billing → Selesai
```

---

## 8. Istilah yang Sering Dipakai

| Istilah | Arti |
|---------|------|
| **Entity** | Badan usaha / unit organisasi |
| **Project** | Lokasi / site kosan |
| **Kamar** | Unit sewa |
| **Penghuni** | Orang yang menyewa kamar |
| **Calon penghuni** | Belum aktif (masih proses verifikasi/kontrak) |
| **Kontrak** | Surat perjanjian sewa |
| **BA Inventaris** | Berita acara serah terima barang di kamar |
| **Deposit** | Uang jaminan |
| **Tagihan / Invoice** | Tagihan yang harus dibayar |
| **Utilitas** | Listrik, air, internet, dll. |
| **Inventaris / Aset** | Barang milik kosan di kamar atau area bersama |
| **Checkout** | Proses keluar / selesai sewa |
| **Pindah unit** | Pindah dari satu kamar ke kamar lain |
| **Materai** | Stempel legal pada kontrak yang ditandatangani |

---

## 9. Tips & FAQ

**Saya login tapi menu sedikit / kosong?**  
Peran Anda memang membatasi menu. Pastikan juga Entity/Project yang dipilih benar. Jika perlu akses tambahan, hubungi Super Admin.

**Penghuni tidak bisa masuk Dashboard?**  
Benar. Akun penghuni hanya memakai Portal (`/portal`).

**Kontrak tidak terkirim ke email?**  
Pastikan email calon benar dan pengaturan email server sudah dikonfigurasi oleh admin teknis.

**Pembayaran online gagal?**  
Coba metode transfer manual. Midtrans hanya tersedia jika sudah diaktifkan di server.

**Hak akses saya berbeda dari panduan ini?**  
Admin mungkin sudah mengubah **Menu & Hak Akses**. Ikuti yang tampil di aplikasi Anda.

**Lupa password?**  
Hubungi pengelola / Super Admin untuk reset akun.

---

## Butuh bantuan?

Hubungi pengelola kosan atau Super Admin organisasi Anda. Untuk setup teknis (instalasi, database, deployment), lihat `README.md` di folder proyek.
