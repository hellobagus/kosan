import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import { notFound } from 'next/navigation';
import FormPenghuni from '../../FormPenghuni';
import AppShell from '../../../components/AppShell';

export default async function PenghuniEditPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = params;
  const [penghuniRes, unitRes] = await Promise.all([
    pool.query('SELECT * FROM penghuni WHERE id = $1', [id]),
    pool.query(`
      SELECT u.id, u.nama_unit, u.harga_bulanan, t.nama AS tempat_nama
      FROM unit_kos u JOIN tempat_kos t ON u.tempat_id = t.id ORDER BY t.nama, u.nama_unit
    `),
  ]);
  if (penghuniRes.rows.length === 0) notFound();
  return (
    <AppShell username={session.username}>
      <div className="form-page">
        <h1>Edit Penghuni</h1>
        <FormPenghuni item={penghuniRes.rows[0]} unitList={unitRes.rows} />
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link href="/penghuni" className="btn btn-secondary">Batal</Link>
        </div>
      </div>
    </AppShell>
  );
}
