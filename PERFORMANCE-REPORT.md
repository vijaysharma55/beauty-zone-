# BeautyZone — Performance Report

Date: 2026-11-06  
Measurement source: live HTTP response samples and repository asset inspection. No browser Lighthouse/PageSpeed/Chrome trace or field Core Web Vitals provider was available in this audit session.

## Previous BugViso observations

The prompt supplied historical figures (mobile LCP/FCP ≈3.96 seconds, JS ≈1.4 MB uncompressed, 63.9% unused JS, hero image savings ≈364.7 KB, contrast 3.77:1). They were **not** reused as current measurements.

## Current live observations

| Asset/check | Observation |
|---|---|
| Main JavaScript | /assets/index-DHwl3gc4.js returned HTTP 200, Content-Encoding br; decoded response body ≈939,712 characters. This is not the compressed transfer size. |
| Main CSS | /assets/index-EHe1OT8n.css returned HTTP 200, Content-Encoding br; decoded response body ≈130,887 characters. |
| Homepage image preload | Six images preloaded in server-rendered root markup. |
| Six preloaded image files | Total source Content-Length ≈5,065,568 bytes (5.07 MB). |
| Flagship salon image | 896,246 bytes, JPEG, HTTP 200. |
| Pre-bridal spa image | 984,639 bytes, JPEG, HTTP 200. |
| Hero salon image | 940,497 bytes, JPEG, HTTP 200. |
| Academy image | 908,590 bytes, JPEG, HTTP 200. |
| Browser cache | Static JS/CSS use long-lived immutable cache; image URLs returned Cache-Control: public, max-age=0, must-revalidate. |

Repository inventory found 28 image/font media assets totaling approximately 20,002,978 bytes. Images are JPEG-based; no AVIF/WebP responsive variants were found in the asset inventory. Some public/src assets share duplicate file content.

## Findings

1. Six eagerly preloaded homepage images compete for early network bandwidth. Only the actual LCP hero image should be prioritized; others should be lazy-loaded or requested when their sections enter view.
2. Hero image component uses eager loading and fetchPriority=high appropriately, but additional section preloads are generated from the server-rendered homepage.
3. Several large JPEGs should be converted into responsive AVIF/WebP variants, preserving source originals and adding correct width/height/srcset/sizes.
4. Main JS decoded body is large. Vite chunk splitting and lazy loading must be inspected by route/component, not achieved by simply increasing/silencing the chunk warning threshold.
5. Vite config sets chunkSizeWarningLimit to 1200 KB, suppressing useful warning feedback.
6. CSS uses remote Google Fonts; font-display, subset strategy and local/preload trade-offs should be measured.
7. Public salon image fallback uses Unsplash external source; this creates an additional third-party dependency and should have a local fallback.

## What was not measured

| Metric | Status |
|---|---|
| LCP | Not measured in a real browser trace. |
| FCP | Not measured in a real browser trace. |
| CLS | Not measured. |
| INP | Not measured; requires field data or interaction trace. |
| Mobile network waterfall | Not measured. |
| JS unused-code percentage | Not measured; requires DevTools coverage/trace. |
| Color contrast | Not measured with axe or contrast analyzer. |
| Device-level layout/overflow | Not measured at requested viewport widths. |

Therefore no claim is made that LCP ≤2.5 s, FCP ≤1.8 s, CLS ≤0.1 or INP ≤200 ms has been achieved.

## Recommended next performance pass

1. Capture Lighthouse mobile and desktop baselines with a fixed deployment, URL, throttling profile and repeat count.
2. Remove non-LCP preload hints; keep one hero LCP request high priority.
3. Convert large source images to AVIF/WebP and generate responsive variants.
4. Add component/route code-splitting for dashboard/admin and rarely used editors/modals.
5. Inspect bundle analyzer and DevTools coverage before removing dependencies.
6. Add Lighthouse CI and Web Vitals telemetry; compare p75 field data after rollout.