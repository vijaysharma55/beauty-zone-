/**
 * Nexora SalonOS landing page, mounted at /nexora-salonos (see src/App.tsx).
 * Composes the ten sections in order. Copy, prices, ROI figures and
 * testimonials all live in ./content.ts.
 */
import { useEffect } from "react";
import { AutopilotGrid } from "./AutopilotGrid";
import { ComparisonTable } from "./ComparisonTable";
import { CountdownProvider } from "./CountdownProvider";
import { DemoProvider } from "./DemoProvider";
import { Guarantee } from "./Guarantee";
import { Hero } from "./Hero";
import { PainPoints } from "./PainPoints";
import { RoiMetrics } from "./RoiMetrics";
import { StickyFooterBar } from "./StickyFooterBar";
import { StickyHeader } from "./StickyHeader";
import { Testimonials } from "./Testimonials";
import { TrustedBrands } from "./TrustedBrands";
import { VideoAndAudience } from "./VideoAndAudience";
import "./nexora.css";

export const NEXORA_SALONOS_PATH = "/nexora-salonos";
const PAGE_TITLE = "Nexora SalonOS — The all-in-one operating system for salons";

export function NexoraSalonOSPage() {
  // Own the tab title while this page is mounted, then restore the previous one
  useEffect(() => {
    const previous = document.title;
    document.title = PAGE_TITLE;
    return () => { document.title = previous; };
  }, []);

  return (
    <div className="nexora-root min-h-screen bg-white text-neutral-900 antialiased">
      <CountdownProvider>
        <DemoProvider>
          <StickyHeader />
          <main className="pb-24">{/* bottom padding clears the sticky footer bar */}
            <Hero />
            <TrustedBrands />
            <VideoAndAudience />
            <RoiMetrics />
            <ComparisonTable />
            <PainPoints />
            <AutopilotGrid />
            <Testimonials />
            <Guarantee />
            <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-500">
              © {new Date().getFullYear()} Nexora SalonOS. All rights reserved.
            </footer>
          </main>
          <StickyFooterBar />
        </DemoProvider>
      </CountdownProvider>
    </div>
  );
}
