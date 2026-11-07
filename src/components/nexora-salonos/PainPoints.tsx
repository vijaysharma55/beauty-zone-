/** Section 6: eight operational pain points in a responsive grid. */
import { ArrowRight } from "lucide-react";
import { painPoints } from "./content";
import { Section } from "./ui";

export function PainPoints() {
  return (
    <Section tone="muted" eyebrow="Sound familiar?" title="8 challenges holding your salon back"
      subtitle="Most salons lose revenue in the same few places. Nexora SalonOS closes each gap.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {painPoints.map(({ icon: Icon, title, body, fix }) => (
          <article key={title} className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
            <Icon className="mb-3 h-6 w-6 text-red-600" aria-hidden />
            <h3 className="font-bold text-black">{title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{body}</p>
            <p className="mt-4 flex items-start gap-1.5 border-t border-neutral-100 pt-3 text-sm font-medium text-red-700">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {fix}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
