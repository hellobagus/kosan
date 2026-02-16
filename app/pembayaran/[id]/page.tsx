import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import { notFound } from 'next/navigation';
import { PERIODE_LABEL } from '@/lib/pembayaran';
import FormStatus from './FormStatus';
import AppShell from '../../components/AppShell';

export default async function PembayaranDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = params;
  const payRes = await pool.query(
    `
    SELECT pb.*, p.nama AS penghuni_nama, p.no_hp, u.nama_unit, u.harga_bulanan, t.nama AS tempat_nama, t.alamat
    FROM pembayaran pb
    JOIN penghuni p ON pb.penghuni_id = p.id
    JOIN unit_kos u ON p.unit_id = u.id
    JOIN tempat_kos t ON u.tempat_id = t.id
    WHERE pb.id = $1
  `,
    [id],
  );
  if (payRes.rows.length === 0) notFound();
  const tambahanRes = await pool.query('SELECT * FROM pembayaran_tambahan WHERE pembayaran_id = $1', [id]);
  const item = payRes.rows[0];
  const tambahan = tambahanRes.rows;

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
        <h1>Detail Pembayaran</h1>
        <Link href="/pembayaran" className="btn btn-secondary">
          Kembali
        </Link>
      </div>
      <div className="detail-card">
        <h3>Info Penghuni & Unit</h3>
        <div className="detail-row">
          <span>Penghuni</span>
          <span>{item.penghuni_nama}</span>
        </div>
        <div className="detail-row">
          <span>No. HP</span>
          <span>{item.no_hp || '-'}</span>
        </div>
        <div className="detail-row">
          <span>Tempat</span>
          <span>{item.tempat_nama}</span>
        </div>
        <div className="detail-row">
          <span>Unit</span>
          <span>{item.nama_unit}</span>
        </div>
      </div>
      <div className="detail-card">
        <h3>Periode & Tipe</h3>
        <div className="detail-row">
          <span>Periode</span>
          <span>
            {formatDate(item.periode_awal)} s/d {formatDate(item.periode_akhir)}
          </span>
        </div>
        <div className="detail-row">
          <span>Tipe</span>
          <span>{PERIODE_LABEL[item.periode_tipe] ?? item.periode_tipe}</span>
        </div>
      </div>
      <div className="detail-card">
        <h3>Rincian Biaya</h3>
        <div className="detail-row">
          <span>Nominal kosan</span>
          <span>Rp {Number(item.nominal_kosan).toLocaleString('id-ID')}</span>
        </div>
        {(Number(item.diskon_persen) > 0 || Number(item.diskon_nominal) > 0) && (
          <div className="detail-row">
            <span>Diskon</span>
            <span>
              {item.diskon_persen}% + Rp {Number(item.diskon_nominal).toLocaleString('id-ID')}
            </span>
          </div>
        )}
        {tambahan.map((t: { id: number; nama_item: string; jenis: string; nominal: string }) => (
          <div className="detail-row" key={t.id}>
            <span>{t.nama_item || t.jenis}</span>
            <span>Rp {Number(t.nominal).toLocaleString('id-ID')}</span>
          </div>
        ))}
        <div className="detail-row total-row">
          <span>Total</span>
          <span>Rp {Number(item.total_kosan).toLocaleString('id-ID')}</span>
        </div>
      </div>
      <div className="detail-card">
        <h3>Status</h3>
        <FormStatus id={id} status={item.status} />
      </div>
    </AppShell>
  );
}

