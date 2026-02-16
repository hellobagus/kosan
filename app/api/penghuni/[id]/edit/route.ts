import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const fd = await request.formData();
  const unit_id = fd.get('unit_id')?.toString();
  const nama = fd.get('nama')?.toString()?.trim();
  const no_ktp = fd.get('no_ktp')?.toString()?.trim() ?? '';
  const no_hp = fd.get('no_hp')?.toString()?.trim() ?? '';
  const tanggal_masuk = fd.get('tanggal_masuk')?.toString();
  const aktif = fd.get('aktif') === 'on';
  if (!unit_id || !nama || !tanggal_masuk) {
    return Response.json({ ok: false, error: 'Unit, nama, dan tanggal masuk wajib diisi.' }, { status: 400 });
  }
  await pool.query(
    'UPDATE penghuni SET unit_id = $1, nama = $2, no_ktp = $3, no_hp = $4, tanggal_masuk = $5, aktif = $6 WHERE id = $7',
    [unit_id, nama, no_ktp, no_hp, tanggal_masuk, aktif, id]
  );
  return Response.json({ ok: true });
}
