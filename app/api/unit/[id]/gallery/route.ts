import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'units');

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const fd = await request.formData();
  const file = fd.get('file') as File | null;
  if (!file || !file.size) {
    return Response.json({ ok: false, error: 'File wajib diisi.' }, { status: 400 });
  }
  const ext = path.extname(file.name) || '.jpg';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const dir = path.join(UPLOAD_DIR, id);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, safeName);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));
  const webPath = `/uploads/units/${id}/${safeName}`;
  const { rows } = await pool.query(
    'INSERT INTO unit_gallery (unit_id, file_path, sort_order) VALUES ($1, $2, 0) RETURNING id',
    [id, webPath]
  );
  return Response.json({ ok: true, id: rows[0].id, file_path: webPath });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { rows } = await pool.query('SELECT id, file_path, sort_order FROM unit_gallery WHERE unit_id = $1 ORDER BY sort_order, id', [id]);
  return Response.json(rows);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const url = new URL(request.url);
  const imageId = url.searchParams.get('imageId');
  if (!imageId) {
    return Response.json({ ok: false, error: 'imageId wajib.' }, { status: 400 });
  }
  const { rows } = await pool.query('SELECT file_path FROM unit_gallery WHERE id = $1 AND unit_id = $2', [imageId, id]);
  if (rows.length > 0) {
    const physicalPath = path.join(process.cwd(), 'public', rows[0].file_path);
    try {
      await unlink(physicalPath);
    } catch (_) {}
  }
  await pool.query('DELETE FROM unit_gallery WHERE id = $1 AND unit_id = $2', [imageId, id]);
  return Response.json({ ok: true });
}
