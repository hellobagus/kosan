-- ============================================================
-- Aplikasi Kos-Kosan - Schema + Dummy Data
-- Import ke PostgreSQL (server 43.173.1.89 atau lokal)
-- Cara: psql -h 43.173.1.89 -U user -d kosan_db -f scripts/kosan_full_import.sql
-- Atau buat database dulu: createdb -h 43.173.1.89 -U user kosan_db
-- ============================================================

-- Hapus tabel (urutan karena foreign key)
DROP TABLE IF EXISTS pembayaran_tambahan;
DROP TABLE IF EXISTS pembayaran;
DROP TABLE IF EXISTS penghuni;
DROP TABLE IF EXISTS unit_gallery;
DROP TABLE IF EXISTS unit_kos;
DROP TABLE IF EXISTS tempat_kos;
DROP TABLE IF EXISTS admins;

-- ------------------------------------------------------------
-- TABEL: admins
-- ------------------------------------------------------------
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- TABEL: tempat_kos
-- ------------------------------------------------------------
CREATE TABLE tempat_kos (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(200) NOT NULL,
  alamat TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- TABEL: unit_kos
-- ------------------------------------------------------------
CREATE TABLE unit_kos (
  id SERIAL PRIMARY KEY,
  tempat_id INTEGER NOT NULL REFERENCES tempat_kos(id) ON DELETE CASCADE,
  nama_unit VARCHAR(100) NOT NULL,
  harga_bulanan DECIMAL(15,2) NOT NULL DEFAULT 0,
  keterangan TEXT,
  lantai VARCHAR(20),
  fasilitas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_unit_tempat ON unit_kos(tempat_id);

CREATE TABLE unit_gallery (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES unit_kos(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_unit_gallery_unit ON unit_gallery(unit_id);

-- ------------------------------------------------------------
-- TABEL: penghuni
-- ------------------------------------------------------------
CREATE TABLE penghuni (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES unit_kos(id) ON DELETE RESTRICT,
  nama VARCHAR(200) NOT NULL,
  no_ktp VARCHAR(50),
  no_hp VARCHAR(30),
  tanggal_masuk DATE NOT NULL,
  tanggal_keluar DATE,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_penghuni_unit ON penghuni(unit_id);

-- ------------------------------------------------------------
-- TABEL: pembayaran
-- ------------------------------------------------------------
CREATE TABLE pembayaran (
  id SERIAL PRIMARY KEY,
  penghuni_id INTEGER NOT NULL REFERENCES penghuni(id) ON DELETE RESTRICT,
  periode_awal DATE NOT NULL,
  periode_akhir DATE NOT NULL,
  periode_tipe VARCHAR(20) NOT NULL DEFAULT '1_tahun',
  bulan_bebas INTEGER,
  nominal_kosan DECIMAL(15,2) NOT NULL,
  diskon_persen DECIMAL(5,2) DEFAULT 0,
  diskon_nominal DECIMAL(15,2) DEFAULT 0,
  total_kosan DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pembayaran_penghuni ON pembayaran(penghuni_id);

-- ------------------------------------------------------------
-- TABEL: pembayaran_tambahan
-- ------------------------------------------------------------
CREATE TABLE pembayaran_tambahan (
  id SERIAL PRIMARY KEY,
  pembayaran_id INTEGER NOT NULL REFERENCES pembayaran(id) ON DELETE CASCADE,
  jenis VARCHAR(50) NOT NULL,
  nama_item VARCHAR(100),
  nominal DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tambahan_pembayaran ON pembayaran_tambahan(pembayaran_id);

-- ============================================================
-- DUMMY DATA
-- ============================================================

-- Admins (password: admin123)
INSERT INTO admins (username, password_hash) VALUES
  ('admin', '$2a$10$aB6myLZVL0i09Kg7PIv6pevtPi653cKa5lAzbR/lDGJaQ1N/sMN/K'),
  ('operator', '$2a$10$aB6myLZVL0i09Kg7PIv6pevtPi653cKa5lAzbR/lDGJaQ1N/sMN/K');

-- Tempat kos
INSERT INTO tempat_kos (id, nama, alamat) VALUES
  (1, 'Kosan Merdeka', 'Jl. Merdeka No. 45, Jakarta Pusat'),
  (2, 'Kosan Sejahtera', 'Jl. Sejahtera 12, Bandung'),
  (3, 'Kost Putra Bahari', 'Jl. Bahari 88, Surabaya');

-- Reset sequence untuk id
SELECT setval('tempat_kos_id_seq', 3);

-- Unit kos (tempat_id, nama_unit, harga_bulanan, keterangan)
INSERT INTO unit_kos (tempat_id, nama_unit, harga_bulanan, keterangan) VALUES
  (1, 'A-101', 1500000, 'Lantai 1'),
  (1, 'A-102', 1500000, 'Lantai 1'),
  (1, 'B-201', 1800000, 'Lantai 2, lebih luas'),
  (2, '101', 1200000, NULL),
  (2, '102', 1200000, NULL),
  (2, '201', 1400000, 'Lantai 2'),
  (3, 'K-1', 1600000, 'Kamar mandi dalam'),
  (3, 'K-2', 1400000, 'Kamar mandi luar');

-- Penghuni (unit_id mengacu ke id unit_kos: 1=A-101, 2=A-102, 3=B-201, 4=101, 5=102, 6=201, 7=K-1, 8=K-2)
INSERT INTO penghuni (unit_id, nama, no_ktp, no_hp, tanggal_masuk, aktif) VALUES
  (1, 'Budi Santoso', '3201234567890001', '081234567890', '2024-01-15', true),
  (2, 'Ani Wijaya', '3201234567890002', '081234567891', '2024-02-01', true),
  (3, 'Eko Prasetyo', '3201234567890003', '081234567892', '2024-03-10', true),
  (4, 'Dewi Lestari', '3201234567890004', '081234567893', '2024-01-20', true),
  (5, 'Fajar Nugroho', '3201234567890005', '081234567894', '2024-04-01', true),
  (7, 'Rina Kartika', '3201234567890006', '081234567895', '2024-02-15', true);

-- Pembayaran (penghuni_id 1-6, periode bervariasi)
-- Budi: 3 bulan, 1 Jan - 31 Mar 2025
INSERT INTO pembayaran (penghuni_id, periode_awal, periode_akhir, periode_tipe, nominal_kosan, diskon_persen, diskon_nominal, total_kosan, status) VALUES
  (1, '2025-01-01', '2025-03-31', '3_bulan', 4500000, 0, 0, 4650000, 'lunas');
-- Ani: 6 bulan
INSERT INTO pembayaran (penghuni_id, periode_awal, periode_akhir, periode_tipe, nominal_kosan, diskon_persen, diskon_nominal, total_kosan, status) VALUES
  (2, '2025-02-01', '2025-07-31', '6_bulan', 9000000, 5, 0, 8550000, 'lunas');
-- Eko: 1 tahun + diskon
INSERT INTO pembayaran (penghuni_id, periode_awal, periode_akhir, periode_tipe, nominal_kosan, diskon_persen, diskon_nominal, total_kosan, status) VALUES
  (3, '2025-03-01', '2026-02-28', '1_tahun', 21600000, 10, 0, 19440000, 'pending');
-- Dewi: bebas 4 bulan (diskon 200rb)
INSERT INTO pembayaran (penghuni_id, periode_awal, periode_akhir, periode_tipe, bulan_bebas, nominal_kosan, diskon_persen, diskon_nominal, total_kosan, status) VALUES
  (4, '2025-01-01', '2025-04-30', 'bebas', 4, 4800000, 0, 200000, 4600000, 'sebagian');
-- Fajar: 3 bulan dengan tambahan
INSERT INTO pembayaran (penghuni_id, periode_awal, periode_akhir, periode_tipe, nominal_kosan, diskon_persen, diskon_nominal, total_kosan, status) VALUES
  (5, '2025-04-01', '2025-06-30', '3_bulan', 3600000, 0, 0, 3900000, 'pending');

-- Pembayaran tambahan (sampah, listrik, wifi, dll)
-- Untuk pembayaran id 1 (Budi): sampah + listrik
INSERT INTO pembayaran_tambahan (pembayaran_id, jenis, nama_item, nominal) VALUES
  (1, 'sampah', 'Sampah', 50000),
  (1, 'listrik', 'Listrik', 150000);
-- Untuk pembayaran id 4 (Dewi): listrik + wifi
INSERT INTO pembayaran_tambahan (pembayaran_id, jenis, nama_item, nominal) VALUES
  (4, 'listrik', 'Listrik', 120000),
  (4, 'wifi', 'Wifi', 100000);
-- Untuk pembayaran id 5 (Fajar): sampah + listrik + wifi
INSERT INTO pembayaran_tambahan (pembayaran_id, jenis, nama_item, nominal) VALUES
  (5, 'sampah', 'Sampah', 50000),
  (5, 'listrik', 'Listrik', 150000),
  (5, 'wifi', 'Wifi', 100000);

-- Update total_kosan di pembayaran yang punya tambahan (agar total sesuai)
-- Pembayaran 1: 4500000 + 50000 + 150000 = 4700000 (sudah kita set 4650000, koreksi)
UPDATE pembayaran SET total_kosan = 4700000 WHERE id = 1;
-- Pembayaran 4: 4600000 (4800000-200000) + 120000 + 100000 = 4820000
UPDATE pembayaran SET total_kosan = 4820000 WHERE id = 4;
-- Pembayaran 5: 3600000 + 50000 + 150000 + 100000 = 3900000 (sudah benar)
-- Tidak perlu update 5.

-- Reset sequence id untuk tabel yang pakai SERIAL
SELECT setval('admins_id_seq', (SELECT MAX(id) FROM admins));
SELECT setval('unit_kos_id_seq', (SELECT MAX(id) FROM unit_kos));
SELECT setval('penghuni_id_seq', (SELECT MAX(id) FROM penghuni));
SELECT setval('pembayaran_id_seq', (SELECT MAX(id) FROM pembayaran));
SELECT setval('pembayaran_tambahan_id_seq', (SELECT MAX(id) FROM pembayaran_tambahan));

-- Selesai
SELECT 'Import selesai. Tabel: admins, tempat_kos, unit_kos, penghuni, pembayaran, pembayaran_tambahan.' AS pesan;
SELECT 'Login: username=admin atau operator, password=admin123' AS login_info;
