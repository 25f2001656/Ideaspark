import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (process.env.NODE_ENV === 'production' && !process.env.BOOKING_TOKEN_PRIVATE_SECRET) {
    throw new Error('BOOKING_TOKEN_PRIVATE_SECRET must be configured in production.');
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  const { bookingId, locationId, durationMinutes } = body;
  if (typeof bookingId !== 'string' || !bookingId.trim() ||
      typeof locationId !== 'string' || !locationId.trim()) {
    return NextResponse.json({ error: 'bookingId and locationId must be non-empty strings.' }, { status: 400 });
  }
  const duration = Number(durationMinutes);
  if (duration !== 120 && duration !== 150) {
    return NextResponse.json({ error: 'durationMinutes must be exactly 120 or 150.' }, { status: 400 });
  }

  try {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = `${bookingId}.${locationId}.${duration}M.${issuedAt}`;
    const secret = process.env.BOOKING_TOKEN_PRIVATE_SECRET || 'chargeshare_server_only_secret_dev';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');

    const signedTokenReference = `CSTOK.v1.${payload}.SIG_${signature}`;
    return NextResponse.json({ signedTokenReference });
  } catch {
    return NextResponse.json({ error: 'Failed to issue signed booking token' }, { status: 500 });
  }
}
