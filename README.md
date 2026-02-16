# Aplikasi Kos-Kosan (Next.js)

Aplikasi web manajemen kos-kosan dengan **Next.js** dan **PostgreSQL**.

## Fitur

1. **Login Administrator** – Autentikasi admin (session cookie)
2. **Tempat Kos** – Daftar lokasi kosan (CRUD)
3. **Unit Kosan** – Unit per tempat + harga per bulan (CRUD)
4. **Penghuni** – Data penghuni per unit/tempat (CRUD)
5. **Pembayaran** – Periode:
   - **Watermint**: 3 bulan, 6 bulan, 1 tahun
   - **Bebas**: jumlah bulan custom
6. **Diskon** – Diskon persen dan/atau nominal
7. **Biaya tambahan** – Sampah, listrik, wifi, lain-lain

## Kebutuhan

- Node.js 18+
- PostgreSQL 14+

## Instalasi

```bash
# Install dependensi
npm install

# Buat database
createdb kosan_db

# Atur .env atau .env.local
# DATABASE_URL=postgresql://user:password@localhost:5432/kosan_db

# Inisialisasi tabel + admin default
npm run init-db
```

**Akun default:** username `admin`, password `admin123`

## Menjalankan

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Buka **http://localhost:3000**

## Struktur (Next.js App Router)

- `app/` – Halaman & layout (login, dashboard, tempat, unit, penghuni, pembayaran)
- `app/api/` – API routes (login, logout, CRUD per modul)
- `lib/` – `db.ts` (PostgreSQL pool), `auth.ts` (session), `pembayaran.ts` (helper)
- `middleware.ts` – Proteksi route (redirect ke login jika belum auth)
- `scripts/init-db.js` – Buat tabel & admin default

Database schema sama dengan spesifikasi sebelumnya (tempat_kos, unit_kos, penghuni, pembayaran, pembayaran_tambahan).
