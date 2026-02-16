import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  await pool.query('DELETE FROM tempat_kos WHERE id = $1', [id]);
  const url = new URL('/tempat', request.url);
  return Response.redirect(url);
}
