# Limitations and required external configuration

This build is a working application, not a set of screens, but several integrations require
credentials only the operator can provide. Nothing below is faked at runtime: when a piece is
not configured, the UI says so or the feature is hidden.

## Not configured in this environment

| Area | State | What is needed |
| --- | --- | --- |
| Database | SQLite file (`prisma/dev.db`) | PostgreSQL connection string; switch `provider` in `schema.prisma`, run `prisma migrate deploy` |
| Object storage | Local disk (`MEDIA_STORAGE=local`, files under `public/uploads`) | S3-compatible or Supabase Storage bucket + keys; needed for multi-instance or serverless deploys |
| Map | Disabled | `NEXT_PUBLIC_MAP_PROVIDER` + Mapbox/Google token. Pages show a clear notice instead of a fake map |
| Transactional e-mail | Disabled | `EMAIL_PROVIDER` key (Resend/SMTP). No e-mail is sent or claimed to be sent; in-app notifications are used |
| WhatsApp | Hidden unless set | A real, authorised business number in `NEXT_PUBLIC_WHATSAPP_NUMBER`; no placeholder number is shipped |
| Phone contact | Hidden unless set | `NEXT_PUBLIC_CONTACT_PHONE` or the matching site setting |
| Analytics | Disabled | `NEXT_PUBLIC_ANALYTICS_ID` |
| Email verification delivery | Token generated and logged server-side only | A mail provider; until then the account page states that alerts are not active |
| First owner | Created by the seed from env | Set `SEED_OWNER_EMAIL` and a strong `SEED_OWNER_PASSWORD` before seeding; never run the demo seed in production |

## Functional gaps (honest list)

- **Map search** is a configuration boundary, not a working map. Filtering is list/price/area
  based; geographic filtering is limited to city/neighbourhood, and coordinates are stored but
  not rendered without a provider.
- **Saved-search e-mail alerts**: criteria can be saved to an account, but no alert job exists
  because there is no mail provider or scheduler in this build.
- **CSV export** for CRM is mentioned in the UI copy but not implemented as a download; it needs
  a permission-checked route handler before being exposed. (Deliberately not faked.)
- **2FA, password reset, e-mail change** are not implemented. Staff accounts are created with an
  initial password by an administrator.
- **Payments, contracts, e-signature** are out of scope; IMPS is not a transaction intermediary.
- **Postgres RLS**: the permission model is enforced in server code. When moving to Postgres,
  add RLS policies mirroring `src/lib/rbac.ts`; do not rely on the route guards alone.
- **Full-text search**: search uses indexed equality/range filters and `contains`. Large
  catalogues should add Postgres `tsvector` or a search service.
- **Image CDN**: `next/image` optimises on demand. A CDN in front of the app is recommended.
- **Demo data** is fictional. Cities, prices and descriptions are plausible but not real
  listings; every demo property is flagged and labelled. Photography is stock imagery
  (Unsplash License) used as a placeholder for real property photography.
- **Legal pages** are operational drafts and marked as requiring review by a qualified Moroccan
  professional before launch.
- **Accessibility**: semantic HTML, keyboard navigation, focus styles, labelled controls,
  reduced-motion support and alt text are implemented; a formal WCAG audit has not been run.
- **Browser support**: tested in Chromium-based browsers via the production build; no IE fallback.
