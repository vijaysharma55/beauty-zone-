/** Section 1a: sticky top bar with brand, anchor links, live countdown and CTA. */
import { Timer } from "lucide-react";
import { BRAND } from "./content";
import { useCountdown } from "./CountdownProvider";
import { CtaButton } from "./ui";

const links = [
  { href: "#why", label: "Why us" },
  { href: "#compare", label: "Compare" },
  { href: "#modules", label: "Platform" },
  { href: "#stories", label: "Stories" },
];

export function StickyHeader() {
  const time = useCountdown();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[72rem] items-center justify-between gap-3 px-4 sm:px-6">
        <a href="#top" className="whitespace-nowrap text-lg font-extrabold tracking-tight text-black">
          Nexora<span className="text-red-600"> SalonOS</span>
          <span className="sr-only"> — {BRAND}</span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 lg:flex" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-black">{l.label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-sm font-bold tabular-nums text-red-700" aria-label={`Offer ends in ${time}`}>
            <Timer className="h-4 w-4" aria-hidden />
            {time}
          </div>
          {/* Wrapper (not the button) is hidden on mobile; the sticky footer bar carries the CTA there */}
          <div className="hidden sm:block">
            <CtaButton className="px-5! py-2!">Book Free Demo</CtaButton>
          </div>
        </div>
      </div>
    </header>
  );
}
