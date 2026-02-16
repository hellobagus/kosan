import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import DeleteForm from '../components/DeleteForm';
import AppShell from '../components/AppShell';

export default async function TempatPage() {
  const session = await getSession();
  if (!session) return null;
  const { rows } = await pool.query('SELECT id, nama, alamat, created_at FROM tempat_kos ORDER BY nama');
  return (
    <AppShell username={session.username}>
      <div className="page-header">
        <h1>Tempat Kos</h1>
        <Link href="/tempat/tambah" className="btn btn-primary">
          Tambah Tempat
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Alamat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3}>Belum ada data tempat kos.</td>
              </tr>
            ) : (
              rows.map((item: { id: number; nama: string; alamat: string | null }) => (
                <tr key={item.id}>
                  <td>{item.nama}</td>
                  <td>{item.alamat || '-'}</td>
                  <td className="actions">
                    <Link href={`/tempat/${item.id}/edit`} className="btn btn-secondary">
                      Edit
                    </Link>
                    <DeleteForm action={`/api/tempat/${item.id}/hapus`} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
