import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const fd = await request.formData();
  const status = fd.get('status')?.toString();
  if (status && ['pending', 'lunas', 'sebagian'].includes(status)) {
    await pool.query('UPDATE pembayaran SET status = $1 WHERE id = $2', [status, id]);
  }
  return Response.json({ ok: true });
}
