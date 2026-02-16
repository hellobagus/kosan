-- Migrasi: tambah lantai, fasilitas di unit_kos + tabel unit_gallery
-- Jalankan sekali: psql -h ... -d kosan_db -f scripts/migrate-unit-lantai-fasilitas-gallery.sql

ALTER TABLE unit_kos ADD COLUMN IF NOT EXISTS lantai VARCHAR(20) DEFAULT NULL;
ALTER TABLE unit_kos ADD COLUMN IF NOT EXISTS fasilitas TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS unit_gallery (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES unit_kos(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unit_gallery_unit ON unit_gallery(unit_id);
