import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const db = getDb();
  const location = db.prepare('SELECT host_id FROM charging_locations WHERE id = ?').get(params.id) as { host_id: string } | undefined;
  if (!location || (location.host_id !== user.id && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Location not found or access denied.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120) {
      return NextResponse.json({ error: 'Name must be a non-empty string up to 120 characters.' }, { status: 400 });
    }
  }
  if (body.latitude !== undefined) {
    if (typeof body.latitude !== 'number') {
      return NextResponse.json({ error: 'Latitude must be a finite number between 12.50 and 13.30.' }, { status: 400 });
    }
    const latitude = body.latitude;
    if (!Number.isFinite(latitude) || latitude < 12.50 || latitude > 13.30) {
      return NextResponse.json({ error: 'Latitude must be a finite number between 12.50 and 13.30.' }, { status: 400 });
    }
  }
  if (body.longitude !== undefined) {
    if (typeof body.longitude !== 'number') {
      return NextResponse.json({ error: 'Longitude must be a finite number between 74.60 and 75.20.' }, { status: 400 });
    }
    const longitude = body.longitude;
    if (!Number.isFinite(longitude) || longitude < 74.60 || longitude > 75.20) {
      return NextResponse.json({ error: 'Longitude must be a finite number between 74.60 and 75.20.' }, { status: 400 });
    }
  }
  const socketTypes = ['15A standard socket', '16A standard socket', '3.3 kW AC charging'];
  if (body.socketType !== undefined && (typeof body.socketType !== 'string' || !socketTypes.includes(body.socketType))) {
    return NextResponse.json({ error: 'Invalid socket type.' }, { status: 400 });
  }
  for (const key of ['openingTime', 'closingTime'] as const) {
    if (body[key] !== undefined && (typeof body[key] !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body[key]))) {
      return NextResponse.json({ error: 'Opening and closing times must use HH:MM format.' }, { status: 400 });
    }
  }
  if (body.available !== undefined && typeof body.available !== 'boolean') {
    return NextResponse.json({ error: 'Available must be a boolean.' }, { status: 400 });
  }
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of [
    ['name', 'name'], ['description', 'description'], ['address', 'address'],
    ['latitude', 'latitude'], ['longitude', 'longitude'], ['socketType', 'socket_type'],
    ['openingTime', 'opening_time'], ['closingTime', 'closing_time'],
  ] as const) {
    if (body[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(body[key]);
    }
  }
  if (body.available !== undefined) {
    fields.push('available = ?');
    values.push(body.available ? 1 : 0);
  }
  if (!fields.length) return NextResponse.json({ error: 'No updates supplied.' }, { status: 400 });
  fields.push('updated_at = ?');
  values.push(new Date().toISOString(), params.id);
  db.prepare(`UPDATE charging_locations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}
