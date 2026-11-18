import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';

const COOKIE_NAME = 'chargeshare_session';

function secret() {
  return process.env.AUTH_SECRET || 'chargeshare-local-development-secret-change-me';
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

export function createSession(user: { id: string; name: string; email: string; role: string }) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readSessionToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      id: string; name: string; email: string; role: 'DRIVER' | 'HOST' | 'ADMIN';
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function getCurrentUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  const session = readSessionToken(token);
  if (!session) return null;
  const user = getDb().prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(session.id) as
    | { id: string; name: string; email: string; role: 'DRIVER' | 'HOST' | 'ADMIN' }
    | undefined;
  return user || null;
}

export function sessionCookieName() {
  return COOKIE_NAME;
}
