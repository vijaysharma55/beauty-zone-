# BeautyZone — Audit Changelog

## PR — Full service-catalogue management (2026-11-11)

*Services & Prices* in the owner dashboard is now a complete catalogue manager
instead of a flat list with one fixed category list:

- **Main categories.** A dropdown offers the presets (Hair, Nails, Makeup, Skin,
  Bridal, Spa, Academy, Other) and every custom category the salon has created,
  with *+ Add new category…* to type one on the fly. Presets keep their
  historical lowercase key, so existing rows, templates and analytics are
  unchanged; custom labels such as "Gel Extensions" are stored verbatim and are
  never folded back into a preset.
- **Subcategories.** A second dropdown under the category filters to that
  category's suggestions (*Gel Nails*, *Acrylic Nails*, *HydraFacial*, …) merged
  with every subcategory already in use, and supports
  *+ Add new subcategory…*. Preset spellings are canonicalised, so "gel nails"
  and "Gel Nails" land in the same group.
- **Service image.** Upload with an instant preview **or** paste an image URL;
  replace and remove are one click. Uploads are optimised in the browser and
  stored in the Supabase `beautyzone-assets` bucket under `<uid>/services/…`;
  if Storage is unreachable the optimised image is embedded instead so the edit
  still saves.
- **Rate (₹)** and **duration**, editable inline straight from the catalogue.
- **Important notes / custom instructions** — a dedicated, client-visible field
  for duration specifics, prerequisites, patch tests and products.
- **Visibility toggle** (Active / Inactive) controlling public-website
  visibility, on the card, in the table and in the form.
- **Catalogue display** grouped by main category → subcategory, in either a card
  grid or a compact table, with search, category/status filters, per-group
  "Add here" shortcuts, and inline edit / photo / notes / delete actions.
- The public salon website now renders the same grouping with cover photos and
  the notes strip.

### New files
- `src/lib/serviceCategories.js` — presets, normalisation and the category
  grouping shared by the browser and the API.
- `src/components/dashboard/ServiceCategoryPicker.tsx` — two-level picker with
  on-the-fly category and subcategory creation.
- `src/components/dashboard/ServiceImageField.tsx` — upload / URL / replace /
  remove with preview.
- `src/lib/serviceImages.ts` — Supabase Storage upload with an inline fallback.
- `supabase/migrations/20261111_beautyzone_service_catalogue.sql` — columns,
  constraints, indexes, storage policies and the `service_catalogue_groups` view.
- `docs/SERVICE_CATALOGUE.md` — field reference, API contract and UI behaviour.
- `server/tests/service-catalogue-unit.test.js` — vocabulary and grouping tests.

### API
- `GET /api/salon/services` now also returns `categories` (picker vocabulary) and
  `groups` (category → subcategory buckets); every service carries
  `subcategory`, `subcategoryLabel`, `categoryLabel`, `notes` and `imageUrl`.
- `GET /api/salon/service-categories` — the vocabulary on its own.
- `PATCH /api/salon/services/:id` returns the refreshed vocabulary alongside the
  updated service; every field remains independently patchable.
- `POST /api/salon/uploads?kind=service` accepts service cover images.
- Service notes are capped at 1000 characters and images are validated against
  the same safe-URL rules as staff photos.

## PR — AI suggestions for the salon Tagline and About fields (2026-11-11)

Salon owners can now ask an AI assistant for ideas instead of starting from a blank field, in owner
onboarding and in *My Website → Brand identity*:

- **Suggest taglines**, under the Tagline field, offers three taglines based on the salon name.
- **Suggest descriptions**, under "About your salon", offers three "About Us" drafts based on the
  salon name and its tagline, one per tone: Elegant & Premium, Modern & Trendy, Warm &
  Customer-Centric.

One click puts the chosen option in the field, where it stays editable.

### New files
- `src/lib/salonTaglines.js`, `src/lib/salonDescriptions.js` — the rules shared by the API and the
  browser: each prompt with its placeholders, validation of the model's answer and the curated
  texts used when no model is reachable.
- `src/components/dashboard/SuggestionPicker.tsx` — the button and the list of options, with thin
  `TaglineSuggestions` and `DescriptionSuggestions` wrappers used by `OnboardingPage` and
  `WebsiteEditor`.
- `server/tests/salon-taglines-unit.test.js`, `server/tests/salon-descriptions-unit.test.js` — unit
  tests for the rules.
- `server/tests/ai-salon-taglines.test.js`, `server/tests/ai-salon-descriptions.test.js` — both
  endpoints tested against a local stand-in for the Gemini API, started by
  `server/tests/support/gemini-harness.js` (`npm run test:ai`).

### API
- `POST /api/ai/salon-taglines`: body `{ name, variant?, exclude? }`, answer
  `{ taglines: [3 strings], source, warnings }`.
- `POST /api/ai/salon-descriptions`: body `{ name, tagline, variant? }`, answer
  `{ descriptions: [3 strings], source, warnings }`, always in the tone order above.
- Both are for signed-in users and share the AI rate limit. See the README for the full contracts.
- Each prompt is sent with the form's values in place of `{{Salon_Name}}` and
  `{{Selected_Tagline}}`. A value is kept on one line and inside its quotes, so it cannot add lines
  of its own to the prompt or fill the other placeholder.
- The answer must be a JSON array of three strings. Code fences, surrounding prose and cut-off JSON
  are tolerated; duplicates, non-strings, options of the wrong length and echoed example values are
  dropped.
  - Taglines (2–10 words): any gap is filled from the curated lines.
  - Descriptions (30–90 words accepted, 45–65 asked for): an unusable option is replaced by the
    curated text for the same tone, so the tones never shift. Markdown and "Option 1:" labels are
    stripped.
- Like the other AI routes they always answer `200`: without `GEMINI_API_KEY`, or when the provider
  fails, the owner gets curated suggestions. Curated taglines follow the speciality in the salon
  name; curated descriptions name the salon and quote its tagline.
- `callGemini` takes a `maxOutputTokens` option (2048 for taglines, 4096 for descriptions) so
  reasoning models have room to finish the JSON. The other AI routes keep their 400-token cap.

### Dashboard behaviour
- The tagline button is disabled until the salon name has two characters; the description button
  also needs a tagline, because the drafts are written around it. Neither submits the form.
- **More ideas** asks again. For taglines it never repeats an option already shown or the tagline
  in use.
- Nothing is saved by a suggestion: the owner still saves the form, and changes still go through
  super admin approval before they reach the live site.
- If an option replaces text the owner had written, **Undo** brings that text back.
- Keyboard and screen-reader support: focus stays on the button while ideas load, progress is
  announced through a live region, and the option in use is exposed with `aria-pressed`.

## PR — React Bits `CardNav` integrated as the marketing header (2026-11-08)

Replaces the hand-rolled fixed header with the React Bits **CardNav** component: a floating,
frosted-glass pill that expands into a staggered card mega-menu. The white-label theme, the
section toggles and all seven locales keep working unchanged.

### New files
- `src/components/reactbits/CardNav.jsx` + `CardNav.css` — the React Bits component, copied
  verbatim (JS + CSS variant) so future upstream updates can be diffed in place.
- `src/components/Navbar.css` — the floating shell, the brand lockup and the `scroll-margin-top`
  that keeps in-page landings below the pill.

### Dependencies
- `@hugeicons/react` and `@hugeicons/core-free-icons` (the arrow glyphs in the card links).

### Header behaviour
- `Navbar.tsx` now renders `<CardNav>` in a controlled state (`open` + `onOpenChange`) so the
  menu also closes on navigation, CTA clicks and logo clicks.
- Cards are built from the live white-label config and only list sections the owner has enabled:
  **Services** (services, packages, reels, gift cards), **Bridal Studio** (bridal, gallery,
  stylists, testimonials), **Locations** (branches, phone, WhatsApp, email, FAQ) and
  **Language** (only when the language switcher is on and more than one locale is enabled).
- The bar is tinted from `brand.theme.primaryColor` and the CTA from `brand.theme.accentColor`,
  with the ink colour picked automatically for contrast.
- In-page links stay buttons (no URL hash); `onLinkClick` forwards the section id to the page's
  smooth scroller. Language entries call `setLanguage` and the whole menu re-renders translated.
- Logo clicks smooth-scroll to the top instead of pushing a stray `#` onto the URL.
- Below 560px CardNav switches to its narrow layout (logo left, burger right, CTA at the bottom
  of the menu); the wordmark is hidden there because the logo keeps the accessible name.

### Fixes picked up on the way
- `scrollToSection('packages')` never matched a DOM node — the packages bundle renders as
  `id="bundles"`. Added `SECTION_ALIASES` in `App.tsx` so Packages nav/CTA/book flows land on the
  bundle section.
- New translations (`navCardServicesDesc`, `navCardBridalDesc`, `navCardVisitDesc`, `navLanguage`,
  `navCardLanguageDesc`, `navLanguageCurrent`) added to all seven dictionaries and to
  `TranslationDictionary`.

## PR — "Add New Staff Member" onboarding module (2026-11-08)

Completes the salon-owner staff onboarding flow with every field captured from the latest UI walkthrough,
mapped end-to-end across the database schema, the API validation layer and the dashboard form.

### Data model (SQLite + Supabase in parity)
New `staff` columns, all additive with backfilled defaults so existing rosters keep working:

| Column | Type | Default | Purpose |
| --- | --- | --- | --- |
| `primary_role` | text | `''` | Professional title slug (senior_stylist … receptionist) |
| `app_access_role` | text | `service_provider` | System permission level (manager / service_provider / receptionist) |
| `commission_percent` | real | `15` | Commission share, 0–100 checked |
| `mobile_number` | text | `''` | Normalised `+91XXXXXXXXXX` |
| `hide_mobile_number` | int/bool | `0` | Keeps the number out of public/staff lists |
| `service_ids_json` / `service_ids` | json | `[]` | Assigned catalogue services (empty = whole catalogue) |
| `weekly_schedule_json` / `weekly_schedule` | json | `[]` | Mon→Sun start/end times + `closed` flag |

- `server/db.js`: expanded `CREATE TABLE staff` + `serializeStaff` now returns `primaryRole`, `appAccessRole`,
  `commissionPercent`, `mobileNumber`, `hideMobileNumber`, `serviceIds` and a always-seven-day `weeklySchedule`.
- `server/migrations.js`: idempotent `ALTER`s, default backfills, and a legacy `role_title` → `primary_role`
  inference pass so the dropdown never opens empty on an existing employee.
- `supabase/migrations/20261107_beautyzone_staff_onboarding.sql`: same columns plus CHECK constraints for the
  role vocabulary, app access, 0–100 commission, JSON array shape and the new `off_duty` availability state.
- `server/supabase-store.js`: extended `STAFF_SELECT_VARIANTS` and `mapStaff` so PostgREST projects expose the
  new fields with the same shapes.

### API
- `POST/PATCH /api/salon/staff` now validate and persist every onboarding field: primary role, app access,
  commission, mobile (normalised `+91`), hide flag, service mapping and weekly roster.
- `roleTitle` is derived from the primary-role label when the owner does not type a custom designation, so public
  templates never render a raw slug.
- Assigned service ids are rejected unless they belong to the owner's own catalogue (cross-tenant guard).
- Skills are trimmed, case-insensitively de-duplicated and capped at 25 × 80 chars.
- `off_duty` added as a fourth availability status; only `available` staff are offered for online booking.
- Public payloads omit `appAccessRole`, `commissionPercent`, `serviceIds` and always blank `mobileNumber`.
- `POST /api/public/bookings` rejects a preferred specialist who is not mapped to the requested service
  (`409 STAFF_SERVICE_MISMATCH`) instead of silently assigning the wrong artist.
- `GET /api/public/availability` accepts `staffId` and intersects the specialist's weekly roster with the salon's
  opening hours (`staffScheduleApplied: 'staff_schedule' | 'staff_closed'`).

### Dashboard UI
- `src/lib/staffRoles.js` — new framework-free vocabulary shared by API + browser (roles, app access, availability,
  weekdays, skill suggestions, mobile/commission normalisation, schedule helpers).
- `src/components/dashboard/StaffFormFields.tsx` — new form primitives: `SkillTagSelector` (pill/tag multi-select
  with custom skills), `ServiceAssignmentPicker` (searchable, category-grouped checkbox group), `WeeklyScheduleEditor`
  (per-day toggle, `HH:MM` start/end pickers, "closed" `[--:--]` state, Sunday closed by default) and
  `MobileNumberField` (+91 prefix, live validation, "hide from public/staff list" checkbox).
- `src/components/dashboard/StaffPage.tsx` — the Add/Edit modal is now a six-step form (identity → roles &
  permissions → services → weekly schedule → skills → optional profile), with client-side validation mirroring the
  API, and the staff cards surface role, app access, commission, masked mobile, roster summary and service mapping.
- `src/components/site/SalonBookingPanel.tsx` + `useAvailability` pass the selected specialist so the time picker
  respects their roster, and explain "this specialist is off on this day".
- `src/components/StylistProfileModal.tsx` shows a weekly availability summary on the public profile.

### Tests
- `server/tests/staff-onboarding-unit.test.js` (15 tests) covers the shared vocabulary, schedule normalisation,
  skill de-duplication, +91 mobile parsing, commission bounds, masking and service mapping.
- `server/tests/api.test.js`: two new end-to-end tests covering full field round-trip, privacy of internal fields,
  validation failures, defaults, `off_duty`, roster-driven availability and service-mapping enforcement.

`npm run lint && npm test && npm run build` all pass (235 tests, 234 pass / 1 skipped).

---

## PR 1 — Vercel deep-link routing fix (2026-11-06)

Fixes the P1 deployment blocker recorded in AUDIT-REPORT.md, GAP-ANALYSIS.md, BUG-FIX-REPORT.md and
TEST-REPORT.md: direct requests to `/login`, `/register`, `/salons`, `/salon/lumina-luxe`,
`/dashboard` and `/my-appointments` returned HTTP 404 in production and preview.

- **Root cause**: the catch-all rewrite pointed at the extensionless destinations `/spa` and
  `/index`. No such files exist in the build output (`dist/spa.html` and `dist/index.html` do), so
  the rewrite resolved to nothing and the request fell through to Vercel's 404. `/` and `/spa.html`
  kept returning 200 because they are served by the filesystem phase before rewrites run.
- `vercel.json` rewrite destinations now name real emitted files (`/index.html`, `/spa.html`).
- `cleanUrls` is disabled; it exposed the shells only at extensionless aliases and was the reason the
  previous destinations looked valid.
- The SPA catch-all excludes `/api/`, so unknown API paths keep returning the Express JSON 404
  instead of being rewritten into an HTML shell.
- Added `server/tests/vercel-routing.test.js` (wired into `npm test`): asserts every React Router
  route resolves to an HTML shell, that no rewrite destination is extensionless and that the build
  emits both shells.
- Added `scripts/verify-routes.sh` (`npm run verify:routes <url>`) for post-deployment checks.

---

Date: 2026-11-06  
Working branch: audit/beautyzone-production-hardening  
Base: main at 1e7348f858edab617fcd5954d34a40b5fb50c63d  
Review: PR #27 (draft, not merged)

## Changes on this branch

### Authentication and authorization
- Production/Vercel login rejects default/configured demo admin and owner identities plus generated synthetic salon-owner seed identities.
- Demo user auto-provisioning and demo password bypass are limited to non-production environments.
- Supabase profile role is now the only authorization source when bridging a Supabase session to the legacy Express session.
- Supabase bridge checks email verification, profile active status and identity/profile email equality.
- Added production-mode auth regression tests with isolated temporary SQLite and a mock Supabase identity/profile endpoint.

### SEO and accessibility
- Corrected homepage Open Graph and Twitter metadata to Beauty Zone Jaipur.
- Removed viewport restrictions that blocked user zoom.
- Sitemap now contains only deliberately indexable public routes and public salon detail URLs.
- Added route-level noindex handling for login, registration, password recovery, email verification, customer appointments, owner dashboard, admin and unknown routes.
- Public homepage, salon directory and valid salon detail routes get route-specific canonical and social URL metadata.

### Verification
- TypeScript passed.
- Automated tests: 135 passed, 0 failed.
- Vite build passed.
- Prerender passed.

## Architectural notes

No production business records were migrated, reset or deleted. No production Supabase schema was altered by this audit branch. The earlier Beauty Rewards PR migration already applied on the connected Supabase project remains as documented in the prior reward delivery; customer appointment history migration is not yet applied.

## Deployment notes

- PR #27 is a draft review checkpoint and must be reviewed before merge.
- No production deployment was triggered by this branch.
- Vercel preview deployment/CI may build automatically for PR; production domain remains on main.
- Current production Razorpay credentials and server-only Supabase secret are not configured.
- Production email delivery provider is not wired into the legacy mailer.
- Core transactional data remains in local SQLite under Vercel /tmp; do not treat production as migrated to Supabase.
- Legacy SQLite data export, backup and reconciliation are required before any cutover.

## Remaining blockers

See AUDIT-REPORT.md, GAP-ANALYSIS.md, BUG-FIX-REPORT.md, SECURITY-REPORT.md, PERFORMANCE-REPORT.md and TEST-REPORT.md.