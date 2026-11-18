import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { getDb } from './db';

const COOKIE_NAME = 'chargeshare_session';
const pbkdf2 = promisify(crypto.pbkdf2);

function secret() {
  if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be configured in production.');
  }
  return process.env.AUTH_SECRET || 'chargeshare-local-development-secret-change-me';
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await pbkdf2(password, salt, 120000, 32, 'sha256');
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = await pbkdf2(password, salt, 120000, 32, 'sha256');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (actual.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actual, expectedBuffer);
}

export function createSession(user: { id: string; name: string; email: string; role: string }) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id, name: user.name, email: user.email, role: user.role,
    iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readSessionToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(signature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      id: string; name: string; email: string; role: 'DRIVER' | 'HOST' | 'ADMIN'; exp?: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
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
