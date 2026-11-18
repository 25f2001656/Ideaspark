import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const rows = getDb().prepare(`
    SELECT l.*, u.name AS host_name
    FROM charging_locations l
    JOIN users u ON u.id = l.host_id
    ORDER BY l.updated_at DESC
  `).all();
  return NextResponse.json({ locations: rows });
}

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user || user.role !== 'HOST') return NextResponse.json({ error: 'Host login required.' }, { status: 403 });
  const body = await request.json();
  const name = String(body.name || '').trim();
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: 'Name and valid latitude/longitude are required.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  getDb().prepare(`
    INSERT INTO charging_locations
      (id, host_id, name, description, latitude, longitude, socket_type, available, address, opening_time, closing_time, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, user.id, name, String(body.description || '').trim(), latitude, longitude,
    String(body.socketType || '15A standard socket'), body.available === false ? 0 : 1,
    String(body.address || '').trim(), String(body.openingTime || '08:00'), String(body.closingTime || '20:00'), now, now,
  );
  return NextResponse.json({ ok: true, locationId: id });
}
