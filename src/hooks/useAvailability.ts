import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export interface Slot {
  value: string; // "14:30" (24h, machine value)
  label: string; // "02:30 PM" (display)
  start: string;
  end: string;
  available: boolean;
}

export type AvailabilityStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export interface AvailabilityState {
  status: AvailabilityStatus;
  slots: Slot[];
  /** True when the server could not be reached and local fallback slots are shown. */
  usingFallback: boolean;
  /** True while a retry attempt is in flight (first load excluded). */
  retrying: boolean;
  error: string | null;
  source: 'salon' | 'default' | null;
  closed: boolean;
  reason: string | null;
  open: string | null;
  close: string | null;
  reload: () => void;
}

/** Static grid used when the availability API is unreachable — booking never breaks. */
const FALLBACK_SLOTS: Slot[] = [
  { value: '10:00', label: '10:00 AM', start: '10:00', end: '11:00', available: true },
  { value: '11:30', label: '11:30 AM', start: '11:30', end: '12:30', available: true },
  { value: '13:00', label: '01:00 PM', start: '13:00', end: '14:00', available: true },
  { value: '14:30', label: '02:30 PM', start: '14:30', end: '15:30', available: true },
  { value: '16:00', label: '04:00 PM', start: '16:00', end: '17:00', available: true },
  { value: '17:30', label: '05:30 PM', start: '17:30', end: '18:30', available: true },
  { value: '19:00', label: '07:00 PM', start: '19:00', end: '20:00', available: true },
];

const MAX_RETRIES = 2;

interface Options {
  date?: string;
  slug?: string | null;
  durationMinutes?: number;
  enabled?: boolean;
}

/**
 * Loads bookable time slots for a date.
 *
 * Resilience contract:
 *  - Network/5xx failures retry twice with exponential backoff.
 *  - If every attempt fails we expose the static fallback grid with
 *    `usingFallback: true` so the UI can show a recovery notice and a Retry button.
 *  - The booking form therefore never becomes unusable because of a dead API.
 */
export function useAvailability({ date, slug, durationMinutes = 60, enabled = true }: Options): AvailabilityState {
  const [state, setState] = useState<Omit<AvailabilityState, 'reload'>>({
    status: 'idle',
    slots: [],
    usingFallback: false,
    retrying: false,
    error: null,
    source: null,
    closed: false,
    reason: null,
    open: null,
    close: null,
  });

  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!enabled || !date) {
      setState((prev) => ({ ...prev, status: 'idle', slots: [], error: null, usingFallback: false }));
      return;
    }

    attemptRef.current = 0;

    const run = async (attempt: number): Promise<void> => {
      if (!mountedRef.current) return;
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        status: 'loading',
        retrying: attempt > 0,
        error: null,
      }));

      const params = new URLSearchParams({ date });
      if (slug) params.set('slug', slug);
      if (durationMinutes) params.set('duration', String(durationMinutes));
      // Help the server hide slots that have already passed today.
      params.set('tzOffset', String(-new Date().getTimezoneOffset()));

      try {
        const res = await api.get<{
          slots: Slot[];
          source: 'salon' | 'default';
          closed: boolean;
          reason: string | null;
          open: string | null;
          close: string | null;
        }>(`/public/availability?${params.toString()}`);

        if (!mountedRef.current) return;
        const slots = Array.isArray(res.slots) ? res.slots : [];
        setState({
          status: slots.length > 0 ? 'ready' : 'empty',
          slots,
          usingFallback: false,
          retrying: false,
          error: null,
          source: res.source ?? null,
          closed: Boolean(res.closed),
          reason: res.reason ?? null,
          open: res.open ?? null,
          close: res.close ?? null,
        });
      } catch (err) {
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : 'Could not load available times.';

        if (attempt < MAX_RETRIES) {
          const delay = 400 * 2 ** attempt;
          timerRef.current = setTimeout(() => void run(attempt + 1), delay);
          return;
        }

        // Every attempt failed — degrade gracefully instead of blocking booking.
        console.error('[availability] falling back to static slots:', message);
        setState({
          status: 'ready',
          slots: FALLBACK_SLOTS,
          usingFallback: true,
          retrying: false,
          error: message,
          source: null,
          closed: false,
          reason: 'unreachable',
          open: null,
          close: null,
        });
      }
    };

    void run(0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [date, slug, durationMinutes, enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}

export { FALLBACK_SLOTS };
