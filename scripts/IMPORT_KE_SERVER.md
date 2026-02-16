# Cara Import Database ke Server 43.173.1.89

## 1. Buat database (sekali saja)

Dari mesin yang punya akses ke PostgreSQL di server:

```bash
# Ganti user jika bukan postgres
createdb -h 43.173.1.89 -U postgres kosan_db
```

Atau lewat `psql`:

```bash
psql -h 43.173.1.89 -U postgres -c "CREATE DATABASE kosan_db;"
```

## 2. Import schema + dummy data

```bash
psql -h 43.173.1.89 -U postgres -d kosan_db -f scripts/kosan_full_import.sql
```

Jika diminta password, masukkan password user PostgreSQL.

## 3. Koneksi dari aplikasi Next.js

Di `.env` atau `.env.local`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@43.173.1.89:5432/kosan_db
```

Ganti `USER` dan `PASSWORD` dengan user dan password PostgreSQL di server.

---

## Isi dummy data

| Tabel | Jumlah | Keterangan |
|-------|--------|------------|
| **admins** | 2 | `admin` dan `operator` (password: `admin123`) |
| **tempat_kos** | 3 | Kosan Merdeka, Sejahtera, Putra Bahari |
| **unit_kos** | 8 | Unit A-101, A-102, B-201, 101, 102, 201, K-1, K-2 |
| **penghuni** | 6 | Budi, Ani, Eko, Dewi, Fajar, Rina |
| **pembayaran** | 5 | Berbagai periode (3 bln, 6 bln, 1 tahun, bebas) + diskon |
| **pembayaran_tambahan** | 7 | Sampah, listrik, wifi untuk beberapa pembayaran |

Login setelah import: **username** `admin` atau `operator`, **password** `admin123`.

---

## Unit: lantai, fasilitas, galeri foto

Jika database sudah ada sebelum fitur unit (lantai, fasilitas, galeri) ditambah, jalankan migrasi sekali. **Pakai kredensial dari `.env` / `.env.local`** (user `bagus` dan password yang sama dengan aplikasi):

```bash
npm run migrate-unit
```

Ini memakai `DATABASE_URL` dari `.env` dan menambah kolom `lantai`, `fasilitas` di `unit_kos` serta tabel `unit_gallery`.
