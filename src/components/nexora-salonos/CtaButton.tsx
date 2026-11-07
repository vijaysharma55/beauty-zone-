/** Primary red/coral call-to-action. Opens the shared demo-booking dialog. */
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useDemo } from "./DemoProvider";

export function CtaButton({
  children = "Book Free Demo",
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { open } = useDemo();

  return (
    <button
      type="button"
      onClick={open}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 hover:shadow-red-700/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:text-base ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </button>
  );
}
