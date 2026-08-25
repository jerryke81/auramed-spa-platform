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

## Moving to MySQL (production — confirmed: Hostinger Business)

Hostinger Business supports running Node.js apps directly via hPanel's Node.js
App Manager, plus MySQL databases — so this backend deploys to the same
account, no separate host needed.

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
2. In hPanel, create a MySQL database (Databases → MySQL Databases) and note
   the host, database name, username, and password it gives you.
3. Set `DATABASE_URL` in `.env` (and in hPanel's Node.js app environment
   variables panel) to:
   `mysql://username:password@host:3306/database_name`
4. Run `npx prisma migrate dev` locally against a test MySQL instance (or
   `prisma migrate deploy` directly against the Hostinger DB) to apply the schema.
5. In hPanel's Node.js section: create the app, point it at this repo's
   `src/index.js` as the entry file, set the same environment variables from
   `.env` there, and let hPanel handle the process (it manages restarts/PM2
   equivalent for you).
6. Uploads: either deploy the `uploads/` folder alongside the app, or point to
   a persistent storage path Hostinger gives the Node app — confirm this
   folder survives redeploys before relying on it in production.

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
