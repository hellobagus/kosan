import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import FormPenghuni from '../FormPenghuni';
import AppShell from '../../components/AppShell';

export default async function PenghuniTambahPage() {
  const session = await getSession();
  if (!session) return null;
  const { rows: unitList } = await pool.query(`
    SELECT u.id, u.nama_unit, u.harga_bulanan, t.nama AS tempat_nama
    FROM unit_kos u
    JOIN tempat_kos t ON u.tempat_id = t.id
    ORDER BY t.nama, u.nama_unit
  `);
  return (
    <AppShell username={session.username}>
      <div className="form-page">
        <h1>Tambah Penghuni</h1>
        <FormPenghuni unitList={unitList} />
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link href="/penghuni" className="btn btn-secondary">
            Batal
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
