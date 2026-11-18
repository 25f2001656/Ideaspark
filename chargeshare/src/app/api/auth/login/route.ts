import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession, setSessionCookie, verifyPassword } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const user = getDb().prepare(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
  ).get(email) as { id: string; name: string; email: string; password_hash: string; role: 'DRIVER' | 'HOST' | 'ADMIN' } | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  setSessionCookie(createSession(user));
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
