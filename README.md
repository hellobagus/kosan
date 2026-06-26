# KosanKu - Sistem Manajemen Informasi Sewa Kosan

Aplikasi web untuk mengelola kosan (boarding house) dengan fitur lengkap: dashboard, manajemen kamar, penghuni, keuangan, laporan, dan akun pengguna.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT (jose) + bcrypt

## Fitur

1. **Dashboard** - Ringkasan kamar, penghuni, dan keuangan
2. **Informasi Kamar** - Input kamar baru, kamar terisi, kamar kosong
3. **Penghuni** - Penghuni aktif, input penghuni baru, penghuni selesai
4. **Keuangan** - Pemasukan & pengeluaran (bulanan, tahunan, berdasarkan tanggal)
5. **Cetak Laporan** - Generate dan cetak laporan
6. **Daftar Akun** - Akun pengelola/pemilik dan akun penghuni

## Setup

### 1. Persyaratan

- Node.js 18+ (disarankan)
- PostgreSQL

### 2. Install Dependencies

Pastikan menggunakan **Node.js 18+** (disarankan Node 22):

```bash
nvm use 22        # jika pakai nvm
node -v           # harus >= 18
npm install
```

### 3. Konfigurasi Database

Salin file environment:

```bash
cp .env.example .env
```

Edit `.env` dan sesuaikan koneksi PostgreSQL:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/kosanku?schema=public"
JWT_SECRET="ganti-dengan-secret-key-yang-kuat"
```

### 4. Buat Database

```bash
# Buat database di PostgreSQL
createdb kosanku

# Atau jalankan SQL schema manual
psql -U postgres -d kosanku -f database/schema.sql
```

### 5. Migrasi & Seed

**Jika muncul error `permission denied for schema public`:**

User database Anda (`bagus`) tidak punya hak membuat tabel di schema `public`.
Ini umum di PostgreSQL 15+ / database hosting.

**Solusi — minta admin DB jalankan sekali** (sebagai superuser `postgres`):

```bash
psql -h 43.173.1.89 -U postgres -d kosan_train -f database/setup-by-admin.sql
```

Atau copy-paste isi file `database/setup-by-admin.sql` di pgAdmin / DBeaver.

Setelah admin menjalankan script di atas, lanjutkan:

```bash
npx prisma generate
npm run db:seed
npm run dev
```

**Jika Anda punya hak penuh di database**, cukup jalankan:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 6. Jalankan Aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Akun Demo

| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| Pemilik  | admin@kosanku.com      | admin123    |
| Pengelola| manager@kosanku.com    | manager123  |

## Struktur Database

Lihat file `database/schema.sql` untuk query lengkap pembuatan tabel:

- `users` - Akun pengelola, pemilik, dan penghuni
- `rooms` - Data kamar kosan
- `tenants` - Data sewa/penghuni
- `finances` - Pemasukan dan pengeluaran

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Production server
npm run db:push    # Push schema ke database
npm run db:seed    # Seed data demo
npm run db:studio  # Prisma Studio (GUI database)
```
