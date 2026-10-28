# Acceptance test evidence

22 scenarios from the brief, and how each was verified in this build. "Automated" refers to
`npm test` (55 tests, all passing). "HTTP" refers to checks run against the production build
(`next build && next start`) on this machine.

| # | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| 1 | A property collector creates a draft and saves the required information | Pass | `tests/admin-flow.test.ts` — collector session calls the real `createPropertyAction`: draft status, generated reference `IMP-YYYY-NNNN`, offer row, `primaryPrice` synced |
| 2 | The collector uploads several images, changes their order and saves | Pass | `tests/admin-flow.test.ts` — two images uploaded (re-encoded to WebP), order swapped with `moveMediaAction`, cover changed, one deleted; non-image upload rejected |
| 3 | An unauthorized user cannot publish | Pass | `tests/actions.test.ts` — collector and anonymous sessions call `reviewDecisionAction` and receive `AuthzError`; status stays `in_review`. UI redirect also verified over HTTP (`/admin/staff` as collector → `?denied=1`) |
| 4 | A reviewer inspects a draft, approves it and publishes it | Pass | `tests/actions.test.ts` — reviewer approves: status `published`, `publishedAt` and next-check date set, `PublicationReview` approved, audit entry written |
| 5 | The published property appears publicly with the right details and photos | Pass | `tests/workflow.test.ts` and `tests/admin-flow.test.ts` — `getPropertyBySlug` and `searchProperties` return it after publication; HTTP: property pages render with gallery and facts |
| 6 | An authorized editor changes the asking price and the public page reflects it | Pass | `tests/admin-flow.test.ts` — manager updates price: new active offer, `primaryPrice` updated, public query returns 1 525 000, `property.price_change` audit entry; collector attempt refused |
| 7 | Changing one listing does not alter unrelated properties | Pass | `tests/workflow.test.ts` and `tests/admin-flow.test.ts` — a second property's price is unchanged after editing the first |
| 8 | An anonymous visitor cannot access unpublished or internal records | Pass | Draft slug returns `null` from the public query and HTTP 404; archived listings disappear from search; public projection test asserts `internalNotes`, `dataSource`, `publicationPermission` are absent |
| 9 | Search by city, transaction, category and price returns real DB results | Pass | `tests/workflow.test.ts` — combined filter returns exactly the matching record; HTTP: `/fr/properties?tx=sale&city=casablanca&price_max=3000000` returns the matching listing |
| 10 | Filters work together and can be cleared/reset | Pass | `parseSearchParams`/`buildQuery` drive every filter; HTTP: `?tx=sale` → 8 results, `?tx=rent` → 4; reset link returns the unfiltered set |
| 11 | A visitor submits an inquiry and a lead appears in the CRM | Pass | `tests/actions.test.ts` — real `submitInquiryAction` creates a `new` lead linked to the property, with notification; HTTP: form renders and rejects missing consent |
| 12 | A viewing request is stored without being marked confirmed | Pass | `tests/actions.test.ts` — appointment status `requested`, `confirmedAt` null; the success message states it is not confirmed |
| 13 | A manager assigns a lead and records a follow-up | Pass | `tests/actions.test.ts` — CRM action sets status, assignee, priority, follow-up and note; audit written |
| 14 | A stale listing is identified and handled | Pass | `tests/admin-flow.test.ts` — availability set 45 days back appears in dashboard stale list and count; "Reconfirmer" action records a new check |
| 15 | An unavailable property is no longer presented as currently available | Pass | Sold/archived listings excluded from public search; property page shows the unavailable notice and 404s when archived |
| 16 | Archiving keeps leads and audit records | Pass | `tests/workflow.test.ts` — after archiving, the lead and audit row still exist, while public search and the property page no longer expose it |
| 17 | Category changes do not orphan properties | Pass | `tests/admin-flow.test.ts` — deactivating a category in use sets `isActive = false`, keeps the category and its properties; deletion only for unused categories |
| 18 | A staff member cannot use a function outside their permissions | Pass | `tests/rbac.test.ts` (matrix) + HTTP: collector session redirected from `/admin/staff`; action-level refusal in `tests/actions.test.ts` |
| 19 | Arabic and French layouts work, including RTL | Pass | `/ar` renders `dir="rtl"` with Arabic typography and mirrored layout (visual check in browser); dictionary parity test ensures no missing AR key |
| 20 | Property pages remain usable on mobile | Partly | Responsive layouts, mobile navigation, touch targets and stacked contact actions are implemented; verified in the browser at desktop width only — no device-lab matrix was run |
| 21 | SEO metadata and sitemaps contain eligible content only | Pass | HTTP: `/sitemap.xml` returns 74 URLs and no draft reference; `/robots.txt` disallows `/admin`; pages emit canonical + hreflang + JSON-LD; filtered result pages are `noindex` |
| 22 | Missing configuration, invalid input, empty results and authorization errors are handled | Pass | Empty search state renders with reset; zod errors surface per field; missing map/e-mail/WhatsApp show explicit notices; 404 page; `AuthzError` never leaks a stack |

## Also verified over HTTP

- `/` → 308/307 redirect to `/fr`; `/fr`, `/ar`, search, city, developments, invest, guides → 200.
- `/admin` without a session redirects to `/admin/login`; with an owner session the dashboard and
  team page render; with a collector session the team page redirects to `?denied=1`.
- `/api/properties?ids=<id>` returns only whitelisted public fields; unknown ids return `{items:[]}`.
- Draft property URL → 404.

## Not verified end-to-end

- The staff login form was not submitted through a browser (password entry is intentionally
  blocked in the automation environment). The same action is covered by direct credential
  verification (bcrypt compare) and by session-guarded HTTP checks.
- Multi-instance behaviour: rate limiter and local media storage are single-instance only.
- Real payment, e-mail delivery, maps and WhatsApp: not configured, therefore not claimed.
