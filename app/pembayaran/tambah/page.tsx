import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import FormPembayaran from '../FormPembayaran';
import AppShell from '../../components/AppShell';

export default async function PembayaranTambahPage() {
  const session = await getSession();
  if (!session) return null;
  const { rows: penghuniList } = await pool.query(`
    SELECT p.id, p.nama, u.nama_unit, u.harga_bulanan, t.nama AS tempat_nama
    FROM penghuni p
    JOIN unit_kos u ON p.unit_id = u.id
    JOIN tempat_kos t ON u.tempat_id = t.id
    WHERE p.aktif = true
    ORDER BY t.nama, u.nama_unit, p.nama
  `);
  return (
    <AppShell username={session.username}>
      <div className="form-page">
        <h1>Tambah Pembayaran</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Pilih periode Watermint (3/6/12 bulan) atau bebas. Bisa beri diskon dan biaya tambahan (sampah, listrik, wifi, dll).
        </p>
        <FormPembayaran penghuniList={penghuniList} />
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link href="/pembayaran" className="btn btn-secondary">
            Batal
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
