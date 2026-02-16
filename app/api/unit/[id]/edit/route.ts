import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const fd = await request.formData();
  const tempat_id = fd.get('tempat_id')?.toString();
  const nama_unit = fd.get('nama_unit')?.toString()?.trim();
  const harga_bulanan = parseFloat(fd.get('harga_bulanan')?.toString() || '0') || 0;
  const keterangan = fd.get('keterangan')?.toString()?.trim() ?? '';
  const lantai = fd.get('lantai')?.toString()?.trim() ?? null;
  const fasilitas = fd.get('fasilitas')?.toString()?.trim() ?? null;
  if (!tempat_id || !nama_unit) {
    return Response.json({ ok: false, error: 'Tempat dan nama unit wajib diisi.' }, { status: 400 });
  }
  await pool.query(
    `UPDATE unit_kos SET tempat_id = $1, nama_unit = $2, harga_bulanan = $3, keterangan = $4, lantai = $5, fasilitas = $6 WHERE id = $7`,
    [tempat_id, nama_unit, harga_bulanan, keterangan, lantai || null, fasilitas || null, id]
  );
  return Response.json({ ok: true });
}
