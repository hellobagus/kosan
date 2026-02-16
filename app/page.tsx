import { getSession } from '@/lib/auth';
import Link from 'next/link';
import AppShell from './components/AppShell';

export default async function HomePage() {
  const session = await getSession();
  if (!session) return null;
  return (
    <AppShell username={session.username}>
      <div className="dashboard">
        <h1>Dashboard</h1>
        <p className="subtitle">
          Selamat datang, {session.username}. Kelola tempat kos, unit, penghuni, dan pembayaran.
        </p>
        <div className="card-grid">
          <Link href="/tempat" className="card">
            <h3>Tempat Kos</h3>
            <p>Daftar lokasi kosan</p>
          </Link>
          <Link href="/unit" className="card">
            <h3>Unit Kosan</h3>
            <p>Kelola unit per tempat</p>
          </Link>
          <Link href="/penghuni" className="card">
            <h3>Penghuni</h3>
            <p>Data penghuni per unit</p>
          </Link>
          <Link href="/pembayaran" className="card">
            <h3>Pembayaran</h3>
            <p>Pembayaran kos + tambahan (Watermint)</p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

