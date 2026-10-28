# Security model

Security is implemented in the application and in the data access layer, not in the UI.

## Authentication

- Passwords are hashed with bcrypt (cost 11). No plaintext or reversible storage.
- Sessions are opaque 32-byte random tokens; only a SHA-256 hash is stored in `Session`.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production, 30-day expiry, cleared on logout.
- Login is rate-limited per IP (8 attempts / 5 minutes for staff, 10 / 5 minutes for visitors).
- Deactivating a staff account deletes its sessions immediately.
- Public registration creates `isStaff = false`. Nothing in the public flow can grant a role.
- Email verification tokens are random, hashed at rest, single-use and expire in 48 hours.
  Registration never grants access to the admin area.

## Authorization

- Every server action begins with `requireStaffAction(permission)` or `requireUserAction()`.
- Every admin page begins with `requireStaffPage(permission)`; pages redirect to `/admin/login`
  when unauthenticated and to `/admin?denied=1` when unauthorized.
- Permissions are checked in the action, not inferred from a hidden button. A collector can
  create a draft but cannot publish (publishing requires `property.review` + `property.publish`),
  cannot read CRM data, and cannot reach `/admin/staff`.
- Role changes, deactivations, publication, price changes, archive/restore, media changes and
  settings updates write `AuditLog` rows with actor, before/after values and timestamp.

Verified end-to-end in this build: an owner session renders the dashboard and the team page;
a collector session is redirected from `/admin/staff` to `/admin?denied=1` while still
receiving `/admin/properties`.

## Data exposure

- Public queries use explicit Prisma `select` projections. Internal notes, owner contacts,
  publication permission, data source, staff identities, verification evidence and review
  notes are never selected on public routes.
- The public JSON endpoint `/api/properties` accepts ids and returns only whitelisted card
  fields for publicly visible statuses.
- Drafts, in-review listings and archived listings return 404 on their public URL.
- CRM and owner contact data are only reachable through permission-guarded admin pages.
- IP addresses are stored only as a salted SHA-256 hash on inquiries.

## Input handling

- Every mutation parses input with zod schemas (`src/lib/validation.ts`); unknown fields are
  dropped, numbers are normalised, enums are constrained.
- Uploads are limited to JPEG/PNG/WebP/AVIF, 8 MB, and are decoded and re-encoded with sharp
  (which also strips EXIF and rejects files that are not real images).
- Public forms use a honeypot field, a per-IP rate limit, and property visibility checks.
- IDs are opaque cuids; no enumerable numeric identifiers are used in URLs.

## Transport and headers

`next.config.ts` sets `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy` and disables `X-Powered-By`. HTTPS and HSTS belong at the reverse proxy
(see `DEPLOYMENT.md`).

## Secrets

All secrets come from environment variables and are never committed: `SESSION_SECRET`,
database URL, storage keys, e-mail provider key, map token. `.env` is git-ignored; `.env.example`
documents every variable with no real values. Nothing secret is accepted through the admin UI.

## Known limitations of this build

- Row-level security is not used because SQLite has no RLS. The equivalent guarantee is
  enforced in server code (single writer path) and should be moved into Postgres RLS policies
  when deploying, using the same role/permission model.
- Rate limiting is in-process; a multi-instance deployment needs a shared store.
- There is no 2FA, no password reset e-mail flow, and no CSRF token beyond Next's server-action
  origin checks. These are listed in `LIMITATIONS.md`.
- No security certification or legal compliance claim is made.
