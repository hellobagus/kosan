import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import FormUnit from '../FormUnit';
import AppShell from '../../components/AppShell';

export default async function UnitTambahPage() {
  const session = await getSession();
  if (!session) return null;
  const { rows: tempatList } = await pool.query('SELECT id, nama FROM tempat_kos ORDER BY nama');
  return (
    <AppShell username={session.username}>
      <div className="form-page">
        <h1>Tambah Unit Kosan</h1>
        <FormUnit tempatList={tempatList} />
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link href="/unit" className="btn btn-secondary">
            Batal
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
