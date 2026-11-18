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

  const body = await request.json();
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
