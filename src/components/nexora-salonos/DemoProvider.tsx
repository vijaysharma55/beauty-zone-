/**
 * Demo-booking dialog shared by every CTA on the Nexora SalonOS page.
 *
 * - `useDemo().open()` opens a native <dialog> (focus trap, Esc to close and
 *   backdrop are handled by the browser).
 * - Submitting validates the fields, then stores the lead in Supabase through
 *   `submitDemoRequest` (src/lib/demoLead.ts → public.demo_requests).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import { DEMO_OUTLET_OPTIONS, submitDemoRequest, validateDemoLead } from "../../lib/demoLead";
import type { DemoLead, DemoLeadErrors } from "../../lib/demoLead";

type DemoContextValue = { open: () => void };
const DemoContext = createContext<DemoContextValue>({ open: () => {} });
export const useDemo = () => useContext(DemoContext);

const EMPTY: DemoLead = { name: "", phone: "", salon: "", outlets: "1", city: "" };

const inputClass =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-black placeholder:text-neutral-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20";

export function DemoProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [lead, setLead] = useState<DemoLead>(EMPTY);
  const [errors, setErrors] = useState<DemoLeadErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "failed">("idle");

  const open = useCallback(() => {
    setStatus("idle");
    dialogRef.current?.showModal();
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);

  // Reset the form after the dialog has fully closed
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => { setLead(EMPTY); setErrors({}); setHoneypot(""); };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateDemoLead(lead);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Bots fill the hidden field; show them success without storing anything
    if (honeypot.trim()) {
      setStatus("done");
      return;
    }

    setStatus("sending");
    try {
      await submitDemoRequest(lead);
      setStatus("done");
    } catch (error) {
      console.error("[nexora-salonos] Demo request failed:", error);
      setStatus("failed");
    }
  };

  const field = (key: keyof DemoLead) => ({
    value: lead[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setLead((l) => ({ ...l, [key]: e.target.value })),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `nx-err-${key}` : undefined,
  });

  const error = (key: keyof DemoLead) =>
    errors[key] ? <p id={`nx-err-${key}`} className="mt-1 text-xs text-red-600">{errors[key]}</p> : null;

  return (
    <DemoContext.Provider value={{ open }}>
      {children}

      <dialog
        ref={dialogRef}
        aria-labelledby="nx-demo-title"
        // Clicking the dimmed backdrop (the dialog element itself) closes it
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}
        className="nexora-root m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="relative p-6 sm:p-8">
          <button type="button" onClick={close} aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-black">
            <X className="h-5 w-5" aria-hidden />
          </button>

          {status === "done" ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden />
              <h2 className="mt-4 text-xl font-extrabold text-black">Thanks, we&apos;ve got your request!</h2>
              <p className="mt-2 text-sm text-neutral-600">
                The Nexora SalonOS team will contact you on {lead.phone} to confirm your free demo.
              </p>
              <button type="button" onClick={close}
                className="mt-6 rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <h2 id="nx-demo-title" className="text-xl font-extrabold text-black">Book your free demo</h2>
              <p className="mt-1 text-sm text-neutral-600">30 minutes. No credit card. See it working on your own salon.</p>

              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-black">Your name
                  <input type="text" autoComplete="name" placeholder="e.g. Priya Sharma" className={inputClass} {...field("name")} />
                  {error("name")}
                </label>
                <label className="block text-sm font-medium text-black">Mobile number
                  <input type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className={inputClass} {...field("phone")} />
                  {error("phone")}
                </label>
                <label className="block text-sm font-medium text-black">Salon name
                  <input type="text" autoComplete="organization" placeholder="e.g. Aurelia Studio" className={inputClass} {...field("salon")} />
                  {error("salon")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium text-black">Outlets
                    <select className={inputClass} {...field("outlets")}>
                      {DEMO_OUTLET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {error("outlets")}
                  </label>
                  <label className="block text-sm font-medium text-black">City
                    <input type="text" autoComplete="address-level2" placeholder="e.g. Jaipur" className={inputClass} {...field("city")} />
                    {error("city")}
                  </label>
                </div>

                {/* Honeypot: invisible to people, tempting to bots */}
                <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label>Website
                    <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                  </label>
                </div>
              </div>

              {status === "failed" && (
                <p role="alert" className="mt-4 text-sm text-red-600">We couldn&apos;t save your request. Please try again in a moment.</p>
              )}

              <button type="submit" disabled={status === "sending"}
                className="mt-6 w-full rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                {status === "sending" ? "Sending…" : "Book Now Free Demo"}
              </button>
              <p className="mt-3 text-center text-xs text-neutral-500">We&apos;ll only use your details to arrange the demo.</p>
            </form>
          )}
        </div>
      </dialog>
    </DemoContext.Provider>
  );
}
