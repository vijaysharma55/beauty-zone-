/** Section 10: persistent bottom conversion bar with the shared countdown. */
import { Timer } from "lucide-react";
import { PRICE_FROM } from "./content";
import { useCountdown } from "./CountdownProvider";
import { CtaButton } from "./ui";

export function StickyFooterBar() {
  const time = useCountdown();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-[72rem] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-black sm:text-base">Plans from {PRICE_FROM}/month</p>
          <p className="flex items-center gap-1 text-xs text-red-700 sm:text-sm">
            <Timer className="h-3.5 w-3.5" aria-hidden /> Offer ends in <span className="font-bold tabular-nums">{time}</span>
          </p>
        </div>
        <CtaButton className="shrink-0 px-5! py-2.5!">Book Free Demo</CtaButton>
      </div>
    </div>
  );
}
