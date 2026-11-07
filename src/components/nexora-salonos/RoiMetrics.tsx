/** Section 4: core value propositions and headline ROI metrics. */
import { Check } from "lucide-react";
import { roiMetrics, valueProps } from "./content";
import { CtaButton, Section, SampleTag } from "./ui";

export function RoiMetrics() {
  return (
    <Section tone="muted" eyebrow="Results that compound" title="Grow revenue while working fewer hours">
      <div className="grid gap-5 md:grid-cols-3">
        {roiMetrics.map((m) => (
          <div key={m.label} className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-neutral-200">
            <p className="text-5xl font-extrabold tracking-tight text-red-600">{m.value}</p>
            <p className="mt-2 font-bold text-black">{m.label}</p>
            <p className="mt-1 text-sm text-neutral-600">{m.note}</p>
            <ul className="mt-4 space-y-1.5 border-t border-neutral-100 pt-4 text-left text-sm text-neutral-700">
              {m.points.map((pt) => (
                <li key={pt} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-red-600" aria-hidden /> {pt}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center"><SampleTag text="Illustrative metrics" /></p>

      <ul className="mx-auto mt-10 grid max-w-3xl gap-3">
        {valueProps.map((v) => (
          <li key={v} className="flex items-start gap-3 text-neutral-800">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden /> {v}
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center"><CtaButton>Get my free demo</CtaButton></div>
    </Section>
  );
}
