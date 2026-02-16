import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import { notFound } from 'next/navigation';
import FormTempat from '../../FormTempat';
import AppShell from '../../../components/AppShell';

export default async function TempatEditPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = params;
  const { rows } = await pool.query('SELECT * FROM tempat_kos WHERE id = $1', [id]);
  if (rows.length === 0) notFound();
  return (
    <AppShell username={session.username}>
      <div className="form-page">
        <h1>Edit Tempat Kos</h1>
        <FormTempat item={rows[0]} />
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link href="/tempat" className="btn btn-secondary">Batal</Link>
        </div>
      </div>
    </AppShell>
  );
}
