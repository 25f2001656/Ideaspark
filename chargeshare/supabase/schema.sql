-- ChargeShare Mangaluru MVP — Relational Database Schema (PostgreSQL / Supabase)
-- Timezone: Asia/Kolkata | Currency: INR (₹)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 2),
  email TEXT UNIQUE NOT NULL,
  active_role TEXT NOT NULL DEFAULT 'DRIVER' CHECK (active_role IN ('DRIVER', 'HOST', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CHARGING LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.charging_locations (
  id TEXT PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  corridor TEXT NOT NULL DEFAULT 'Derlakatte',
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN 12.50 AND 13.30),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN 74.60 AND 75.20),
  socket_type TEXT NOT NULL CHECK (socket_type IN ('15A standard socket', '16A standard socket', '3.3 kW AC charging')),
  availability_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'UNAVAILABLE')),
  opening_time TIME NOT NULL DEFAULT '08:00',
  closing_time TIME NOT NULL DEFAULT '21:30',
  charge_and_dine BOOLEAN NOT NULL DEFAULT false,
  monsoon_photo_url TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  -- Never store plaintext host PINs; store salted bcrypt/SHA-256 hash only
  host_pin_hash TEXT NOT NULL,
  is_demo_listing BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_charging_locations_corridor ON public.charging_locations(corridor);
CREATE INDEX IF NOT EXISTS idx_charging_locations_status ON public.charging_locations(availability_status, verification_status);

-- 3. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL REFERENCES public.charging_locations(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (120, 150)),
  base_amount NUMERIC(10,2) NOT NULL DEFAULT 40.00 CHECK (base_amount >= 0),
  convenience_fee NUMERIC(10,2) NOT NULL DEFAULT 5.00 CHECK (convenience_fee >= 0),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 45.00 CHECK (total_amount = base_amount + convenience_fee),
  host_payout NUMERIC(10,2) NOT NULL DEFAULT 34.00 CHECK (host_payout >= 0),
  platform_share NUMERIC(10,2) NOT NULL DEFAULT 6.00 CHECK (platform_share >= 0),
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'ACTIVE_SESSION', 'COMPLETED', 'CANCELLED')),
  signed_token_reference TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_driver ON public.bookings(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_location ON public.bookings(location_id, start_time);

-- 4. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT UNIQUE NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_end_time TIMESTAMPTZ NOT NULL,
  actual_end_time TIMESTAMPTZ,
  estimated_range_added NUMERIC(6,1) NOT NULL DEFAULT 62.0,
  relay_status TEXT NOT NULL DEFAULT 'ON' CHECK (relay_status IN ('ON', 'OFF')),
  overstay_minutes INTEGER NOT NULL DEFAULT 0 CHECK (overstay_minutes >= 0),
  idle_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (idle_fee >= 0),
  sync_status TEXT NOT NULL DEFAULT 'SYNCED' CHECK (sync_status IN ('SYNCED', 'PENDING_SYNC', 'RECONCILED'))
);

-- 5. PAYOUTS TABLE
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id TEXT UNIQUE NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 34.00 CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SETTLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ACTIVITY LOGS TABLE (WITH IDEMPOTENCY DEDUPLICATION KEY)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('BOOKING_CREATED', 'ONLINE_CHECKIN', 'OFFLINE_CHECKIN', 'AUTO_CUTOFF', 'MANUAL_CUTOFF', 'OVERSTAY_ALERT', 'SYNC_RECONCILED')),
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_booking ON public.activity_logs(booking_id, event_timestamp DESC);

-- ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charging_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for approved charging locations"
  ON public.charging_locations FOR SELECT
  USING (true);

CREATE POLICY "Hosts can insert and update their own charging locations"
  ON public.charging_locations FOR ALL
  USING (auth.uid() = host_id);

CREATE POLICY "Drivers and Hosts can read their own bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = driver_id OR
    EXISTS (SELECT 1 FROM public.charging_locations cl WHERE cl.id = bookings.location_id AND cl.host_id = auth.uid())
  );

CREATE POLICY "Drivers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Session access for booking participants" ON public.sessions;
DROP POLICY IF EXISTS "Participants can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Booking participants can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Booking participants can update session status" ON public.sessions;

CREATE POLICY "Participants can view sessions"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.charging_locations cl ON cl.id = b.location_id
      WHERE b.id = sessions.booking_id AND (b.driver_id = auth.uid() OR cl.host_id = auth.uid())
    )
  );

CREATE POLICY "Booking participants can create sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.charging_locations cl ON cl.id = b.location_id
      WHERE b.id = sessions.booking_id AND (b.driver_id = auth.uid() OR cl.host_id = auth.uid())
    )
  );

CREATE POLICY "Booking participants can update session status"
  ON public.sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.charging_locations cl ON cl.id = b.location_id
      WHERE b.id = sessions.booking_id AND (b.driver_id = auth.uid() OR cl.host_id = auth.uid())
    )
  )
  WITH CHECK (
    idle_fee >= 0
  );

CREATE OR REPLACE FUNCTION public.prevent_idle_fee_reset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.idle_fee < OLD.idle_fee THEN
    RAISE EXCEPTION 'idle_fee cannot be decreased';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_idle_fee_reset_trigger ON public.sessions;
CREATE TRIGGER prevent_idle_fee_reset_trigger
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_idle_fee_reset();

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Hosts can view their own payouts"
  ON public.payouts FOR SELECT
  USING (auth.uid() = host_id);

CREATE POLICY "Participants can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.charging_locations cl ON cl.id = b.location_id
      WHERE b.id = activity_logs.booking_id AND (b.driver_id = auth.uid() OR cl.host_id = auth.uid())
    )
  );

CREATE POLICY "Participants can append activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.charging_locations cl ON cl.id = b.location_id
      WHERE b.id = activity_logs.booking_id AND (b.driver_id = auth.uid() OR cl.host_id = auth.uid())
    )
  );
