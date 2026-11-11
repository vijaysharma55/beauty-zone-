# Service catalogue management

The owner dashboard page **Services & Prices** (`/dashboard/services`,
`src/components/dashboard/ServicesPage.tsx`) is the single place where a salon
builds its public menu. Everything it saves is exposed by the API, snapshotted
into the approval workflow and rendered by every website template.

## Data model

One row per service in `services` (SQLite for the dashboard API, mirrored in the
Supabase `public.services` table):

| Column          | Meaning                                                              |
| --------------- | -------------------------------------------------------------------- |
| `name`          | Service name (2–120 characters).                                      |
| `category`      | Main category. Presets use their lowercase key (`hair`, `nails`, …); any other value is a **custom category kept verbatim**. |
| `subcategory`   | Optional second level (`Gel Nails` under `nails`). Preset spellings are canonicalised (`gel nails` → `Gel Nails`). |
| `description`   | Long editorial copy shown on the website card.                        |
| `notes`         | “Important notes / custom instructions” — duration, prerequisites, patch tests, products. **Client-visible.** Max 1000 characters. |
| `image_url`     | Cover photo: Supabase Storage public URL, `/api/uploads/…`, a data URL or any http(s) URL. |
| `price_paise`   | Rate in paise. The UI edits rupees and converts (`₹3,499` → `349900`). |
| `duration_minutes` | 5–1440.                                                            |
| `active`        | Visibility on the public website. Inactive services stay in the catalogue, reports and staff mappings. |
| `sort_order`    | Display order inside a grouping.                                      |

### Shared vocabulary

`src/lib/serviceCategories.js` is dependency-free and imported by both the
browser and the Express API, so validation and rendering can never disagree:

- `SERVICE_CATEGORY_PRESETS` — Hair, Nails, Makeup, Skin, Bridal, Spa, Academy,
  Other, each with suggested subcategories (`Gel Nails`, `Acrylic Nails`,
  `HydraFacial`, `HD & Airbrush Makeup`, …).
- `normalizeServiceCategory` / `normalizeServiceSubcategory` — canonical values.
- `serviceCategoryOptions(services, extra)` — picker options: every preset plus
  each custom category already in use, with its subcategories de-duplicated.
- `groupServicesByCategory(services)` — category → subcategory → services, with
  per-bucket totals. Presets sort first, then custom categories A–Z.

## API

All routes are salon-owner scoped; the salon is resolved from the session, never
from the request body.

| Route | Purpose |
| ----- | ------- |
| `GET /api/salon/services` | `{ services, categories, groups }` — the flat catalogue, the picker vocabulary and the grouped tree. |
| `GET /api/salon/service-categories` | `{ categories, groups }` only, for pickers outside the page. |
| `POST /api/salon/services` | Create. Accepts `name, category, subcategory, description, notes, imageUrl, price` **or** `pricePaise, durationMinutes, active, sortOrder`. |
| `PATCH /api/salon/services/:id` | Partial update — used by the inline rate, notes, image and visibility controls. Every field is independent: a rate edit never clears notes. |
| `DELETE /api/salon/services/:id` | Remove. |
| `POST /api/salon/uploads?kind=service` | Raw image upload (PNG/JPEG/WEBP/GIF, ≤ 5 MB, content sniffed). Returns `/api/uploads/<file>`. |

Validation rules: the name is required; the category is required and capped at
60 characters (missing → `other`); the subcategory is optional (≤ 60); notes are
≤ 1000; `imageUrl` must be an upload path, a data image URL or http(s) — anything
else (`javascript:`, `file:`) is rejected with 400.

## UI

### The catalogue

- Grouped cards: main category header (with preset/custom badge and
  `active/total` count, collapsible) → subcategory label → service cards.
- Cards show the photo, name, description, a highlighted notes strip, the rate,
  duration and the visibility switch.
- **Inline actions**: click the rate to edit it in place, the notes button to
  edit notes in place, *Add photo* to open the image panel, *Edit* for the full
  form, and the bin icon to delete.
- A **Table** view mirrors the same actions in a compact grid.
- Filters: free-text search (name, category, subcategory, description, notes),
  main-category filter, status filter, and a card/table toggle.

### The “+ Add service” modal

1. Service name.
2. **Main category** dropdown — presets + custom, with `+ Add new category…`
   that swaps the dropdown for a text input (Enter commits, Escape cancels).
3. **Subcategory** dropdown immediately below — suggested subcategories for the
   chosen category merged with everything already used, plus
   `+ Add new subcategory…` for on-the-fly additions. Shows the resulting
   `Category › Subcategory` breadcrumb.
4. Rate (₹) and duration (minutes).
5. Service image — upload with instant preview **or** paste a URL; replace and
   remove actions. Uploads are optimised in the browser, stored in the
   Supabase `beautyzone-assets` bucket under `<uid>/services/…`, and fall back to
   an embedded data URL if Storage is unreachable.
6. Important notes / custom instructions.
7. Description.
8. Visibility toggle — Active (visible on the public website) / Inactive.

The same component opens for editing, pre-filled from the saved service, and can
be pre-scoped to a category or subcategory from the “Add to …” / “Add here”
shortcuts.

## Supabase

`supabase/migrations/20261111_beautyzone_service_catalogue.sql` is idempotent and
adds `subcategory`, `image_url` and `notes` to `public.services`, backfills and
normalises legacy rows, adds length constraints and grouping indexes, re-asserts
the `beautyzone-assets` storage bucket/policies, and exposes the
`public.service_catalogue_groups` view (service/active counts and price range per
category + subcategory).

Server-side reads go through `SERVICE_SELECT_VARIANTS` in
`server/supabase-store.js`, so a project that has not run the migration yet still
loads its catalogue with safe defaults instead of failing.

## Public website

Approved snapshots carry `categoryLabel`, `subcategory`, `subcategoryLabel`,
`notes` and `imageUrl`. `SalonSite` renders the menu grouped by category and
subcategory, with the cover photo, the client-facing notes and the duration per
card. Inactive services never reach a visitor.

## Tests

- `server/tests/service-catalogue-unit.test.js` — vocabulary normalisation,
  custom categories, grouping, ordering and picker options.
- `server/tests/api.test.js` — catalogue CRUD with presets and custom
  categories, notes/image/rate round-trips, validation rejections, the
  `kind=service` upload, tenant isolation, and the public payload shape.
