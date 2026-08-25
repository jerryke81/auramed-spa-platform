# Spa Platform — Requirements Map
*Derived from MODULES_TRANSCRIPTS.pdf (client voice notes, 9 modules)*

---

## 1. System Overview

A spa/wellness booking platform with three surfaces:
1. **Public website** — browsable by anyone (treatments, products, team, results)
2. **Member portal** — registered clients, richer profile, direct booking
3. **Super Admin dashboard** — full backend control of all content and operations
4. Plus a **Staff view** (subset of admin) and an **Android app** (client-facing mirror of the website)

Core loop: Super Admin creates Treatments/Products/Specialists → these populate the public site from a database → Members or Guests browse and book → Staff manage the resulting bookings → Payments are tracked against bookings/orders → Super Admin sees everything in one dashboard.

---

## 2. User Roles & Permissions Matrix

| Capability | Super Admin | Staff | Member | Guest (non-member) |
|---|---|---|---|---|
| Add/edit/delete treatments | ✅ | ❌ | ❌ | ❌ |
| Add/edit/delete products | ✅ | ❌ | ❌ | ❌ |
| Add/edit/delete specialists | ✅ | ❌ | ❌ | ❌ |
| Add/edit/delete staff | ✅ | ❌ | ❌ | ❌ |
| View all members | ✅ (view + delete only, **no edit**) | ❌ | own profile only | — |
| View bookings | ✅ (all) | ✅ (own/assigned) | own only | own only |
| Send booking reminders (email/SMS/WhatsApp/in-app) | ✅ (sees log) | ✅ | — | — |
| Cancel a booking | ✅ | ✅ | — (assumed — **clarify**) | — |
| View payment status | ✅ | ❌ (not mentioned) | own only | own only |
| Register/create own profile | — | admin-created | self-registers | n/a |
| Book appointment | — | — | ✅ | ✅ |
| Purchase product | — | — | ✅ | ✅ (assumed — **clarify**) |

**Note:** transcript explicitly says Super Admin *cannot* edit a member profile, only view/delete. That's an unusual constraint worth confirming — most systems would want at least a "flag/suspend" ability.

---

## 3. Core Data Entities

### Treatment
| Field | Notes |
|---|---|
| name | text |
| images | 2 images per treatment |
| category/class | enum: **Face, Skin, Body, Wellness** |
| duration | numeric value + unit (minutes / hours / days) |
| description | long text |
| cost | numeric, USD |
| specialists | many-to-many link to Specialist entity |
| patient experience bulletin | structured table: item ↔ procedure step pairs |
| history of procedure | long text (admin-authored) |
| patient requirements/contraindications | long text (e.g. allergy warnings) |
| status | live/draft (implied by "commissioned") |

Detail page shows all of the above + specialist credentials (pulled from Specialist entity) + a **Book Appointment** button at the bottom.

### Specialist
| Field | Notes |
|---|---|
| name | text |
| academic background | text |
| work experience | text |
| treatment specialization | many-to-many link to existing Treatments (picked from list, not free text) |
| photo | **required field** (confirmed with client) |

Appears on a dedicated **Specialists page** (not the Staff page — these are distinct entities/pages).

### Product
| Field | Notes |
|---|---|
| name | text |
| images | pictures |
| category | selected from list |
| weight/volume | numeric value + unit (kg / liter / grams) |
| description | text |
| price | numeric, USD |

Shop page card shows: name, category, short description snippet, price, volume, **View Details** + **Add to Cart**.

### Staff Member
| Field | Notes |
|---|---|
| name | text |
| position | text |
| date of birth | date |

Staff accounts are for **operational** use (viewing/managing bookings), separate from the public-facing Specialists.

### Member
| Field | Notes |
|---|---|
| first / middle / last name | text |
| gender | enum |
| date of birth | date |
| nationality | text |
| profile photo | image |
| mobile, email, physical address | contact block |
| password | hashed |
| health conditions | multi-select: high blood pressure, diabetes, pregnancy, asthma, heart condition, recent surgeries, allergies, etc. |
| interested services | multi-select: massage, facial, body scrub, body wrap, reflexology, aromatherapy, waxing, jacuzzi, steam bath, sauna, manicure, pedicure, hair spa, couples package, wellness consultation |
| emergency contact | name, relationship, phone |
| membership tier | Silver / Gold / Platinum / VIP / Not sure |
| marketing preference | receive promotions Y/N (single choice) |
| terms/privacy agreement | boolean, must tick before completing registration |

### Booking
Cross-cutting entity linking Member/Guest ↔ Treatment ↔ Specialist(?) ↔ Staff ↔ Payment status ↔ date/time.
**This entity is under-specified in the transcript — see Open Questions below.**

### Payment
| Field | Notes |
|---|---|
| linked to | booking OR product order |
| method | card (Stripe/PayPal), or "pay at spa" |
| status | Paid / Pending |
| amount | USD |

---

## 4. Module-by-Module Build Plan

### 4.1 Website (Frontend — public site)
**Frontend tasks:**
- Swap placeholder logo (client hasn't finalized choice — use placeholder now, swap later)
- Fix hero image: currently too faint, needs a stronger visual
- **Critical fix:** homepage images currently pull from external/online URLs — must be switched to pull from a local `/images` folder or the media library instead
- Build "Clinical Modalities" section: 4 category tiles — Face / Skin / Body / Wellness
- Add number-counter animation to the "Numbers Don't Lie" stats section (simple count-up-on-scroll effect)
- "Results Speak for Themselves" section — keep layout, swap in real client-provided photos
- Shop preview section on homepage — already wired to pull from DB, keep as-is
- Treatments section — keep current look/feel, connect to DB (see 4.2)
- Blog — open-ended, no fixed template required yet
- Static content pages needed: FAQs, Terms, Before/After Results gallery (~10 entries, real photos pending from client), Our Team, Get in Touch (approved as-is)
- **"Who We Are" page — needs a redesign pass:** current color (a "deep pink") isn't working; client wants to keep the half-face high-quality portrait section but rework the color block beneath it, possibly with a background image instead of flat color

**Backend tasks:**
- Media handling: local image folder ingestion instead of external URL scraping
- API endpoints to feed homepage sections (categories, featured products, featured treatments)

### 4.2 Treatment Module
**Frontend tasks:**
- Admin CRUD screens: list / add / edit / delete treatment
- Add-treatment form: name, 2 images, category (select, not free text), duration (number + unit selector: minutes/hours/days), description, cost (USD), specialist(s) (multi-select from existing Specialist records — selecting one pulls in their credentials to display on the treatment page), patient experience bulletin (repeatable item/procedure row table), history of procedure (rich text), patient requirements (rich text)
- Public treatment detail page: renders all fields in the "nice presentable table" the client references, ends with a **Book Appointment** button

**Backend tasks:**
- `treatments` table + `treatment_specialists` join table
- `treatment_bulletin_items` table (item, procedure pairs, ordered)
- Category enum constrained to Face/Skin/Body/Wellness
- Endpoint to publish a treatment live to the public treatments listing once "commissioned"

### 4.3 Specialist Module
**Frontend tasks:**
- Admin CRUD: list / add / edit / delete
- Add form: name, academic background, work experience, specialization (multi-select from existing treatments)
- Public Specialists page: grid → click through to full profile

**Backend tasks:**
- `specialists` table + link to `treatments` (already covered by join table above)
- Public endpoint for specialist list + detail

### 4.4 Products Module
**Frontend tasks:**
- Admin CRUD: list / add / edit / delete
- Add form: name, image(s), category (select), weight/volume value + unit (kg/liter/grams), description, price (USD)
- Shop page card: name, category, description snippet, price, **View Details**, **Add to Cart**
- Product detail page

**Backend tasks:**
- `products` table
- Cart logic: **persistent guest cart via browser cookie/local storage token** — cart survives return visits without requiring an account (confirmed with client). On checkout, cart converts to an order and (for members) can also link to their member_id.

### 4.5 Purchase / Payment Module
**Frontend tasks:**
- Checkout flow: pay now (card/PayPal/Stripe) vs. pay at spa
- Admin payment status view per booking/order (Paid / Pending)

**Backend tasks:**
- Payment gateway integration: **PayPal only** (confirmed with client)
- `payments` table linked to bookings and product orders
- PayPal webhook handling for payment confirmation/status updates

### 4.6 Staff Module
**Frontend tasks:**
- Admin CRUD for staff (name, position, DOB)
- Staff-facing view: upcoming bookings list, booking detail, actions: confirm / remind / cancel
- Reminder dispatch UI with channel choice: email, SMS, WhatsApp, in-app push

**Backend tasks:**
- `staff` table
- `booking_actions_log` (who sent what reminder/cancellation and when) so Super Admin can audit staff actions
- Integration points: email service, SMS gateway, WhatsApp Business API, push notifications for the app

### 4.7 Members Module
**Frontend tasks:**
- Multi-step self-registration wizard (name → DOB/nationality/photo → contacts → password → health conditions checklist → interested services multi-select → emergency contact → membership tier preference → marketing opt-in → terms/privacy agreement → submit)
- Member login + dashboard: book direct (pre-fills their details), view own bookings/history

**Backend tasks:**
- `members` table + related child tables for health conditions, interested services (many-to-many against lookup tables) and emergency contact
- Auth (hashed passwords, session/JWT)
- Booking pre-fill logic from member profile

### 4.8 Super Admin Module
**Frontend tasks:**
- Central dashboard: treatments, products, specialists, staff (full CRUD), members (view + delete only, no edit), payments overview (paid/pending), bookings overview (status: pending/confirmed/cancelled)

**Backend tasks:**
- Role-based access control distinguishing Super Admin from Staff
- Aggregate reporting endpoints (payment totals, booking counts, member counts)

### 4.9 Booking Module — **Finalized Design (confirmed with client)**

This is a **request-and-confirm** model, not a self-service slot picker.

**Flow:**
1. Client (member or guest) picks a treatment and submits a requested date/time. No specialist is chosen at this stage.
2. Request enters a **pending queue**, visible to Staff and Super Admin.
3. Staff reviews the request and **assigns a specialist**, then either **confirms** or **declines** it.
   - If the assigned specialist already has an overlapping booking (pending or confirmed), the system **flags this for staff** — it does not block automatically.
4. On confirming, staff picks one of two paths:
   - **Pay to confirm** — client must complete payment before the booking is finalized.
   - **Confirm now, pay later** — booking is accepted immediately; payment (e.g. at the spa) is deferred.
5. Client is notified of the outcome (confirmed/declined) via **whichever channel they used to submit the request** — email, SMS, WhatsApp, or in-app.

**Frontend tasks:**
- Client-side: simple request form (treatment + preferred date/time + contact channel), no calendar/slot UI needed
- Guest requests capture name/email/phone directly (no account required)
- Staff-side: pending request queue, "assign specialist" action, confirm/decline buttons, payment-path choice on confirm, conflict flag indicator
- Notification trigger tied to whichever channel the request came in on

**Backend tasks:**
- `bookings` table: member_id (nullable for guest), guest_name/email/phone (nullable if member), treatment_id, specialist_id (nullable until staff assigns), requested_datetime, status (pending/confirmed/declined/cancelled), payment_option (pay_now/pay_later), payment_id (nullable), notification_channel, created_at, confirmed_at
- Simple overlap-check query on confirm (same specialist_id + overlapping requested_datetime among pending/confirmed bookings) — returns a flag, not a block
- No availability/calendar engine required — this significantly reduces scope vs. a slot-based system

### 4.10 App Module (Android)
Client-only mirror of the booking/shopping flow:
- Login (email + password)
- Browse treatments / products (toggle at top)
- Book treatment, purchase product, pay in-app
- Push notifications for promotions and booking confirmations/reminders

**Backend tasks:**
- Shared API layer consumed by both website and app (don't build app-only endpoints — reuse the same treatment/product/booking/payment API)
- Push notification service integration

---

## 5. Open Questions

### Resolved
- ~~Booking flow~~ — **request-and-confirm model**, see §4.9.
- ~~Payment gateway~~ — **PayPal only**.
- ~~Guest cart persistence~~ — **persists across visits via cookie/local token, no account required**.
- ~~Super Admin edit rights on members~~ — **confirmed as-is: view + delete only, no edit**.
- ~~Specialist photo~~ — **required field**.

### Still open — worth a short client check before building
1. **Guest checkout scope** — guests can book treatments and now have a persistent cart, but it's still unconfirmed whether guests can fully complete a *purchase* (pay + receive order) without any account, or whether checkout itself requires at least an email/phone capture (which would effectively create a lightweight guest record).
2. **Cancellation rights for members** — staff can cancel bookings; unclear if a member can cancel their own booking from their dashboard, or must contact staff.
3. **Logo** — client is still deciding between two logo options; use a placeholder until confirmed.
4. **Real photography** — Results/before-after gallery, Team, and hero section all depend on client supplying real photos; treat these as placeholder-until-asset-delivery items.
5. **"Who We Are" page redesign** — client wants to keep the split-face portrait treatment but rework the color panel; no firm direction given beyond "not deep pink" — will need a design mockup round rather than a literal spec.

---

## 6. Suggested Tech/DB Shape (for your stack)

Given your usual approach (static HTML/vanilla JS frontend + lightweight backend), a reasonable shape here:
- **Backend:** Node/Express + a relational DB (Postgres or MySQL) — this system has real many-to-many relationships (treatments↔specialists, members↔health conditions, members↔interested services) that a relational schema handles far more cleanly than flat JSON files.
- **Auth:** JWT for members and staff/admin, separate role claims.
- **Media:** local uploads folder (as client requested) rather than external image URLs, served via the backend or a static asset path.
- **Frontend:** keep the current site's look/feel; convert the sections currently hardcoded (treatments, products, team, specialists) to fetch from the new API instead of static markup.
- **App:** consumes the same REST API as the website — no separate backend needed.
