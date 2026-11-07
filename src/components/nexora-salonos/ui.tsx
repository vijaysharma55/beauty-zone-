/** Small shared building blocks used across sections. */
import type { ReactNode } from "react";
import { SAMPLE_CONTENT } from "./content";

/** Primary CTA lives in its own client component (it opens the demo dialog). */
export { CtaButton } from "./CtaButton";

/** Consistent section wrapper: padding, max width, optional heading block. */
export function Section({
  id, title, eyebrow, subtitle, children, tone = "white",
}: {
  id?: string; title: string; eyebrow?: string; subtitle?: string;
  children: ReactNode; tone?: "white" | "muted";
}) {
  return (
    <section id={id} className={`scroll-mt-20 ${tone === "muted" ? "bg-neutral-50" : "bg-white"}`}>
      <div className="mx-auto max-w-[72rem] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-600">{eyebrow}</p>}
          <h2 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">{title}</h2>
          {subtitle && <p className="mt-3 text-neutral-600">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Small label shown only while placeholder content is in use. */
export function SampleTag({ text = "Sample content" }: { text?: string }) {
  if (!SAMPLE_CONTENT) return null;
  return (
    <span className="inline-block rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
      {text}
    </span>
  );
}
