/** Section 3: product demo video placeholder + who the platform is built for. */
import { Play } from "lucide-react";
import { audiences } from "./content";
import { Section } from "./ui";

export function VideoAndAudience() {
  return (
    <Section id="why" eyebrow="See it in action" title="Built for every role in your salon business"
      subtitle="Watch a 2-minute walkthrough, then see how Nexora SalonOS fits the way your team works.">
      {/* Video placeholder: replace with an <iframe> or <video> when the demo is recorded */}
      <div className="relative mx-auto mb-12 aspect-video max-w-3xl overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-700 shadow-xl">
        <button type="button" aria-label="Play product demo video"
          className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:scale-105 hover:bg-red-700">
            <Play className="h-8 w-8 translate-x-0.5" fill="currentColor" aria-hidden />
          </span>
        </button>
        <span className="absolute bottom-4 left-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white">2:14 · Product tour</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {audiences.map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"><Icon className="h-5 w-5" aria-hidden /></span>
            <h3 className="font-bold text-black">{title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
