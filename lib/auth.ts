import { cookies } from 'next/headers';
import { pool } from './db';
import bcrypt from 'bcryptjs';

const COOKIE_NAME = 'kosan_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

export type Session = { adminId: number; username: string } | null;

export async function getSession(): Promise<Session> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const [id, username] = Buffer.from(token, 'base64').toString('utf8').split(':');
    if (!id || !username) return null;
    const { rows } = await pool.query('SELECT id FROM admins WHERE id = $1 AND username = $2', [id, username]);
    if (rows.length === 0) return null;
    return { adminId: parseInt(id, 10), username };
  } catch {
    return null;
  }
}

export async function login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!username?.trim() || !password) {
    return { ok: false, error: 'Username dan password wajib diisi.' };
  }
  const { rows } = await pool.query('SELECT id, password_hash FROM admins WHERE username = $1', [username.trim()]);
  if (rows.length === 0) return { ok: false, error: 'Username atau password salah.' };
  const match = await bcrypt.compare(password, rows[0].password_hash);
  if (!match) return { ok: false, error: 'Username atau password salah.' };
  const token = Buffer.from(`${rows[0].id}:${username.trim()}`, 'utf8').toString('base64');
  const c = await cookies();
  c.set(COOKIE_NAME, token, { httpOnly: true, maxAge: COOKIE_MAX_AGE, path: '/', sameSite: 'lax' });
  return { ok: true };
}

export async function logout(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
