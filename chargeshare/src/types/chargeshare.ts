export type UserRole = 'DRIVER' | 'HOST' | 'ADMIN';
export type SocketType = '15A standard socket' | '16A standard socket' | '3.3 kW AC charging';
export type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Profile {
  id: string;
  name: string;
  email: string;
  active_role: UserRole;
  created_at: string;
}

export interface ChargingLocation {
  id: string;
  host_id: string;
  host_name: string;
  name: string;
  corridor: 'Derlakatte' | 'Valachil' | 'Vamanjoor' | 'Surathkal' | 'NH-66';
  category: 'CAFE' | 'BAKERY' | 'SHOP' | 'HOME' | 'PARKING';
  description: string;
  latitude: number;
  longitude: number;
  socket_type: SocketType;
  supported_sockets: SocketType[];
  availability_status: AvailabilityStatus;
  opening_time: string;
  closing_time: string;
  charge_and_dine: boolean;
  two_wheeler_friendly: boolean;
  distance_km: number;
  rating: number;
  reviews_count: number;
  parking_details: string;
  weather_protection: string;
  amenities: string[];
  available_slots: string[];
  monsoon_photo_url?: string;
  verification_status: VerificationStatus;
  is_demo: boolean;
}

export interface Booking {
  id: string;
  driver_id: string;
  location_id: string;
  location_name: string;
  corridor: string;
  socket_type: SocketType;
  start_time: string;
  end_time: string;
  duration_minutes: 120 | 150;
  base_amount: number;
  convenience_fee: number;
  total_amount: number;
  host_payout: number;
  platform_share: number;
  status: 'CONFIRMED' | 'ACTIVE_SESSION' | 'COMPLETED' | 'CANCELLED';
  signed_token_reference: string;
  created_at: string;
}

export interface ChargingSession {
  id: string;
  booking_id: string;
  check_in_time: number;
  scheduled_end_time: number;
  actual_end_time: number | null;
  estimated_range_added: number;
  relay_status: 'ON' | 'OFF';
  overstay_minutes: number;
  idle_fee: number;
  sync_status: 'SYNCED' | 'PENDING_SYNC' | 'RECONCILED';
}

export interface AdminConfig {
  baseAmount: number;
  convenienceFee: number;
  hostPayout: number;
  platformShare: number;
  graceMinutes: number;
  idleFeePer30Min: number;
  rangeKmPerHour: number;
  electricityTariffPerKwh: number;
  assumedKwhPer2Hr: number;
}
