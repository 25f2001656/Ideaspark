import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin login required.' }, { status: 403 });
  const users = getDb().prepare(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC',
  ).all();
  const locations = getDb().prepare(
    'SELECT id, host_id, name, latitude, longitude, socket_type, available, updated_at FROM charging_locations ORDER BY updated_at DESC',
  ).all();
  return NextResponse.json({ users, locations });
}
