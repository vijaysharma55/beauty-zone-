/** Section 5: side-by-side comparison of Nexora SalonOS vs other solutions. */
import { Check, Minus, X } from "lucide-react";
import { comparisonRows } from "./content";
import { Section } from "./ui";

/** Renders a yes / partial / no icon with an accessible label. */
function Mark({ value }: { value: boolean | "partial" }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-green-600" aria-label="Included" />;
  if (value === "partial") return <Minus className="mx-auto h-5 w-5 text-amber-500" aria-label="Partial" />;
  return <X className="mx-auto h-5 w-5 text-neutral-400" aria-label="Not included" />;
}

export function ComparisonTable() {
  return (
    <Section id="compare" eyebrow="Why switch" title="Nexora SalonOS vs other solutions">
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th scope="col" className="p-4 font-semibold text-neutral-500">Capability</th>
              <th scope="col" className="bg-red-600 p-4 text-center font-bold text-white">Nexora SalonOS</th>
              <th scope="col" className="p-4 text-center font-semibold text-neutral-500">Other solutions</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((r) => (
              <tr key={r.feature} className="border-b border-neutral-100 last:border-0">
                <th scope="row" className="p-4 font-medium text-black">{r.feature}</th>
                <td className="bg-red-50/60 p-4"><Mark value={r.us} /></td>
                <td className="p-4"><Mark value={r.others} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
