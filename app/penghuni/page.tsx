import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import DeleteForm from '../components/DeleteForm';
import AppShell from '../components/AppShell';

export default async function PenghuniPage() {
  const session = await getSession();
  if (!session) return null;
  const { rows } = await pool.query(`
    SELECT p.id, p.nama, p.no_ktp, p.no_hp, p.tanggal_masuk, p.aktif,
           u.nama_unit, u.harga_bulanan, t.nama AS tempat_nama, t.id AS tempat_id
    FROM penghuni p
    JOIN unit_kos u ON p.unit_id = u.id
    JOIN tempat_kos t ON u.tempat_id = t.id
    ORDER BY t.nama, u.nama_unit, p.nama
  `);

  const formatDate = (value: unknown) => {
    if (!value) return '-';
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }
    const s = String(value);
    if (/^\\d{4}-\\d{2}-\\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  };

  return (
    <AppShell username={session.username}>
      <div className="page-header">
        <h1>Penghuni</h1>
        <Link href="/penghuni/tambah" className="btn btn-primary">
          Tambah Penghuni
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tempat</th>
              <th>Unit</th>
              <th>Nama</th>
              <th>No. HP</th>
              <th>Tanggal Masuk</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>Belum ada data penghuni.</td>
              </tr>
            ) : (
              rows.map((item: { id: number; tempat_nama: string; nama_unit: string; nama: string; no_hp: string | null; tanggal_masuk: unknown; aktif: boolean }) => (
                <tr key={item.id}>
                  <td>{item.tempat_nama}</td>
                  <td>{item.nama_unit}</td>
                  <td>{item.nama}</td>
                  <td>{item.no_hp || '-'}</td>
                  <td>{formatDate(item.tanggal_masuk)}</td>
                  <td>{item.aktif ? 'Aktif' : 'Nonaktif'}</td>
                  <td className="actions">
                    <Link href={`/penghuni/${item.id}/edit`} className="btn btn-secondary">
                      Edit
                    </Link>
                    <DeleteForm action={`/api/penghuni/${item.id}/hapus`} />
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
