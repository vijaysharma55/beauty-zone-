/** Section 7: the nine-module "autopilot" ecosystem. */
import { modules } from "./content";
import { CtaButton, Section } from "./ui";

export function AutopilotGrid() {
  return (
    <Section id="modules" eyebrow="One platform" title="Put your salon on autopilot"
      subtitle="Nine connected modules that share one client record, so nothing falls through the cracks.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ icon: Icon, title, body }, i) => (
          <article key={title} className="group rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-red-200 hover:shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-xs font-semibold text-neutral-300">0{i + 1}</span>
            </div>
            <h3 className="font-bold text-black">{title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{body}</p>
          </article>
        ))}
      </div>
      <div className="mt-10 text-center"><CtaButton>See every module live</CtaButton></div>
    </Section>
  );
}
