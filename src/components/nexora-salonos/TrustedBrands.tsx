/**
 * Section 2: infinite marquee of partner salons.
 * Uses text wordmarks as placeholders; swap in real, approved partner logos.
 */
import { partnerSalons } from "./content";
import { SampleTag } from "./ui";

export function TrustedBrands() {
  // Duplicate the list so the -50% translate loops seamlessly
  const loop = [...partnerSalons, ...partnerSalons];

  return (
    <section className="border-y border-neutral-200 bg-neutral-50 py-10" aria-label="Trusted by leading salons">
      <p className="mb-6 flex items-center justify-center gap-3 text-center text-sm font-semibold uppercase tracking-widest text-neutral-500">
        Trusted by growing salon brands <SampleTag text="Placeholder names" />
      </p>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max nx-marquee gap-12 whitespace-nowrap">
          {loop.map((name, i) => (
            <span key={`${name}-${i}`} className="text-xl font-extrabold tracking-tight text-neutral-400">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
