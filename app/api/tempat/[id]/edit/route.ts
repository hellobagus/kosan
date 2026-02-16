import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const fd = await request.formData();
  const nama = fd.get('nama')?.toString()?.trim();
  const alamat = fd.get('alamat')?.toString()?.trim() ?? '';
  if (!nama) {
    return Response.json({ ok: false, error: 'Nama tempat wajib diisi.' }, { status: 400 });
  }
  await pool.query('UPDATE tempat_kos SET nama = $1, alamat = $2 WHERE id = $3', [nama, alamat, id]);
  return Response.json({ ok: true });
}
