# Spa Platform — Project Context for Claude Code

## What this is
A spa/wellness booking-and-shop platform. Requirements were derived from client
voice-note transcripts and locked in through a Q&A session — see
`docs/spa-platform-spec.md` for the full source-of-truth spec (data model,
module breakdown, and every decision that's been confirmed with the client).
Read that file before making architectural changes.

## Stack
- **Backend:** Node.js + Express + Prisma ORM
- **Local DB:** SQLite (`prisma/dev.db`, gitignored) — zero setup, no DB server needed
- **Production:** Hostinger **VPS** at `168.231.76.58`, app deployed to
  `/var/www/auramed-spa-platform` and kept alive via **PM2** as process
  `auramed` (`pm2 restart auramed` after a `git pull`). MySQL runs locally on
  the same VPS. This supersedes the earlier Hostinger Business/hPanel Node.js
  App Manager plan referenced in README's "Moving to MySQL" section — that
  section is now stale (no hPanel, no auto-managed restarts; PM2 does that
  here) and should be rewritten next time someone touches deploy docs.
  **Note:** the VPS's `prisma/schema.prisma` has its datasource block swapped
  to `provider = "mysql"` (plus a `shadowDatabaseUrl`, needed since the deploy
  flow runs `prisma migrate dev` directly on the server) — but only on the
  server itself, never committed here, so local dev keeps working against
  SQLite with zero setup. See `prisma/schema.production-reference.prisma` for
  an exact, documented copy of that block, so a VPS rebuild has a record to
  restore from instead of that config only ever existing as an untracked
  diff on the live server.
- **Auth:** JWT (`jsonwebtoken`) + bcrypt password hashing
- **Payments:** PayPal only (client decision — do not add Stripe)
- **Frontend:** merged into this repo under `public/` — 9 static HTML pages
  (index, treatments, procedure-1, shop, team, suzanne, results, who-we-are,
  contact, appointment) built premium-editorial style (Playfair Display +
  Inter, forest green/gold/cream palette). Served directly by Express via
  `express.static("public")`. `procedure-1.html` and `suzanne.html` are
  **templates** — one treatment and one specialist rendered statically; these
  become dynamic once wired to the API (not yet done, by design — content/
  design fixes come first).

### Frontend image handling
All images were originally pulled from external URLs (Unsplash stock photos +
the client's real specialist photos hosted on `auramed.wailamtech.com`) — this
was one of the client's explicit complaints. They've been localized:
- Every `<img src>` and CSS `url(...)` now points to `/images/gallery/...` (stock
  placeholders) or `/images/team/...` (real client-provided photos, renamed
  meaningfully, e.g. `evelyn-thorne.png`).
- The actual image *files* are not committed to git — `scripts/image-manifest.json`
  maps each local path back to its source URL, and `npm run images:download`
  fetches them all into place. Run this once after cloning (see README).
- If you add a new image anywhere, add its URL to `image-manifest.json` with a
  local path under `images/gallery/` or `images/team/`, reference the local
  path in the HTML, and re-run `npm run images:download` — don't hardcode a
  new external URL, that reintroduces the exact problem the client flagged.

### Frontend fixes already applied (from client transcript)
- Hero background overlay was washing out the image ("very faint" complaint) —
  gradient opacity reduced so the photo reads clearly.
- `who-we-are.html` had `--bg-sand` (the page background token) mistakenly set
  to a pink hex (`#f8cdf8`) instead of the off-white used on every other page
  — this was a copy-paste bug, not an intentional design choice. Fixed to
  match the rest of the site.
- "Numbers Don't Lie" homepage section now has a count-up animation
  (`public/js/counter.js`), triggered once via IntersectionObserver when the
  section scrolls into view.
- **Flag for the client/Gerald to review:** `index.html` reuses Dr. Evelyn
  Thorne's headshot (`evelyn-thorne.png`) as a background image in one
  section, unrelated to her profile. Likely a placeholder mistake — worth
  confirming before launch rather than silently changing it.
- Logo is still text-based (`AURAMED / Spa & Wellness`) — this is the
  placeholder per the client's own instruction ("use a placeholder" until she
  picks a final logo). No action needed until the real logo file arrives.

## Confirmed business rules — do not deviate from these without asking
1. **Booking is request-and-confirm, not a self-service calendar.** Client
   submits treatment + preferred date/time (no specialist chosen). Staff
   assigns a specialist and confirms/declines. Overlap with another booking
   for the same specialist is **flagged, not blocked** — staff decide.
2. On confirming a booking, staff choose **pay-now-to-confirm** or
   **confirm-now-pay-later**. Never assume payment happens before confirmation.
3. Client is notified of the outcome via **whichever channel they used to
   submit the request** (email/SMS/WhatsApp/app) — store `notificationChannel`
   per booking and use it, don't default to email.
4. **Guests can book and buy without registering.** Guest bookings/orders
   store name/email/phone directly on the record (no Member row required).
5. **Guest cart persists** across visits via a cookie token (`cartToken`) —
   see `src/routes/products.js` cart endpoints. Don't make cart account-only.
6. **Super Admin can view and delete members, but cannot edit them.** This is
   intentional per the client — do not add a PUT/PATCH members endpoint
   without explicit client sign-off.
7. **Specialist photo is a required field.**
8. Treatment categories are a fixed enum: **Face, Skin, Body, Wellness.**
   Don't let admins free-type new categories.
9. Payment gateway is **PayPal only**.

## Roles
- `SUPER_ADMIN` — full CRUD on treatments/products/specialists/staff, view+delete
  members, sees all bookings/payments.
- `STAFF` — manages the booking queue (assign specialist, confirm/decline,
  send reminders), no CRUD on catalog content.
- `MEMBER` — self-registers, books/buys, sees own history.
- Guest — no account, can still book and buy (see rules 4–5 above).

## Conventions
- Route files live in `src/routes/`, one file per resource, follow the pattern
  in `src/routes/treatments.js` (public GETs unguarded, mutations behind
  `requireAuth` + `requireRole(...)`).
- Prisma client is a singleton at `src/lib/prisma.js` — import that, don't
  instantiate `new PrismaClient()` elsewhere.
- Image/JSON-array fields (e.g. `Treatment.images`, `Member.healthConditions`)
  are stored as JSON strings in SQLite — `JSON.stringify`/`JSON.parse` at the
  route boundary, not in the schema.
- Uploaded images go to `/uploads` (served statically) — matches the client's
  requirement that images come from a local folder, not external URLs.
- `src/index.js` requires `express-async-errors` before the route files load.
  That's why route handlers can be plain `async` with no try/catch — a rejected
  promise goes to the error handler at the bottom of `index.js` instead of
  crashing the process. Don't remove that require, and don't add per-route
  try/catch just for this.
- Literal path segments must be registered **before** `/:id` in the same router,
  or they get matched as an id — e.g. `/admin/all` in `treatments.js` and
  `/cart` in `products.js`.

## What NOT to do
- Don't add Stripe or another payment gateway — PayPal only, confirmed.
- Don't build a slot/calendar-availability UI — this is a request queue.
- Don't add a member-edit endpoint for Super Admin.
- Don't rebuild the frontend framework — this repo is API-only.

## Admin dashboard (public/admin/)
Vanilla JS/HTML admin panel, same static-file approach as the rest of the site —
no framework. Served by Express alongside everything else in `public/`.
- `login.html` → posts to `/api/admin/login`, stores JWT + role in `localStorage`.
- `dashboard.html`, `treatments.html`, `specialists.html`, `products.html`,
  `staff.html`, `bookings.html`, `members.html`, `payments.html`.
- `admin.js` — shared auth guard (`AdminAuth.requireAuth(["SUPER_ADMIN"])`),
  a `fetch` wrapper that attaches the JWT and redirects to login on 401, and
  a `renderSidebar()` that filters nav links by role. Every protected page
  calls both at the top, before rendering anything else.
- Role gating in the UI mirrors the API: `STAFF` only sees Booking Queue;
  everything else (catalog CRUD, members, payments) is `SUPER_ADMIN`-only —
  don't add sidebar links or pages that expose more than the role's API access.
- Two backend gaps this UI needed, now closed: `GET /api/treatments/admin/all`
  (drafts + published, for the admin list) and `GET /api/bookings` (full
  history, not just the pending queue) — both added to their route files.
- Also closed while building this: server-side validation of `category`
  (treatments) and `weightUnit` (products) against the fixed value lists,
  since converting Prisma enums to `String` for SQLite removed DB-level
  enforcement — see the `VALID_CATEGORIES`/`VALID_WEIGHT_UNITS` constants at
  the top of `treatments.js`/`products.js`. Keep these in sync with the
  commented-out enum blocks in `schema.prisma`.
- **Image upload is now built.** `POST /api/uploads` (`src/routes/uploads.js`,
  SUPER_ADMIN-only) takes a single `multipart/form-data` file under field
  `image` (JPEG/PNG/WebP, 5MB max via `multer`), saves it to `/uploads` under
  a generated unguessable filename, and returns `{ url }`. The Treatments,
  Products, and Specialists admin forms now use a real file-picker
  (`AdminAuth.uploadImage()` in `admin.js`) that uploads on save and stores
  the returned URL — this replaces the old plain-text "Image URL / path"
  input. Note: the upload's file extension comes from the client-supplied
  filename, not the validated MIME type, so it can diverge from the declared
  type — low risk since the endpoint is SUPER_ADMIN-only, but worth tightening
  (map MIME type → extension) if this is ever opened up to more roles.
  PayPal is still a stub — the Payments page just displays whatever's in the
  `Payment` table.
## Frontend ↔ API wiring status
- **Wired to the API:** `treatments.html`, `shop.html`, `team.html` — these
  three list pages now fetch from `GET /api/treatments`, `/api/products`,
  `/api/specialists` respectively (see `public/js/render-{treatments,shop,team}.js`)
  and show an empty state ("check back soon") until content is added via the
  admin dashboard. **This replaced real hand-written sample content that was
  previously hardcoded** (actual specialist bios, treatment descriptions) —
  that content needs re-entering through the admin panel if it should stay live.
- **Not wired — deliberately deferred:** `procedure-1.html` and `suzanne.html`
  are single-treatment/single-specialist *templates* with bespoke marketing
  sections (a "Pathway Architecture" framework, day-by-day patient timelines,
  long narrative bios) that don't map onto the current schema. Converting
  these needs a content decision first — either add schema fields to capture
  that structure, or accept losing it — not a decision to make unilaterally
  in code. All "View Treatment"/specialist name links currently point to
  these same static templates regardless of which item was clicked.
- **Fields dropped in the transition** (present in the old static markup,
  not in the schema): treatment "Downtime", product "Skin Type", specialist
  short job title (e.g. "Chief Executive Officer" — using `workExperience`
  as the closest substitute for now). Add schema fields for these if the
  client wants them back rather than re-inventing them ad hoc per page.
- Admin forms for Treatments and Products (and Specialists' `photoUrl`) now
  upload a real image file via `POST /api/uploads` instead of taking a
  plain-text path/URL — see "Image upload is now built" above.
- Shop's "Add to Cart" calls the existing persistent-guest-cart endpoint
  (`POST /api/products/cart/add`) and confirms via `alert()` — no cart
  page/counter UI yet, that's a separate piece of work.
- **Homepage (`index.html`) "Our Products" carousel** was also still fully
  hardcoded (missed in the first wiring pass, caught by Gerald) — now wired
  via `public/js/render-homepage-products.js`. This one's trickier than the
  list pages: it's an infinite-scroll CSS animation
  (`.carousel-track`/`@keyframes scroll`) that assumed exactly 5 unique
  products duplicated to 10. Both now read a `--card-count` CSS variable set
  by the script, so the loop math stays correct for any product count. Shows
  up to 8 featured products (full catalog stays on `shop.html`); hides the
  whole section entirely if there are zero products, rather than showing a
  broken/empty carousel.
- Homepage's **"Clinical Modalities" section (Face/Skin/Body/Wellness tiles)
  is intentionally NOT wired to the API** — these are the 4 fixed category
  tiles from the original client transcript, not individual database
  records. Their "Discover →" links now point to `treatments.html` (were
  dead `#` links before) but don't filter by category yet — `treatments.html`
  has no category-filter query param support built. Worth adding if the
  client wants clicking "Face" to actually pre-filter the list.
- **`appointment.html` was rebuilt, not just wired.** Two real problems, not
  one: (1) its treatment-selection cards had no `<label>` wrapping and no
  click handler at all — clicking anything except the pre-checked first card
  did nothing, which is the actual bug Gerald reported ("can't pick
  treatments"). (2) It also had a "Step 2: Assign Clinician" letting the
  *client* pick a specialist directly — this **directly contradicted the
  confirmed booking flow** (rule 1: staff assigns the specialist, not the
  client) and has been removed entirely, not just hidden. Steps renumbered
  accordingly (Treatment → Date/Time → Your Details).
  - Treatment cards now render from `GET /api/treatments` with a working
    click handler (`public/js/render-appointment.js`).
  - Date/time: the old fake hardcoded "available time slots" pills are gone
    — this is a request-and-confirm model with no real availability engine
    (see booking rules above), so it's now a plain date + time input. Copy
    on the page says explicitly "this is a request, not an instant booking."
  - Added the required `notificationChannel` selector (email/SMS/WhatsApp)
    — was missing entirely before, and the Booking model requires it.
  - Submits to `POST /api/bookings` as a guest (name/email/phone) — no
    member-login integration on this page yet, so it can't yet pre-fill or
    attach to a logged-in member's account.
  - **Resolved:** the "Special Treatment Concerns / Medical Notes" textarea
    now actually goes somewhere. Added `Booking.notes` (nullable String) to
    the schema, the POST /api/bookings route accepts and stores it, the
    appointment form actually sends it (previously the field existed in the
    UI but nothing read its value), and it's now shown in the admin Booking
    Queue — highlighted in red with a ⚠ since it may contain allergy/medical
    information staff need before confirming, not just a nice-to-have. Full
    text is in a hover tooltip (`title` attr) since the table truncates long
    notes to 60 chars.
    **Requires a Prisma migration** (`npx prisma migrate dev`) since this
    adds a new column — don't skip that step when merging this update.

## Reviews & Referral Program
- **Review model** — one row per booking, created automatically when staff
  confirm a booking (`PATCH /api/bookings/:id/confirm`). Token-based, not
  login-based: the client's review link (`/leave-review.html?token=...`) is
  an unguessable token, matching how guest bookings already work — no
  account needed to leave a review. Staff copy/share the link manually from
  admin → Reviews (no auto-send yet). `isPublished` gates public display —
  staff approve each submitted review in admin → Reviews before it can show
  anywhere, protecting against bad-faith submissions. Public feed:
  `GET /api/reviews/public` (approved + rated only).
- **ReferralCode / Referral models** — available to guests, not just
  registered members (client decision, same reasoning as guest booking/cart).
  Every booker who gives an email gets a code automatically on their first
  booking (`POST /api/bookings`) if they don't already have one. Entering
  someone else's code at booking time (`Booking.referredByCode`, optional)
  creates a `Referral` row with `rewardStatus: PENDING`, which flips to
  `EARNED` automatically when that referred booking is confirmed. **The 10%
  reward itself is applied manually by staff** — there is no automated
  discount/payment logic; staff look the referrer up in admin → Referrals by
  name/email/phone at their next visit and mark it `REDEEMED` by hand.
- Appointment form has an optional "Referral Code" field (Step 3); an
  invalid/mistyped code is silently ignored rather than blocking the booking.
- **Next step, not done in this delta:** the homepage testimonials section is
  still hardcoded — it's now a good candidate to wire to
  `GET /api/reviews/public`, same pattern as the other homepage content gaps
  (treatments/shop/team lists, homepage products carousel) found earlier.

## Member Accounts & Loyalty Points
- **Member registration/login now actually exist on the frontend** at
  `/account/register.html` and `/account/login.html` — the backend endpoints
  (`POST /api/members/register`, `POST /api/members/login`) always existed,
  but nothing on the frontend used them until this delta. A logged-in member
  gets `/account/dashboard.html` (points balance + basic profile) via a
  separate `MemberAuth` session helper (`public/account/account.js`) — its
  own token/localStorage key, distinct from `AdminAuth`, since members and
  admin staff are different roles with different login pages.
- **Loyalty points are Member-only.** Flat 10 points per confirmed booking
  (`POINTS_PER_VISIT` in `src/routes/loyalty.js`), awarded automatically in
  `PATCH /api/bookings/:id/confirm` alongside the existing referral-reward
  and review-creation logic — guest bookings (no `memberId`) are silently
  skipped, same as the referral program's members-vs-guests split.
  `Member.loyaltyPoints` is a denormalized running total; `LoyaltyTransaction`
  is the full audit ledger (positive = earned, negative = redeemed).
  **The discount itself is applied manually by staff** via admin →
  Loyalty Points (`POST /api/loyalty/:memberId/redeem`, requires a note) —
  no automated discount/payment logic, same pattern as referrals.
- **Booking as a guest is still fully unaffected — this was a hard
  requirement.** Login on `/appointment.html` is informational only: a
  `#memberBanner` shows a "log in to earn points" nudge when logged out, or
  "Booking as [name] — you have N points" when logged in, but never gates or
  disables the guest fields. A logged-in member's booking additionally sends
  `memberId`, which only affects whether points get awarded on confirm.
- **Note:** registration intentionally has no profile-photo upload yet — the
  upload endpoint (`POST /api/uploads`) is Super-Admin-only, so members can't
  use it as-is. A member-accessible upload path is a reasonable small
  follow-up, not built here.

## Staff Login & Daily Schedule
- **A Staff profile and an `AdminUser` login are separate things**, linked
  via `AdminUser.staffId`. A Staff profile can exist with no login (someone
  who doesn't need system access — e.g. a masseuse who never touches the
  admin panel); the reverse isn't possible — a login always *optionally*
  references a Staff profile, never required to. Logins are created via
  admin → Staff (Super Admin only): "Create Login" per staff row
  (`POST /api/admin/staff-accounts`), "Reset Password" once one exists
  (`PATCH /api/admin/staff-accounts/:id/reset-password`). The role-based
  login/sidebar filtering this relies on already existed at the
  infrastructure level (login page, JWT, `requireRole`) — what was missing
  was any way to actually *create* a STAFF-role account; this closes that
  gap, it doesn't add new auth machinery.
- **Daily Schedule** (admin → Schedule, `GET /api/schedule?date=YYYY-MM-DD`,
  both roles) is a per-specialist view of one day's bookings — a different
  shape from the Booking Queue, which is pending-request-first, not
  therapist/day. Includes bookings of any status except `CANCELLED`
  (`PENDING` assignments show too, tagged with a status badge, since a
  tentative plan still matters for the day) grouped under the specialist
  they're assigned to, plus a separate "Not Yet Assigned" section for
  same-day bookings with no specialist — each links back to the Booking
  Queue to assign one.

## Open items still pending client input (see spec §5)
- Whether guest checkout requires at least email/phone capture before payment
- Whether members can self-cancel a booking, or must go through staff
- Logo, real photography assets, and the "Who We Are" page redesign direction
