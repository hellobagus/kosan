/**
 * Jalankan migrasi unit (lantai, fasilitas, unit_gallery) pakai kredensial dari .env
 * npm run migrate-unit
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kosan_db';
const pool = new Pool({ connectionString });

const sql = `
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
`;

async function run() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Migrasi unit (lantai, fasilitas, unit_gallery) selesai.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
