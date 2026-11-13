#!/usr/bin/env bash
# Post-deployment verification for the Vercel SPA fallback (vercel.json rewrites).
#
# Usage:
#   ./scripts/verify-routes.sh                         # production
#   ./scripts/verify-routes.sh https://<preview>.vercel.app
#
# Exits non-zero if any route regresses to HTTP 404.
set -uo pipefail

BASE_URL="${1:-https://beauty-zone-pearl.vercel.app}"
BASE_URL="${BASE_URL%/}"
FAILED=0

# Client-side routes: must return 200 + text/html from the SPA shell.
HTML_ROUTES=(
  "/"
  "/login"
  "/register"
  "/forgot-password"
  "/reset-password"
  "/verify-email"
  "/salons"
  "/salon/lumina-luxe"
  "/my-appointments"
  "/dashboard"
  "/dashboard/onboarding"
  "/dashboard/website"
  "/dashboard/services"
  "/dashboard/staff"
  "/dashboard/approval"
  "/dashboard/preview"
  "/dashboard/bookings"
  "/dashboard/analytics"
  "/dashboard/billing"
  "/dashboard/account"
  "/admin"
  "/admin/users"
  "/admin/approvals"
  "/admin/salons"
  "/admin/subscriptions"
  "/admin/settings"
)

# Build output and crawler files served straight from the filesystem.
STATIC_ROUTES=(
  "/index.html"
  "/spa.html"
  "/robots.txt"
  "/sitemap.xml"
  "/favicon.png"
)

check() {
  local route="$1" expected_status="$2" expected_type="${3:-}"
  local response status ctype
  response="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{content_type}' "${BASE_URL}${route}" 2>/dev/null)"
  status="${response%% *}"
  ctype="${response#* }"

  if [ "$status" != "$expected_status" ]; then
    printf 'FAIL  %-28s expected HTTP %s, got HTTP %s\n' "$route" "$expected_status" "$status"
    FAILED=$((FAILED + 1))
    return
  fi
  if [ -n "$expected_type" ] && [[ "$ctype" != *"$expected_type"* ]]; then
    printf 'FAIL  %-28s expected %s, got %s\n' "$route" "$expected_type" "$ctype"
    FAILED=$((FAILED + 1))
    return
  fi
  printf 'PASS  %-28s HTTP %s %s\n' "$route" "$status" "$ctype"
}

echo "Verifying routes on ${BASE_URL}"
echo "--- client-side routes (expect HTTP 200, text/html) ---"
for route in "${HTML_ROUTES[@]}"; do check "$route" 200 "text/html"; done

echo "--- static build output (expect HTTP 200) ---"
for route in "${STATIC_ROUTES[@]}"; do check "$route" 200; done

echo "--- API passthrough ---"
check "/api/health" 200 "application/json"
check "/api/public/salons" 200 "application/json"
# Unknown API paths must stay a JSON 404 and must not fall through to the SPA shell.
check "/api/does-not-exist" 404 "application/json"

echo "--- deep link payload check ---"
if curl -sS --max-time 20 "${BASE_URL}/dashboard/bookings" | grep -q '<div id="root">'; then
  printf 'PASS  %-28s SPA shell served\n' "/dashboard/bookings"
else
  printf 'FAIL  %-28s SPA shell markup missing\n' "/dashboard/bookings"
  FAILED=$((FAILED + 1))
fi

echo
if [ "$FAILED" -eq 0 ]; then
  echo "All routes verified on ${BASE_URL}"
else
  echo "${FAILED} route check(s) failed on ${BASE_URL}"
fi
exit "$FAILED"
