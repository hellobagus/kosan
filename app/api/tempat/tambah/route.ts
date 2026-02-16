import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const fd = await request.formData();
  const nama = fd.get('nama')?.toString()?.trim();
  const alamat = fd.get('alamat')?.toString()?.trim() ?? '';
  if (!nama) {
    return Response.json({ ok: false, error: 'Nama tempat wajib diisi.' }, { status: 400 });
  }
  await pool.query('INSERT INTO tempat_kos (nama, alamat) VALUES ($1, $2)', [nama, alamat]);
  return Response.json({ ok: true });
}
