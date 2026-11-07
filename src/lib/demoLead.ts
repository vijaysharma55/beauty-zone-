/**
 * Demo-request leads for the Nexora SalonOS landing page (/nexora-salonos).
 *
 * Leads are written straight to the `public.demo_requests` table through
 * Supabase PostgREST. Only the publishable key is used in the browser; the
 * table's RLS policy (see supabase/migrations/20261107_nexora_salonos_demo_requests.sql)
 * lets visitors INSERT a `new` row and nothing else, so the key cannot be used
 * to read other people's leads.
 *
 * We deliberately do not reuse `supabase.db.insert`: it asks PostgREST for
 * `return=representation`, which needs SELECT permission that anonymous
 * visitors (correctly) do not have.
 */
import { supabase } from './supabase';

export const DEMO_OUTLET_OPTIONS = [
  { value: '1', label: '1 outlet' },
  { value: '2-5', label: '2–5 outlets' },
  { value: '6-20', label: '6–20 outlets' },
  { value: '20+', label: '20+ outlets' },
] as const;

export type DemoLead = {
  name: string;
  phone: string;
  salon: string;
  outlets: string;
  city: string;
};
export type DemoLeadErrors = Partial<Record<keyof DemoLead, string>>;

/** Returns the 10-digit Indian mobile number (no +91 / leading 0), or null if invalid. */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '');
  const match = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return match ? match[1] : null;
}

/** Client-side validation. The database constraints enforce the same rules server-side. */
export function validateDemoLead(lead: DemoLead): DemoLeadErrors {
  const errors: DemoLeadErrors = {};
  const name = lead.name.trim();
  const salon = lead.salon.trim();
  const city = lead.city.trim();
  if (name.length < 2 || name.length > 100) errors.name = 'Please enter your name.';
  if (!normalizeIndianMobile(lead.phone)) errors.phone = 'Enter a valid 10-digit mobile number.';
  if (salon.length < 2 || salon.length > 100) errors.salon = 'Please enter your salon name.';
  if (city.length < 2 || city.length > 100) errors.city = 'Please enter your city.';
  if (!DEMO_OUTLET_OPTIONS.some((option) => option.value === lead.outlets)) errors.outlets = 'Choose how many outlets you run.';
  return errors;
}

/** Inserts one lead. Throws on validation, network or database errors. */
export async function submitDemoRequest(lead: DemoLead): Promise<void> {
  const phone = normalizeIndianMobile(lead.phone);
  if (Object.keys(validateDemoLead(lead)).length > 0 || !phone) {
    throw new Error('Invalid demo request.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${supabase.url}/rest/v1/demo_requests`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: supabase.publishableKey,
        Authorization: `Bearer ${supabase.publishableKey}`,
        'Content-Type': 'application/json',
        // minimal: the visitor gets no row back, so no SELECT policy is needed
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: lead.name.trim(),
        phone,
        salon_name: lead.salon.trim(),
        outlets: lead.outlets,
        city: lead.city.trim(),
        source: 'nexora-salonos-landing',
      }),
    });
    if (!response.ok) {
      throw new Error(`Demo request failed (${response.status}).`);
    }
  } finally {
    clearTimeout(timeout);
  }
}
