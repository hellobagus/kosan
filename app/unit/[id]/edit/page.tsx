import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { pool } from '@/lib/db';
import { notFound } from 'next/navigation';
import FormUnit from '../../FormUnit';
import UnitGallery from '../UnitGallery';
import AppShell from '../../../components/AppShell';

export default async function UnitEditPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return null;
  const { id } = params;
  const [unitRes, tempatRes] = await Promise.all([
    pool.query('SELECT * FROM unit_kos WHERE id = $1', [id]),
    pool.query('SELECT id, nama FROM tempat_kos ORDER BY nama'),
  ]);
  if (unitRes.rows.length === 0) notFound();
  let galleryRows: { id: number; file_path: string; sort_order: number }[] = [];
  try {
    const galleryRes = await pool.query('SELECT id, file_path, sort_order FROM unit_gallery WHERE unit_id = $1 ORDER BY sort_order, id', [id]);
    galleryRows = galleryRes.rows;
  } catch {
    // Tabel unit_gallery belum ada (jalankan migrate-unit-lantai-fasilitas-gallery.sql)
  }
  return (
    <AppShell username={session.username}>
      <div className="form-page">
        <h1>Edit Unit Kosan</h1>
        <FormUnit item={unitRes.rows[0]} tempatList={tempatRes.rows} />
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link href="/unit" className="btn btn-secondary">
            Batal
          </Link>
        </div>
        <UnitGallery unitId={id} initialImages={galleryRows} />
      </div>
    </AppShell>
  );
}
