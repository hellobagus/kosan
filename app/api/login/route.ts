import { NextRequest } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body || {};
  const result = await login(String(username || ''), String(password || ''));
  return Response.json(result);
}
