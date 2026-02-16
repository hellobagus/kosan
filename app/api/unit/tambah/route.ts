import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
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
  const { rows } = await pool.query(
    `INSERT INTO unit_kos (tempat_id, nama_unit, harga_bulanan, keterangan, lantai, fasilitas)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [tempat_id, nama_unit, harga_bulanan, keterangan, lantai || null, fasilitas || null]
  );
  return Response.json({ ok: true, id: rows[0]?.id });
}
