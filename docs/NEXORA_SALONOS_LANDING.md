# Nexora SalonOS landing page

Route: `/nexora-salonos` (lazy-loaded, no effect on the rest of the app).

## Where things live

| Path | Purpose |
| --- | --- |
| `src/components/nexora-salonos/NexoraSalonOSPage.tsx` | Composes the ten sections |
| `src/components/nexora-salonos/content.ts` | All copy, prices, ROI figures, testimonials |
| `src/components/nexora-salonos/DemoProvider.tsx` | Demo-booking dialog used by every CTA |
| `src/components/nexora-salonos/CountdownProvider.tsx` | One shared countdown for the header and bottom bar |
| `src/components/nexora-salonos/nexora.css` | Page-scoped styles (everything hangs off `.nexora-root`) |
| `src/lib/demoLead.ts` | Validation + Supabase insert for demo requests |
| `supabase/migrations/20261107_nexora_salonos_demo_requests.sql` | `public.demo_requests` table + RLS |

## Demo requests (Supabase)

The dialog inserts into `public.demo_requests` with the browser's publishable key.
RLS lets visitors insert a `status = 'new'` row and nothing else; only the
platform super-admin can read, update or delete leads. The insert uses
`Prefer: return=minimal` so visitors need no SELECT permission. A hidden
honeypot field drops naive bot submissions client-side.

**The migration must be applied before the dialog can save leads** (until then
the form shows "We couldn't save your request"). Apply it the same way as the
other files in `supabase/migrations/`.

Read leads in the Supabase dashboard, or as the super-admin:
`GET /rest/v1/demo_requests?order=created_at.desc`.

## Styling notes

- `src/index.css` forces `.max-w-4xl/5xl/6xl/7xl` and `.container` to full width with no
  padding, and gives `h1`–`h3` the site's serif font. The page therefore uses arbitrary
  max-widths (`max-w-[72rem]`) and overrides the heading font inside `.nexora-root`.
  Do not switch those back to `max-w-6xl` etc.
- Plus Jakarta Sans is loaded from `nexora.css`, so it only downloads when this route is opened.

## Before this goes in front of customers

Everything in `content.ts` is **sample content** (partner names, testimonials, ratings, ROI
figures, the ₹799 starting price) and the page shows "Sample content" labels. Replace it with
real, permitted content, then set `SAMPLE_CONTENT = false`. The product video is a placeholder.

## Indexing

The route is not in `PUBLIC_PATHS`, so `RouteIndexingPolicy` serves it as `noindex` and it is not
in `sitemap.xml`. Add it to `PUBLIC_PATHS` and the indexable check in `src/App.tsx` when you want it
discoverable (the sitemap test counts entries, so update it too).
