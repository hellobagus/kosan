/**
 * Inisialisasi database PostgreSQL untuk aplikasi kos-kosan (Next.js).
 * Jalankan: npm run init-db
 * Pastikan database sudah dibuat: createdb kosan_db
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kosan_db';
const pool = new Pool({ connectionString });

const schema = `
-- Tabel administrator
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel tempat kosan (lokasi)
CREATE TABLE IF NOT EXISTS tempat_kos (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(200) NOT NULL,
  alamat TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel unit kosan
CREATE TABLE IF NOT EXISTS unit_kos (
  id SERIAL PRIMARY KEY,
  tempat_id INTEGER NOT NULL REFERENCES tempat_kos(id) ON DELETE CASCADE,
  nama_unit VARCHAR(100) NOT NULL,
  harga_bulanan DECIMAL(15,2) NOT NULL DEFAULT 0,
  keterangan TEXT,
  lantai VARCHAR(20),
  fasilitas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE unit_kos ADD COLUMN IF NOT EXISTS lantai VARCHAR(20);
ALTER TABLE unit_kos ADD COLUMN IF NOT EXISTS fasilitas TEXT;

CREATE TABLE IF NOT EXISTS unit_gallery (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES unit_kos(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_unit_gallery_unit ON unit_gallery(unit_id);

-- Tabel penghuni
CREATE TABLE IF NOT EXISTS penghuni (
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

-- Tabel pembayaran (kontrak/billing)
CREATE TABLE IF NOT EXISTS pembayaran (
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

-- Tabel pembayaran tambahan
CREATE TABLE IF NOT EXISTS pembayaran_tambahan (
  id SERIAL PRIMARY KEY,
  pembayaran_id INTEGER NOT NULL REFERENCES pembayaran(id) ON DELETE CASCADE,
  jenis VARCHAR(50) NOT NULL,
  nama_item VARCHAR(100),
  nominal DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unit_tempat ON unit_kos(tempat_id);
CREATE INDEX IF NOT EXISTS idx_penghuni_unit ON penghuni(unit_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_penghuni ON pembayaran(penghuni_id);
CREATE INDEX IF NOT EXISTS idx_tambahan_pembayaran ON pembayaran_tambahan(pembayaran_id);
`;

async function init() {
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('Schema berhasil dibuat.');

    const { rows } = await client.query('SELECT id FROM admins LIMIT 1');
    if (rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO admins (username, password_hash) VALUES ($1, $2)',
        ['admin', hash]
      );
      console.log('Admin default: username=admin, password=admin123');
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

init();
