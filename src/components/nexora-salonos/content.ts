/**
 * Central content file for the Nexora SalonOS landing page.
 *
 * IMPORTANT: everything below is SAMPLE / PLACEHOLDER copy so the page looks
 * complete during design review. Before publishing:
 *  - replace testimonials with real, permitted customer quotes and ratings
 *  - replace partner names with real partners who agreed to be shown
 *  - replace ROI metrics and pricing with figures you can substantiate
 * While SAMPLE_CONTENT is true, the page shows small "Sample content" labels.
 */
import {
  BarChart3, CalendarCheck, CalendarX, Contact, CreditCard, Gift,
  Globe, Megaphone, Package, Store, TrendingDown, UserCog, UserMinus, Wallet,
  Building2, Users, Briefcase, HeartHandshake, ShieldCheck, RefreshCw,
  Headphones, Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const SAMPLE_CONTENT = true;

export const BRAND = "Nexora SalonOS";
/** Starting countdown in seconds (13:48). Resets when it hits zero. */
export const COUNTDOWN_START_SECONDS = 13 * 60 + 48;
export const PRICE_FROM = "₹799"; // placeholder price

export const partnerSalons = [
  "Aurelia Studio", "Velvet & Vine", "The Glow Lounge", "Maison Lumière",
  "Saffron Hair Co.", "Opal Beauty Bar", "Urban Strand", "Bloom Spa & Salon",
  "Kōhl Collective", "Rosewood Salons",
];

export type Card = { icon: LucideIcon; title: string; body: string };
export type PainPoint = Card & { fix: string };

export const audiences: Card[] = [
  { icon: Store, title: "Salon owners", body: "Fill your chairs, cut no-shows and see revenue per stylist in real time." },
  { icon: Building2, title: "Franchise managers", body: "Roll out one playbook across outlets with central pricing, reports and brand control." },
  { icon: Briefcase, title: "Operations managers", body: "Automate rosters, stock and reminders so the front desk stops firefighting." },
  { icon: HeartHandshake, title: "Customer experience leaders", body: "Personalised journeys, loyalty and feedback loops that bring clients back." },
];

export const roiMetrics = [
  { value: "28%", label: "Average revenue uplift", note: "from online booking, upsell prompts and win-back campaigns", points: ["24/7 online booking", "Smart upsell prompts at checkout", "Automated win-back offers"] },
  { value: "15+ hrs", label: "Saved every week", note: "by automating reminders, billing and daily reports", points: ["Auto reminders & confirmations", "One-tap billing & commissions", "Daily reports in your inbox"] },
  { value: "4–5x", label: "Better client retention", note: "with loyalty, memberships and automated follow-ups", points: ["Points, tiers & memberships", "Post-visit follow-ups", "Birthday & anniversary offers"] },
];

export const valueProps = [
  "Launch your own branded booking site and marketplace listing in days",
  "One login for every outlet, stylist and client record",
  "Automated WhatsApp, SMS and email campaigns that run on autopilot",
];

export const comparisonRows: { feature: string; us: boolean; others: boolean | "partial" }[] = [
  { feature: "All-in-one platform (CRM, POS, bookings, inventory)", us: true, others: "partial" },
  { feature: "Automated marketing campaigns", us: true, others: false },
  { feature: "Real-time analytics & reports", us: true, others: "partial" },
  { feature: "Built-in loyalty & memberships", us: true, others: false },
  { feature: "White-label marketplace listing", us: true, others: false },
  { feature: "Unlimited staff training & onboarding", us: true, others: false },
];

export const painPoints: PainPoint[] = [
  { icon: CalendarX, title: "Mishandled appointments", body: "Double bookings and missed calls quietly cost you loyal clients.", fix: "Live calendar with auto-reminders and no-show protection." },
  { icon: TrendingDown, title: "Stagnant growth", body: "No clear view of what drives repeat visits, so revenue plateaus.", fix: "Growth dashboard that shows exactly which services and offers move revenue." },
  { icon: UserMinus, title: "Clients who never return", body: "Without follow-ups, first-timers drift to the salon next door.", fix: "Automatic rebooking nudges 21 days after every visit." },
  { icon: Package, title: "Inventory leaks", body: "Untracked products expire, go missing or run out mid-service.", fix: "Product-level stock tracking with low-stock and expiry alerts." },
  { icon: Wallet, title: "Billing & commission errors", body: "Manual calculations create disputes and slow down payroll.", fix: "One-tap billing with commissions calculated for you." },
  { icon: UserCog, title: "Staff scheduling chaos", body: "Gaps in the roster mean idle chairs on busy days.", fix: "Drag-and-drop rosters synced to the booking calendar." },
  { icon: Megaphone, title: "Marketing that doesn't land", body: "Generic blasts get ignored; offers aren't tied to client behaviour.", fix: "Segmented WhatsApp, SMS and email journeys triggered by behaviour." },
  { icon: BarChart3, title: "Decisions without data", body: "Spreadsheets and gut feel make it hard to scale with confidence.", fix: "Real-time reports for every outlet, stylist and service." },
];

export const modules: Card[] = [
  { icon: Contact, title: "Smart CRM", body: "Full client history, preferences and visit patterns in one profile." },
  { icon: CreditCard, title: "POS & billing", body: "Fast checkout, split payments, GST-ready invoices and commissions." },
  { icon: CalendarCheck, title: "Online bookings", body: "24/7 self-service booking from your site, social and the marketplace." },
  { icon: Megaphone, title: "Marketing automation", body: "Birthday, win-back and offer campaigns on WhatsApp, SMS and email." },
  { icon: Gift, title: "Loyalty & memberships", body: "Points, packages and tiers that reward your best clients." },
  { icon: Users, title: "Staff management", body: "Rosters, attendance, targets and automatic incentive tracking." },
  { icon: Package, title: "Inventory", body: "Stock alerts, usage tracking and supplier reorders." },
  { icon: BarChart3, title: "Reports & analytics", body: "Revenue, retention and stylist performance at a glance." },
  { icon: Globe, title: "Website & marketplace", body: "A white-label branded site plus a listing on the Nexora marketplace." },
];

export const testimonials = [
  { quote: "Online bookings jumped within the first month and our front desk finally got breathing room.", name: "Priya Menon", role: "Owner", salon: "Aurelia Studio", rating: 4.8 },
  { quote: "Managing five outlets from one dashboard changed how we plan stock and staffing.", name: "Rahul Verma", role: "Operations Manager", salon: "Maison Lumière", rating: 4.7 },
  { quote: "The automated win-back messages brought lapsed clients back without any extra effort.", name: "Anita Desai", role: "Franchise Manager", salon: "The Glow Lounge", rating: 4.6 },
  { quote: "Loyalty points made clients rebook before they left the chair. Our retention is visibly better.", name: "Sana Qureshi", role: "Customer Experience Lead", salon: "Velvet & Vine", rating: 4.8 },
];

export const guaranteePillars: Card[] = [
  { icon: RefreshCw, title: "14-day money-back", body: "Not a fit? Get a full refund within 14 days, no awkward questions." },
  { icon: ShieldCheck, title: "Risk-free onboarding", body: "We import your clients and services so you start with real data." },
  { icon: Headphones, title: "Dedicated support", body: "A named success manager and live chat through your first month." },
  { icon: Lock, title: "Your data stays yours", body: "Export everything anytime. Encrypted, backed up and never sold." },
];

export const heroBullets = ["No credit card required", "Setup in under 48 hours", "Free data migration"];

/** Average of the sample ratings above, rounded to one decimal (e.g. 4.7). */
export const averageRating = Math.round((testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length) * 10) / 10;
