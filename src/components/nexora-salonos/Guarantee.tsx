/** Section 9: 14-day money-back guarantee with four trust pillars + demo CTA anchor. */
import { guaranteePillars } from "./content";
import { CtaButton, Section } from "./ui";

export function Guarantee() {
  return (
    <Section id="book-demo" eyebrow="Zero risk" title="Our 14-day money-back guarantee"
      subtitle="Try Nexora SalonOS with your real clients. If it isn't right for you, we refund you in full.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {guaranteePillars.map(({ icon: Icon, title, body }) => (
          <article key={title} className="rounded-2xl border border-neutral-200 p-6 text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><Icon className="h-6 w-6" aria-hidden /></span>
            <h3 className="font-bold text-black">{title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{body}</p>
          </article>
        ))}
      </div>
      <div className="mt-10 text-center">
        <CtaButton>Book Now Free Demo</CtaButton>
      </div>
    </Section>
  );
}
