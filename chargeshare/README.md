# ChargeShare — Community 2W EV Charging & Slot Discovery (Mangaluru MVP)

ChargeShare is a mobile-first, offline-resilient web application designed to eliminate two-wheeler electric vehicle (EV) charging dead zones across **Mangaluru, Karnataka, India** (**Derlakatte, Valachil, Adyar, Vamanjoor, Surathkal, and NH-66 corridors**). It connects electric scooter riders with local cafes, bakeries, retail shops, and homeowners offering compatible **15A standard, 16A standard, and 3.3 kW AC** sockets.

---

## 1. Tech Stack & Architecture

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling & UI:** Tailwind CSS, shadcn/ui component primitives, Lucide Icons
- **Interactive Map:** Leaflet.js (`1.9.4`) with OpenStreetMap & Esri Street tiles + fallback list view
- **Backend & Database:** Supabase (PostgreSQL, Row-Level Security, Auth, Storage for IP65 enclosure photos) with **automatic zero-config Demo Mode fallback** when environment variables are absent
- **Offline-First Engine:** Progressive Web App (PWA `manifest.json`), Service Worker (`public/sw.js`), and IndexedDB (`src/lib/offline-db.ts`) with an idempotent synchronization queue
- **QR Code Generation & Scanning:** Client QR generation + Browser Camera QR Scanner (`getUserMedia`) + 4-digit Host PIN fallback (`4210` in demo mode, verified via salted SHA-256 digest)
- **Locale:** Currency `INR (₹)` • Timezone `Asia/Kolkata (IST)`

---

## 2. Quick Start (Works Immediately Without Supabase Keys)

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (automatically boots in Seeded Demo Mode if .env.local is not set)
npm run dev
```

Open `http://localhost:3000` on desktop or mobile. You can also open the standalone single-file build (`chargeshare.html`) directly in any browser.

### Optional: Connecting a Live Supabase Project

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Run the relational schema and RLS policies in `supabase/schema.sql` inside the Supabase SQL Editor.
3. Add your `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `BOOKING_TOKEN_PRIVATE_SECRET` to `.env.local`.

---

## 3. Security & Offline Honesty Guarantees

1. **No Frontend Secret Keys:** Secret signing keys (`BOOKING_TOKEN_PRIVATE_SECRET`) reside strictly on the server (`/api/bookings/token`). The QR code encodes only a signed booking token reference (`CSTOK.v1.<booking_id>.<location_id>.<duration>M.SIG_<signature>`), never personal data or host PINs.
2. **Offline Verification & Reconciliation:** While in Airplane Mode, the host device validates the cached booking signature against the public verification key and local IndexedDB store. Offline check-ins are marked `PENDING_SYNC` and reconciled idempotently (`booking_id + event_type` deduplication key) when connectivity returns.
3. **Hashed Host PINs:** Plaintext host PINs are never stored in PostgreSQL or IndexedDB. Production uses rate-limited server verification; offline demo mode uses local SHA-256 digest matching (`Demo PIN: 4210`).
4. **Regulatory & Hardware Transparency:**
   - Smart-plug relay (`Relay Status: ON / OFF`, `AUTO-CUTOFF AT: 00:00`) is a software-only visual simulation and does not switch physical mains electricity.
   - Uploaded IP65 monsoon enclosure photos are marked `Pending Verification` for manual administrator review and do not automatically certify IP65 compliance.
   - Slot convenience pricing (`₹40 base + ₹5 convenience fee = ₹45`; `₹34` host payout; `₹6` platform share) and electricity tariff comparisons (`₹7.50/kWh` configurable default) are illustrative assumptions subject to formal MESCOM tariff verification before commercial launch.

---

## 4. Three-Minute Judge Demonstration Script

Use the built-in **3-Min Judge Flow** ribbon at the top of the app to walk through all 6 stages on a single device:

1. **Part 1 — Show the Problem:** View the Mangaluru map highlighting two-wheeler charging dead zones across Derlakatte, Valachil/Adyar, and Vamanjoor.
2. **Part 2 — Demonstrate Discovery:** Filter by `15A standard socket`, `16A standard socket`, and `Charge & Dine` to select *Bean & Bolt Cafe Courtyard (Derlakatte)*.
3. **Part 3 — Demonstrate Booking:** Select a 2-hour (120m) slot and review the transparent `₹40 + ₹5 = ₹45` convenience slot breakdown before confirming demo checkout.
4. **Part 4 — Demonstrate Offline Reliability:** View the generated QR Booking Pass, toggle **Airplane Mode: ON**, and run the Offline QR / PIN Check-In (`PIN: 4210`).
5. **Part 5 — Demonstrate Active Charging:** Inspect the persisted live countdown timer, `+62 km` illustrative range estimate, `Relay Status: ON`, and trigger the simulated `00:00 AUTO_CUTOFF` and `+25m Overstay Alert` (`10-min grace period`, `₹10 / 30m` illustrative idle fee).
6. **Part 6 — Switch to Host Mode:** Use the instant one-click `[ DRIVER MODE ] [ HOST MODE ]` switcher to toggle host availability (`AVAILABLE / OFFLINE`), inspect the `₹34` host payout ledger, and test the 3-step Host Onboarding with mandatory IP65 monsoon enclosure photo upload.
