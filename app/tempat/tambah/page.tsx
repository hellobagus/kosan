import { getSession } from '@/lib/auth';
import Link from 'next/link';
import FormTempat from '../FormTempat';
import AppShell from '../../components/AppShell';

export default async function TempatTambahPage() {
  const session = await getSession();
  if (!session) return null;
  return (
    <AppShell username={session.username}>
      <div className="form-page">
        <h1>Tambah Tempat Kos</h1>
        <FormTempat />
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link href="/tempat" className="btn btn-secondary">
            Batal
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
