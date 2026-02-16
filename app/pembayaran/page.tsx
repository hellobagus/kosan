import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import { PERIODE_LABEL } from '@/lib/pembayaran';
import AppShell from '../components/AppShell';

export default async function PembayaranPage() {
  const session = await getSession();
  if (!session) return null;
  const { rows } = await pool.query(`
    SELECT pb.id, pb.periode_awal, pb.periode_akhir, pb.periode_tipe, pb.total_kosan, pb.status,
           p.nama AS penghuni_nama, u.nama_unit, t.nama AS tempat_nama
    FROM pembayaran pb
    JOIN penghuni p ON pb.penghuni_id = p.id
    JOIN unit_kos u ON p.unit_id = u.id
    JOIN tempat_kos t ON u.tempat_id = t.id
    ORDER BY pb.created_at DESC
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
        <h1>Pembayaran</h1>
        <Link href="/pembayaran/tambah" className="btn btn-primary">
          Tambah Pembayaran
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Penghuni</th>
              <th>Tempat / Unit</th>
              <th>Periode</th>
              <th>Tipe</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>Belum ada data pembayaran.</td>
              </tr>
            ) : (
              rows.map((item: { id: number; penghuni_nama: string; tempat_nama: string; nama_unit: string; periode_awal: unknown; periode_akhir: unknown; periode_tipe: string; total_kosan: string; status: string }) => (
                <tr key={item.id}>
                  <td>{item.penghuni_nama}</td>
                  <td>
                    {item.tempat_nama} / {item.nama_unit}
                  </td>
                  <td>
                    {formatDate(item.periode_awal)} s/d {formatDate(item.periode_akhir)}
                  </td>
                  <td>{PERIODE_LABEL[item.periode_tipe] ?? item.periode_tipe}</td>
                  <td>Rp {Number(item.total_kosan).toLocaleString('id-ID')}</td>
                  <td>
                    <span className={`badge badge-${item.status}`}>{item.status}</span>
                  </td>
                  <td>
                    <Link href={`/pembayaran/${item.id}`} className="btn btn-secondary">
                      Detail
                    </Link>
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
