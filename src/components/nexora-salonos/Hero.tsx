/** Section 1b: hero with value prop, price anchor, bullets, CTAs and a product preview. */
import { CalendarCheck, CheckCircle2, IndianRupee, TrendingUp, Users } from "lucide-react";
import { heroBullets, PRICE_FROM } from "./content";
import { CtaButton, SampleTag } from "./ui";

/** Illustrative bars for the preview chart (relative heights, not real data). */
const BARS = [38, 52, 44, 66, 58, 82, 94];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Illustrative upcoming bookings shown in the preview card. */
const UPCOMING = [
  { time: "10:30", client: "Meera K.", service: "Hair colour + spa", who: "with Riya" },
  { time: "11:15", client: "Ayesha S.", service: "Bridal trial", who: "with Neha" },
  { time: "12:00", client: "Karan P.", service: "Haircut & beard", who: "with Dev" },
];

/** Pure-CSS dashboard mockup: gives the hero a product visual with no image assets. */
function ProductPreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-[56rem]">
      {/* Coral halo behind the card */}
      <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-rose-100 via-red-50 to-transparent blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-2xl shadow-neutral-900/10">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-xs font-medium text-neutral-500">Nexora SalonOS · Today</span>
          <span className="ml-auto"><SampleTag text="Illustrative preview" /></span>
        </div>

        <div className="grid gap-px bg-neutral-100 md:grid-cols-5">
          {/* KPIs + chart */}
          <div className="bg-white p-5 md:col-span-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: IndianRupee, label: "Revenue today", value: "₹48,250", tone: "+12%" },
                { icon: CalendarCheck, label: "Bookings", value: "36", tone: "+8" },
                { icon: Users, label: "Returning clients", value: "71%", tone: "+5%" },
              ].map(({ icon: Icon, label, value, tone }) => (
                <div key={label} className="rounded-xl bg-neutral-50 p-3">
                  <Icon className="h-4 w-4 text-red-600" aria-hidden />
                  <p className="mt-2 text-lg font-extrabold tabular-nums text-black sm:text-xl">{value}</p>
                  <p className="text-[11px] text-neutral-500">{label}</p>
                  <p className="mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold text-green-600">
                    <TrendingUp className="h-3 w-3" aria-hidden /> {tone}
                  </p>
                </div>
              ))}
            </div>

            <p className="mb-2 mt-5 text-xs font-semibold text-neutral-500">Revenue this week</p>
            <div role="img" aria-label="Bar chart: revenue rising through the week">
              {/* Bars: each column is full height so the % height of the bar resolves */}
              <div className="flex h-24 items-end gap-2">
                {BARS.map((h, i) => (
                  <div key={i} className="flex h-full flex-1 items-end">
                    <div className={`w-full rounded-t-md ${i === BARS.length - 1 ? "bg-red-600" : "bg-red-200"}`} style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-2">
                {DAYS.map((d, i) => <span key={i} className="flex-1 text-center text-[10px] text-neutral-400">{d}</span>)}
              </div>
            </div>
          </div>

          {/* Upcoming bookings */}
          <div className="bg-white p-5 md:col-span-2">
            <p className="mb-3 text-xs font-semibold text-neutral-500">Next appointments</p>
            <ul className="space-y-3">
              {UPCOMING.map((a) => (
                <li key={a.time} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3">
                  <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold tabular-nums text-red-700">{a.time}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-black">{a.client}</p>
                    <p className="truncate text-xs text-neutral-500">{a.service} · {a.who}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white">
              ✨ 14 win-back messages sent automatically this morning
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative scroll-mt-20 overflow-hidden bg-white">
      {/* Soft coral glow behind the headline */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-rose-100 blur-3xl" />
      <div className="relative mx-auto max-w-[64rem] px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24">
        <p className="mx-auto mb-5 inline-block rounded-full bg-red-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-700">
          The operating system for modern salons
        </p>
        <h1 className="mx-auto max-w-[56rem] text-4xl font-extrabold leading-tight tracking-tight text-black sm:text-6xl">
          Break free today — starting at just{" "}
          <span className="text-red-600">{PRICE_FROM}/month!</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
          Run bookings, billing, marketing and loyalty from one platform, and get
          discovered through your own white-label salon marketplace.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CtaButton>Book Now Free Demo</CtaButton>
          <a href="#modules" className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-black hover:border-black sm:text-base">
            See the platform
          </a>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-600">
          {heroBullets.map((b) => (
            <li key={b} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-red-600" aria-hidden /> {b}
            </li>
          ))}
        </ul>

        <ProductPreview />
      </div>
    </section>
  );
}
