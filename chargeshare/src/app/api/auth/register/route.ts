import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb } from '@/lib/db';
import { createSession, hashPassword, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = body.role === 'HOST' ? 'HOST' : body.role === 'DRIVER' ? 'DRIVER' : '';

  if (!name || !email || password.length < 8 || !role) {
    return NextResponse.json({ error: 'Name, email, password (8+ characters), and role are required.' }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return NextResponse.json({ error: 'An account already exists for this email.' }, { status: 409 });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, name, email, await hashPassword(password), role, new Date().toISOString(),
  );
  setSessionCookie(createSession({ id, name, email, role }));
  return NextResponse.json({ ok: true, user: { id, name, email, role } });
}
