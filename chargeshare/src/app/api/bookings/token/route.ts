import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Server-only signing key — NEVER exposed to frontend bundle
const SERVER_SECRET = process.env.BOOKING_TOKEN_PRIVATE_SECRET || 'chargeshare_server_only_secret_dev';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, locationId, durationMinutes } = body;

    if (!bookingId || !locationId || !durationMinutes) {
      return NextResponse.json({ error: 'Missing required booking token fields' }, { status: 400 });
    }

    // No personal data or host PIN is ever placed inside the QR token payload
    const payload = `${bookingId}.${locationId}.${durationMinutes}M`;
    const signature = crypto
      .createHmac('sha256', SERVER_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 20);

    const signedTokenReference = `CSTOK.v1.${payload}.SIG_${signature}`;
    return NextResponse.json({ signedTokenReference });
  } catch {
    return NextResponse.json({ error: 'Failed to issue signed booking token' }, { status: 500 });
  }
}
