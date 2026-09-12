# Spa Platform — Backend

Node/Express API + Prisma ORM for the spa booking-and-shop platform.
Full requirements: `docs/spa-platform-spec.md`. Project rules for Claude Code: `CLAUDE.md`.

## First-time setup (Windows)

```powershell
# 1. Install dependencies
npm install

# 2. Create your local env file
copy .env.example .env
# Open .env and set JWT_SECRET to any long random string.
# Leave DATABASE_URL as-is for local SQLite dev.

# 3. Create the local database + tables
npx prisma migrate dev --name init

# 4. Seed an initial Super Admin account
npm run seed
# Creates admin@spa.local / changeme123 — change this password immediately
# once you build the "change password" flow.

# 5. Download the frontend's images (stock placeholders + real client photos)
npm run images:download
# Populates public/images/gallery and public/images/team.
# The HTML already references these local paths — this just fetches the files.

# 6. Start the API + frontend
npm run dev
```

The site (frontend + API) will be running at `http://localhost:4000` — open
that in a browser to see `index.html`. Check `http://localhost:4000/api/health`
to confirm the API side is up too.

## Day-to-day with Claude Code

Open this folder in Claude Code:

```powershell
cd path\to\spa-platform
claude
```

Claude Code will read `CLAUDE.md` automatically for project context and rules.
Point it at `docs/spa-platform-spec.md` for the full requirements if it needs
more detail on a specific module.

## The frontend (public/)

9 static pages, currently pulling placeholder/sample content. See
`CLAUDE.md` → "Frontend image handling" for how images are localized, and
"Frontend fixes already applied" for what's already been corrected from the
client's own transcript notes (hero image faintness, a mis-set pink
background token on who-we-are.html, and the stats counter animation).

`procedure-1.html` and `suzanne.html` are templates for one treatment and one
specialist — wiring these (and the treatments/shop/team list pages) to the
new API is the next phase, once remaining content/design items are settled.

## Admin dashboard

Once `npm run dev` is running, go to `http://localhost:4000/admin` — it
redirects to the login page. Sign in with the seeded account:

```
Email:    admin@spa.local
Password: changeme123
```

Change this password once a "change password" flow exists — for now it's
only stored via the seed script, there's no UI to update it.

From there: **Dashboard** (overview stats), **Booking Queue** (the
request-and-confirm workflow — assign a specialist, then confirm with
pay-now/pay-later or decline), and Super-Admin-only pages for
**Treatments, Specialists, Products, Staff, Members** (view/delete only,
no edit — intentional, see spec), and **Payments** (view only).

If you create a `STAFF`-role `AdminUser` later (via Prisma Studio or a
route you add), they'll only see Dashboard and Booking Queue — the sidebar
and the underlying API routes both enforce that.

## Inspecting the database

```powershell
npx prisma studio
```

Opens a browser GUI at `http://localhost:5555` to view/edit rows directly —
useful for checking seeded data or debugging without writing queries.

## Moving to MySQL (production — confirmed: Hostinger VPS)

> **Superseded:** this section originally described deploying via Hostinger
> Business's hPanel Node.js App Manager. Production has since moved to a
> **Hostinger VPS** (`168.231.76.58`) instead — the app lives at
> `/var/www/auramed-spa-platform` and is kept running with **PM2** as the
> process named `auramed`, not hPanel's managed Node.js runner. MySQL runs
> locally on that same VPS rather than through hPanel's MySQL Databases panel.
> Steps below are updated accordingly; step 1 (schema/enum notes) still applies
> as-is.
>
> **The step 1 swap has been made directly on the VPS, not in this repo.**
> The committed `prisma/schema.prisma` datasource block intentionally still
> says `provider = "sqlite"`, so a fresh clone keeps working with zero-setup
> local dev — see `prisma/schema.production-reference.prisma` for an exact,
> documented snapshot of what the datasource block (and the shadow DB URL it
> needs) actually says on the live server, so a VPS rebuild doesn't have to
> reconstruct that config from scratch.

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```
   While you're in there: SQLite can't do enums, so `category`, `role`,
   `status`, etc. are typed `String` with their allowed values in comments,
   and validated in the route files (`VALID_CATEGORIES` / `VALID_WEIGHT_UNITS`).
   MySQL *does* support enums — uncomment the enum blocks near the top of the
   schema and switch those fields back to the enum types to get DB-level
   validation in production.
2. On the VPS, create a MySQL database and user for the app (`mysql` CLI or
   equivalent) and note the database name, username, and password.
3. Set `DATABASE_URL` in the VPS app's `.env` (at
   `/var/www/auramed-spa-platform/.env`) to:
   `mysql://username:password@localhost:3306/database_name`
4. Run `npx prisma migrate dev` locally against a test MySQL instance first,
   then `prisma migrate deploy` on the VPS to apply the schema against the
   real production database.
5. Deploy by pulling into `/var/www/auramed-spa-platform` on the VPS
   (`git pull`), installing any new dependencies (`npm install`), applying
   pending migrations (`prisma migrate deploy`), and restarting the process:
   `pm2 restart auramed`. Unlike hPanel, PM2 does not auto-restart on a plain
   `git pull` — the restart step is required.
6. Uploads: the `uploads/` folder lives directly on the VPS at
   `/var/www/auramed-spa-platform/uploads` — persists across `git pull`
   deploys (it's gitignored, not part of the repo), but isn't backed up
   separately. Consider that before relying on it long-term.

## Folder structure

```
spa-platform/
├── CLAUDE.md              # Project rules/context for Claude Code
├── README.md              # This file
├── docs/
│   └── spa-platform-spec.md
├── prisma/
│   ├── schema.prisma      # Data model
│   └── seed.js            # Creates initial Super Admin
├── public/                # Frontend — served statically by Express
│   ├── index.html, treatments.html, shop.html, etc.
│   ├── images/
│   │   ├── gallery/       # stock placeholders (gitignored, run images:download)
│   │   └── team/          # real client photos (gitignored, run images:download)
│   └── js/counter.js      # Numbers Don't Lie count-up animation
├── scripts/
│   ├── image-manifest.json  # URL → local path mapping
│   └── download-images.js   # Populates public/images/*
├── src/
│   ├── index.js           # Express app entry (serves public/ + API)
│   ├── lib/prisma.js      # Prisma client singleton
│   ├── middleware/auth.js # JWT auth + role guard
│   └── routes/            # One file per resource (treatments, bookings, etc.)
└── uploads/                # Local image storage for admin-uploaded content
```

## API endpoints (current scaffold)

| Resource | Endpoints |
|---|---|
| Treatments | `GET /api/treatments`, `GET /:id`, `GET /admin/all` (admin/staff, incl. drafts), `POST`, `PUT /:id`, `PATCH /:id/publish`, `DELETE /:id` |
| Specialists | `GET /api/specialists`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id` |
| Products | `GET /api/products`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id`, plus cart endpoints |
| Bookings | `POST /api/bookings` (request), `GET /` (admin, full history), `GET /pending`, `PATCH /:id/assign`, `PATCH /:id/confirm`, `PATCH /:id/decline` |
| Members | `POST /register`, `POST /login`, `GET /` (admin, view-only), `DELETE /:id` (admin) |
| Staff | `GET /api/staff`, `POST`, `PUT /:id`, `DELETE /:id` |
| Payments | `POST /create`, `POST /:id/capture`, `GET /` (admin) |
| Admin auth | `POST /api/admin/login` |

All mutating endpoints (except public booking requests and member
registration/login) require a Bearer JWT and the appropriate role.

## Still to build
- PayPal Orders API integration (stub is in `src/routes/payments.js`)
- Notification dispatch (email/SMS/WhatsApp/push) tied to `notificationChannel`
- Image upload handling via `multer` for specialists/products (currently a
  plain text photo URL/path field in the admin forms — see `public/admin/`)
