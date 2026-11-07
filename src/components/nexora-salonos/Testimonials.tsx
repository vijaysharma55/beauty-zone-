/**
 * Section 8: client success stories with rating badges.
 * All quotes, names, salons and ratings are SAMPLE placeholders (see
 * lib/content.ts). Replace with real, permitted testimonials before launch.
 */
import { Quote, Star } from "lucide-react";
import { averageRating, testimonials } from "./content";
import { Section, SampleTag } from "./ui";

export function Testimonials() {
  return (
    <Section id="stories" tone="muted" eyebrow="Client stories" title="Salon teams love working on Nexora SalonOS">
      <div className="-mt-4 mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 rounded-full bg-white px-5 py-2 shadow-sm ring-1 ring-neutral-200">
          <span className="flex" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 text-amber-400" fill="currentColor" />)}
          </span>
          <span className="text-sm font-bold text-black">{averageRating}/5 average</span>
        </div>
        <SampleTag text="Sample testimonials — replace with real quotes" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {testimonials.map((t) => (
          <figure key={t.name} className="flex flex-col rounded-2xl bg-white p-7 shadow-sm ring-1 ring-neutral-200">
            <Quote className="mb-3 h-7 w-7 text-red-200" aria-hidden />
            <blockquote className="flex-1 text-neutral-800">“{t.quote}”</blockquote>
            <figcaption className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-black">{t.name}</p>
                <p className="text-sm text-neutral-500">{t.role}, {t.salon}</p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-700">
                <Star className="h-4 w-4" fill="currentColor" aria-hidden /> {t.rating}/5
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
