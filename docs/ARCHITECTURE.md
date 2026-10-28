# Architecture

## Runtime shape

One Next.js application, two experiences, one authoritative database.

```
Browser ──► Next.js (App Router)
              ├─ (site)/[locale]      public website, server-rendered per request
              ├─ (admin)/admin        staff platform, session-guarded
              ├─ server actions       all mutations, permission-checked
              └─ /api/properties      public read-only JSON (whitelisted fields)
                        │
                        ▼
                   Prisma ORM
                 ├─ SQLite (local dev / demo)
                 └─ PostgreSQL (production)
```

Public pages render on demand (`dynamic = "force-dynamic"` in each public page). That is a
deliberate choice: a listing's status, price and availability change during the day and a
stale page is a correctness bug for a real estate platform. Production can move to ISR with a
cookie-free header and per-listing cache tags — see `DEPLOYMENT.md`.

## Data model (25+ models)

| Group | Models |
| --- | --- |
| Identity & access | `Profile`, `Role`, `Permission`, `RolePermission`, `Session`, `EmailToken` |
| Geography | `City`, `Neighborhood` |
| Taxonomy | `PropertyCategory` (self-referencing tree), `Amenity`, `PropertyAmenity` |
| Inventory | `Property`, `PropertyOffer`, `PropertyMedia`, `PropertyStatusHistory` |
| Sourcing | `PropertyLead`, `OwnerContact`, `LeadContactAttempt` |
| Verification | `PropertyVerification`, `PublicationReview` |
| CRM | `Lead`, `LeadNote`, `ViewingAppointment`, `StaffTask`, `Notification` |
| Accounts | `SavedProperty`, `SavedSearch` |
| Content | `Article`, `ArticleCategory`, `Development`, `DevelopmentUnit` |
| Operations | `AuditLog`, `SiteSetting` |

Key decisions:

- **Property vs. offer.** Shared facts (location, area, media, amenities) live on `Property`;
  money lives on `PropertyOffer` rows with `transactionType`, `price`, `rentPeriod`. A property
  can have several offers over time without duplicating its content. `Property.primaryPrice` /
  `primaryRentPeriod` is a **denormalised read model** kept in sync by `src/lib/offers.ts` so
  search, sorting and cards can filter on price in SQL.
- **Publication state is explicit.** `status` covers the lifecycle (draft → in_review →
  published → reserved/sold/rented/unavailable/expired/archived/rejected), and
  `sourcingStage` tracks the operational pipeline. Transitions are validated in
  `src/lib/status.ts` and asserted in every action.
- **Verification is separate from identity.** `verificationLevel` is derived from recorded
  `PropertyVerification` rows; the public page lists each check with its date and never calls a
  property "legally verified" unless that check exists.
- **Soft delete by default.** Archive instead of delete. `deletedAt` exists but is only used
  for genuinely empty drafts; properties with inquiries are never hard-deleted.
- **Money and areas.** Prices are whole MAD integers; areas are floats. No currency conversion.

## Permissions

`src/lib/rbac.ts` is the single source of truth, used by both server actions and UI gating.

| Permission | Owner | Manager | Collector | Reviewer | CRM | Editor | Analyst |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| property.read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| property.write | ✓ | ✓ | ✓ | ✓ | | | |
| property.publish | ✓ | ✓ | | ✓ | | | |
| property.review | ✓ | ✓ | | ✓ | | | |
| property.archive | ✓ | ✓ | | ✓ | | | |
| property.price_change | ✓ | ✓ | | | | | |
| sourcing.manage | ✓ | ✓ | ✓ | | | | |
| media.manage | ✓ | ✓ | ✓ | | | | |
| taxonomy.manage | ✓ | ✓ | | | | ✓ | |
| location.manage | ✓ | ✓ | | | | ✓ | |
| staff.manage | ✓ | ✓ | | | | | |
| crm.read / crm.write | ✓ | ✓ | | | ✓ | | |
| appointment.manage | ✓ | ✓ | | | ✓ | | |
| task.manage | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| content.manage | ✓ | ✓ | | | | ✓ | |
| report.read | ✓ | ✓ | | | | | ✓ |
| audit.read | ✓ | ✓ | | ✓ | | | |
| settings.manage | ✓ | | | | | | |

Guards used in code: `requireStaffPage(permission)` for pages (redirects), and
`requireStaffAction(permission)` for mutations (throws `AuthzError`). UI hiding is cosmetic;
the server check is the boundary. A manager can never assign the owner role; the owner account
cannot be edited from the team screen; nobody can change their own role or deactivate
themselves.

## Request flows

**Publishing a listing**

1. Collector creates a draft (`createPropertyAction`) — status `draft`, offer row, amenities.
2. Uploads media (`uploadMediaAction`): MIME/size validation → sharp re-encode to WebP, EXIF
   stripped, max 2000 px → file written → `PropertyMedia` row.
3. Records verifications (`addVerificationAction`) — availability, identity, documents, legal.
4. Submits for review (`submitReviewAction`): the **publication gate** runs
   (`missingPublishFields`: title, description ≥ 40 chars, category, city, price, publication
   permission, ≥ 1 image, availability verification). Failure blocks the transition.
5. Reviewer approves (`reviewDecisionAction`): requires `property.review` **and**
   `property.publish`; re-runs the gate; sets `published`, `publishedAt`,
   `availabilityConfirmedAt`, next check date; writes `PublicationReview` (approved),
   `PropertyStatusHistory` and `AuditLog`; revalidates public paths.
6. Public queries only ever select statuses in `PUBLIC_STATUSES`.

**Public inquiry**

Form (honeypot + rate limit by IP) → zod validation → property must be publicly visible →
`Lead` created with source, locale and hashed IP → staff notification → audit entry.
The visitor gets a confirmation that the request was *received*; viewing requests are stored
as `requested` and only staff can move them to `confirmed`.

## Read models

`src/lib/queries.ts` contains every public read. `cardSelect` is the whitelist for listing
cards; `getPropertyBySlug` uses an explicit select that excludes `internalNotes`, `dataSource`,
`publicationPermission`, staff identities, verification evidence and owner contacts. The public
API reuses `cardSelect`. Tests assert the projection does not contain internal fields.

## Localisation

The locale is a URL segment (`/fr/...`, `/ar/...`), so both language versions are crawlable
with `hreflang` alternates. `src/lib/i18n.ts` holds the dictionaries (with a parity test),
direction lookup, path helper and shared route segments. Content fields (`titleFr/titleAr`, …)
are stored per language; Arabic falls back to French where a translation is missing — visible
in the UI as the French title on the Arabic page, never as a machine translation presented as
reviewed copy.

## Deliberate trade-offs

- **No JSON blob for structured facts.** Optional attributes stay relational; only
  `missingInfo` (a checklist) and audit snapshots use JSON text.
- **Server actions only, no separate REST write API.** Simpler surface, one place for
  permission checks.
- **In-memory rate limiting.** Correct for a single instance; Redis is required for
  multi-instance (documented).
- **Local media storage.** Fine for development and single-server demos; production needs an
  object store (documented, with a clear configuration boundary).
