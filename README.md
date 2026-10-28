# IMPS — Real estate platform (Morocco)

A premium, database-driven property platform: a public Arabic/French website for buying,
renting and investing, plus the internal operations platform the IMPS team uses to source,
verify, review, publish and manage listings, staff permissions and customer inquiries.

Built with Next.js 15 (App Router, TypeScript, Server Actions), Tailwind CSS, Prisma and a
relational schema that runs on SQLite locally and PostgreSQL in production.

---

## What is implemented

**Public website (FR LTR / AR RTL, locale-prefixed URLs)**

- Home page: search panel, featured and recent listings, city tiles with live counts,
  commercial opportunities, developments, trust section, editorial guides, seller CTA.
- Search (`/fr/properties`, `/ar/properties`): transaction, category, city, neighbourhood,
  price, area, bedrooms, bathrooms, furnished, amenities, featured, "verified information",
  five sort orders, pagination, active-filter count, empty states, no-index for deep filter
  combinations, canonical URLs.
- Dedicated experiences: buy, rent, commercial, land, investment, new developments,
  cities, city pages with neighbourhood shortcuts, guides, about, contact, legal pages,
  report-a-listing.
- Property detail: gallery with fullscreen viewer, price and rental period, facts grid,
  description, amenities, verification panel (per-check, dated), approximate/exact location
  handling, inquiry form, viewing request, favourites, comparison, share, similar listings,
  JSON-LD, unreachable/unavailable state handling.
- Investment page computes **gross annual yield only from documented rent** and labels it as
  such; listings without a documented rent are shown without any yield.
- Favourites and comparison work for guests (localStorage) and sync to the account for
  signed-in visitors; accounts support email verification tokens, saved searches, viewing and
  inquiry history, and account deletion requests.
- SEO: server-rendered pages, per-page metadata, hreflang, canonical, Open Graph, XML sitemap
  (published content only), robots rules that exclude admin/private routes, breadcrumbs.
- Arabic first-class: RTL layout, Arabic typography (Noto Kufi Arabic), Arabic content fields
  per listing/city/article, Arabic admin navigation, locale-aware number/date formatting.

**Internal operations platform (`/admin`)**

- Role-based access control with 7 roles and 18 granular permissions, enforced **server-side**
  on every action and page, with an audit trail for sensitive operations.
- Dashboard with database-derived KPIs (inventory by status, review queue, stale listings,
  new inquiries, pending viewings, follow-ups due, pipeline, recent activity).
- Property management: create/edit, duplicate, media upload (validated + re-encoded),
  ordering, cover selection, deletion, price changes (permission + audit), archive/restore,
  publish workflow with a server-side publication gate, public preview.
- Sourcing pipeline: leads → contacted → collection → verification → review → approved,
  owner contacts (confidential), contact attempts, follow-up dates, conversion to a draft.
- Review queue: inspect a listing, approve & publish, request changes, reject, with history.
- Availability control: reconfirmation dates, stale-listing detection (configurable interval),
  statuses for reserved / sold / rented / unavailable / expired / archived / rejected.
- CRM: inquiries (public form, viewing form, report, phone/WhatsApp), statuses, assignment,
  priorities, follow-up dates, notes, linked viewings, personal-data access restricted by role.
- Viewing appointments: requested → confirmed / rescheduled / cancelled / completed / no-show,
  conflict warning on confirmation; a request is never displayed as confirmed.
- Internal tasks, notifications, reports, audit log, site settings, category/city/neighbourhood
  management, editorial content and developments.

**Engineering**

- Strict TypeScript, typed validation at every boundary (zod), server actions with explicit
  permission checks, normalized Prisma schema (25+ models), migrations, seed scripts.
- Public reads use explicit `select` projections so internal fields cannot leak; the public API
  also whitelists fields.
- 37 automated tests (RBAC matrix, validation, publication gate, lifecycle transitions,
  yield math, i18n parity, DB-level workflow and data-isolation tests).

---

## Quick start

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env
#    Set SESSION_SECRET (openssl rand -base64 48) and SEED_OWNER_PASSWORD

# 3. Database (SQLite by default)
npm run db:migrate      # creates prisma/dev.db
npm run db:seed         # roles, first owner, demo data (SEED_DEMO_DATA=true)

# 4. Run
npm run dev             # http://localhost:3000 → redirects to /fr
```

Demo accounts (only when `SEED_DEMO_DATA=true`):

| Role | Email | Password |
| --- | --- | --- |
| Platform owner | `owner@imps.ma` | value of `SEED_OWNER_PASSWORD` |
| Manager | `manager@imps.ma` | `DemoStaff!2026` |
| Collector | `collector@imps.ma` | `DemoStaff!2026` |
| Reviewer | `reviewer@imps.ma` | `DemoStaff!2026` |
| Customer relations | `crm@imps.ma` | `DemoStaff!2026` |
| Content editor | `editor@imps.ma` | `DemoStaff!2026` |
| Analyst | `analyst@imps.ma` | `DemoStaff!2026` |

**Change every password before any real use.** Demo listings are flagged `isSample` and
labelled "Démonstration" on the website.

Useful commands: `npm run build`, `npm start`, `npm test`, `npm run typecheck`,
`npm run db:studio`, `npm run db:reset`.

---

## Project structure

```
prisma/
  schema.prisma        relational model (SQLite local, PostgreSQL-ready)
  migrations/          SQL migrations
  seed.ts              roles, owner, demo data (never production listings)
src/
  app/
    (site)/[locale]/   public website (FR/AR)
    (admin)/admin/     internal platform (login + protected area)
    api/properties/    public read-only endpoint for favourites/compare
    actions/           server actions (auth, public forms, properties, sourcing, crm, taxonomy, content)
    sitemap.ts robots.ts
  components/          UI primitives, public and admin components
  lib/                 db, auth, rbac, validation, queries, i18n, formatting, media, audit
tests/                 vitest unit + database workflow tests
docs/                  architecture, security, acceptance evidence, limitations
```

See `docs/ARCHITECTURE.md` for the data model, permission matrix and request flow,
`docs/SECURITY.md` for the security model, `docs/ACCEPTANCE.md` for the acceptance-test
evidence, and `docs/LIMITATIONS.md` for what is not configured or not done.
