import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import AppShell from '../components/AppShell';
import UnitList from './UnitList';

export default async function UnitPage() {
  const session = await getSession();
  if (!session) return null;
  let units: { id: number; nama_unit: string; harga_bulanan: string; lantai?: string | null; fasilitas?: string | null; keterangan?: string | null; tempat_nama: string; tempat_id: number; thumb_path?: string | null }[];
  const tempatRes = await pool.query('SELECT id, nama FROM tempat_kos ORDER BY nama');
  const tempatList = tempatRes.rows;
  try {
    const unitsRes = await pool.query(`
      SELECT u.id, u.nama_unit, u.harga_bulanan, u.lantai, u.fasilitas, u.keterangan,
             t.nama AS tempat_nama, t.id AS tempat_id,
             g.file_path AS thumb_path
      FROM unit_kos u
      JOIN tempat_kos t ON u.tempat_id = t.id
      LEFT JOIN LATERAL (
        SELECT file_path FROM unit_gallery g2 WHERE g2.unit_id = u.id ORDER BY g2.sort_order, g2.id LIMIT 1
      ) g ON true
      ORDER BY t.nama, u.nama_unit
    `);
    units = unitsRes.rows;
  } catch {
    const unitsRes = await pool.query(`
      SELECT u.id, u.nama_unit, u.harga_bulanan, t.nama AS tempat_nama, t.id AS tempat_id
      FROM unit_kos u
      JOIN tempat_kos t ON u.tempat_id = t.id
      ORDER BY t.nama, u.nama_unit
    `);
    units = unitsRes.rows.map((r: { id: number; nama_unit: string; harga_bulanan: string; tempat_nama: string; tempat_id: number }) => ({
      ...r,
      lantai: null,
      fasilitas: null,
      thumb_path: null,
    }));
  }
  return (
    <AppShell username={session.username}>
      <div className="page-header">
        <h1>Unit Kosan</h1>
        <Link href="/unit/tambah" className="btn btn-primary">
          Tambah Unit
        </Link>
      </div>
      <UnitList units={units} tempatList={tempatList} />
    </AppShell>
  );
}
