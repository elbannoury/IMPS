# Deployment guide

Target: a single Linux host running Node 20+ behind a reverse proxy (Nginx/Caddy) and a
managed PostgreSQL database. Serverless platforms work too, with the storage caveats below.

## 1. Requirements

- Node.js 20+ (built and tested on Node 22)
- PostgreSQL 14+ (Supabase, Neon, RDS, or self-hosted)
- An object storage bucket for property media (S3-compatible or Supabase Storage)
- A domain with HTTPS

## 2. Switch the database to PostgreSQL

1. In `prisma/schema.prisma`, change the datasource provider:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Point `DATABASE_URL` at your database.
3. Regenerate a Postgres migration history (the committed migrations were generated for SQLite):

   ```bash
   rm -rf prisma/migrations
   npx prisma migrate dev --name init_postgres        # local/dev database
   # or, on a fresh production database:
   npx prisma migrate deploy
   ```

4. Generate the client: `npx prisma generate`.

Column types are portable; enumerations are stored as validated strings, so no schema change is
needed in application code. Optional improvement: convert them to native Postgres enums and add
RLS policies mirroring `src/lib/rbac.ts` (see `docs/SECURITY.md`).

## 3. Environment

Copy `.env.example` to `.env` (or set variables in your platform) and fill it:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/imps?sslmode=require"
SESSION_SECRET="<openssl rand -base64 48>"
NEXT_PUBLIC_SITE_URL="https://www.example.ma"
SEED_OWNER_EMAIL="owner@example.ma"
SEED_OWNER_PASSWORD="<strong, unique>"
SEED_DEMO_DATA="false"          # never seed demo listings in production
MEDIA_STORAGE="s3"
S3_ENDPOINT="https://..."
S3_BUCKET="imps-media"
S3_REGION="..."
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
NEXT_PUBLIC_MAP_PROVIDER="mapbox"
NEXT_PUBLIC_MAPBOX_TOKEN="..."
NEXT_PUBLIC_WHATSAPP_NUMBER="2126XXXXXXXX"
NEXT_PUBLIC_CONTACT_PHONE="+212 5XX XX XX XX"
NEXT_PUBLIC_CONTACT_EMAIL="contact@example.ma"
EMAIL_PROVIDER="resend"
RESEND_API_KEY="..."
```

`SEED_DEMO_DATA=false` creates only the role/permission model and the first owner — no demo
listings, no demo staff.

## 4. Build and run

```bash
npm ci
npx prisma migrate deploy
npm run db:seed           # creates roles + first owner from env
npm run build
npm start                 # or: node .next/standalone/server.js with output: "standalone"
```

`next.config.ts` does not set `output: "standalone"`; add it if you containerise.

### Process management

```ini
# /etc/systemd/system/imps.service
[Unit]
Description=IMPS
After=network.target

[Service]
WorkingDirectory=/srv/imps
EnvironmentFile=/srv/imps/.env
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3000
Restart=always
User=imps

[Install]
WantedBy=multi-user.target
```

### Reverse proxy (Caddy example)

```
www.example.ma {
  encode zstd gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options nosniff
  }
  reverse_proxy 127.0.0.1:3000
}
```

## 5. First platform owner, securely

1. Set `SEED_OWNER_EMAIL` and a long random `SEED_OWNER_PASSWORD` **before** seeding.
2. Run `npx prisma migrate deploy && npm run db:seed` once.
3. Sign in at `/admin/login`, then create the real team accounts in **Équipe** with individual
   accounts (never a shared login).
4. Change the owner password immediately after the first sign-in (staff passwords are set by the
   owner today; a self-service change form is a listed gap).
5. Remove `SEED_OWNER_PASSWORD` from the environment after seeding.

The seed is idempotent in the sense that it resets data — **do not run it against a database that
already contains real properties.** For later environments, create the owner manually:

```bash
node --input-type=module -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const role = await prisma.role.findUnique({ where: { key: 'owner' } });
await prisma.profile.create({ data: {
  email: process.argv[1], fullName: 'Platform Owner',
  passwordHash: await bcrypt.hash(process.argv[2], 11),
  isStaff: true, isActive: true, emailVerifiedAt: new Date(), roleId: role.id
}});
await prisma.\$disconnect();
" "owner@example.ma" "a-strong-password"
```

Roles and permissions must exist first (`npm run db:seed` with `SEED_DEMO_DATA=false`).

## 6. Media storage

Local mode writes to `public/uploads`. That is only suitable for a single long-lived server:
files are not replicated, and container rebuilds lose them. For production:

- Create a bucket (private, public read only for the `public/` prefix).
- Set `MEDIA_STORAGE=s3` and the S3 variables.
- The upload action (`src/app/actions/properties.ts`) is the single place that persists files;
  swap its `fs.writeFile` branch for an `S3 PutObject` call and store the resulting public URL in
  `PropertyMedia.url`. The validation, re-encoding and database writes stay unchanged.
- Private documents (owner IDs, mandates) must go to a non-public prefix and should be stored as
  `PropertyMedia.visibility = "private"` (already excluded from public queries).

## 7. Maps, e-mail, WhatsApp

| Integration | Configure | Behaviour when missing |
| --- | --- | --- |
| Map | `NEXT_PUBLIC_MAP_PROVIDER` + token | Location block shows a notice; no fake map |
| E-mail | `EMAIL_PROVIDER` + key | In-app notifications only; the UI states no e-mail is sent |
| WhatsApp | `NEXT_PUBLIC_WHATSAPP_NUMBER` | Button hidden; no placeholder number |
| Analytics | `NEXT_PUBLIC_ANALYTICS_ID` | No tracking script |

After configuration, verify from the **Paramètres → Intégrations** panel; it reports the actual
environment state, not an assumed one.

## 8. Operations

- **Backups:** daily `pg_dump` with 30-day retention, plus bucket versioning. Test a restore.
- **Rate limiting:** the in-process limiter covers one instance. Put a shared limiter (Redis) or
  proxy-level limits in front of public forms for multi-instance deployments.
- **Monitoring:** route application errors to your provider; `writeAudit` failures are logged but
  never block a business operation.
- **Migrations:** `prisma migrate deploy` on release, before starting the new build.
- **Caching:** pages render on demand. If you add ISR, remove `getSessionUser()` from the header
  (or serve a cookie-free layout) and use `revalidateTag` per listing on publish.
- **Data retention:** inquiries are kept for operational and legal needs. Account deletion is a
  soft delete with anonymisation (`deleteAccountAction`); define a retention period with your
  legal advisor.

## 9. Go-live checklist

- [ ] `SEED_DEMO_DATA=false`; no demo properties, staff or articles in the database
- [ ] Every demo/sample property removed (`isSample = true` count is 0)
- [ ] Legal pages reviewed by a Moroccan professional; placeholders replaced
- [ ] Real photography uploaded; stock demo images removed
- [ ] Real, authorised phone/WhatsApp number configured
- [ ] Map provider configured and keys restricted by domain
- [ ] E-mail provider configured and a test inquiry notification delivered
- [ ] Storage bucket configured; uploads verified after a restart
- [ ] `SESSION_SECRET` rotated to a production value; HTTPS + HSTS enabled
- [ ] Owner password changed; individual accounts created for the team
- [ ] Backup + restore tested
- [ ] `robots.txt` and `sitemap.xml` verified on the production host
- [ ] Smoke test: publish a listing, see it publicly, submit an inquiry, see the lead in CRM
