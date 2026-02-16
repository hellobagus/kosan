import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const fd = await request.formData();
  const unit_id = fd.get('unit_id')?.toString();
  const nama = fd.get('nama')?.toString()?.trim();
  const no_ktp = fd.get('no_ktp')?.toString()?.trim() ?? '';
  const no_hp = fd.get('no_hp')?.toString()?.trim() ?? '';
  const tanggal_masuk = fd.get('tanggal_masuk')?.toString();
  if (!unit_id || !nama || !tanggal_masuk) {
    return Response.json({ ok: false, error: 'Unit, nama, dan tanggal masuk wajib diisi.' }, { status: 400 });
  }
  await pool.query(
    'INSERT INTO penghuni (unit_id, nama, no_ktp, no_hp, tanggal_masuk) VALUES ($1, $2, $3, $4, $5)',
    [unit_id, nama, no_ktp, no_hp, tanggal_masuk]
  );
  return Response.json({ ok: true });
}
