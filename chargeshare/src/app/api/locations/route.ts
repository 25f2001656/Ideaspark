import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('mine') === '1') {
    const user = getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const rows = getDb().prepare(`
      SELECT l.*, u.name AS host_name
      FROM charging_locations l
      JOIN users u ON u.id = l.host_id
      WHERE l.host_id = ?
      ORDER BY l.updated_at DESC
    `).all(user.id);
    return NextResponse.json({ locations: rows });
  }
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
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  if (typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name must be a non-empty string up to 120 characters.' }, { status: 400 });
  }
  const name = body.name.trim();
  if (typeof body.latitude !== 'number') {
    return NextResponse.json({ error: 'Latitude must be a finite number between 12.50 and 13.30.' }, { status: 400 });
  }
  if (typeof body.longitude !== 'number') {
    return NextResponse.json({ error: 'Longitude must be a finite number between 74.60 and 75.20.' }, { status: 400 });
  }
  const latitude = body.latitude;
  const longitude = body.longitude;
  const socketTypes = ['15A standard socket', '16A standard socket', '3.3 kW AC charging'];
  const openingTime = typeof body.openingTime === 'string' ? body.openingTime : '08:00';
  const closingTime = typeof body.closingTime === 'string' ? body.closingTime : '20:00';
  if (!name || name.length > 120) return NextResponse.json({ error: 'Name must be a non-empty string up to 120 characters.' }, { status: 400 });
  if (!Number.isFinite(latitude) || latitude < 12.50 || latitude > 13.30) {
    return NextResponse.json({ error: 'Latitude must be a finite number between 12.50 and 13.30.' }, { status: 400 });
  }
  if (!Number.isFinite(longitude) || longitude < 74.60 || longitude > 75.20) {
    return NextResponse.json({ error: 'Longitude must be a finite number between 74.60 and 75.20.' }, { status: 400 });
  }
  if (typeof body.socketType !== 'string' || !socketTypes.includes(body.socketType)) {
    return NextResponse.json({ error: 'Invalid socket type.' }, { status: 400 });
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openingTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closingTime)) {
    return NextResponse.json({ error: 'Opening and closing times must use HH:MM format.' }, { status: 400 });
  }
  if (typeof body.available !== 'boolean') return NextResponse.json({ error: 'Available must be a boolean.' }, { status: 400 });

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  getDb().prepare(`
    INSERT INTO charging_locations
      (id, host_id, name, description, latitude, longitude, socket_type, available, address, opening_time, closing_time, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, user.id, name, String(body.description || '').trim(), latitude, longitude,
    body.socketType, body.available ? 1 : 0,
    String(body.address || '').trim(), openingTime, closingTime, now, now,
  );
  return NextResponse.json({ ok: true, locationId: id });
}
