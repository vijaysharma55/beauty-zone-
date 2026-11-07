import type { SalonPackage, ServiceCategory, ServiceItem } from '../types';

/**
 * Shared editorial helpers for the Lumina Luxe content system.
 *
 * These helpers guarantee that *every* card — including packages and services
 * created later by a salon owner — always has complete, professional copy and
 * a visible price. They never leave a blank description, an empty protocol or
 * an undefined price on a public card.
 */

export interface EditorialBlock {
  description: string;
  processSteps: string[];
  benefits: string[];
  idealFor: string;
  productsUsed: string[];
  priceNote: string;
}

export interface TreatmentDetail {
  id: string;
  kind: 'service' | 'package';
  eyebrow: string;
  title: string;
  image?: string;
  categoryLabel: string;
  description: string;
  processSteps: string[];
  benefits: string[];
  idealFor: string;
  productsUsed: string[];
  duration: string;
  price: number;
  originalPrice?: number;
  savings?: number;
  discount?: number;
  priceNote: string;
  inclusions: string[];
  validity?: string;
  outlets?: string[];
  usageRules?: string[];
}

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  bridal: 'Bridal Makeup & Airbrush Studio',
  hair: 'Hair Treatments & Styling',
  skin: 'Skin & Luxury Facials',
  nails: 'Nail Art & Russian Manicure',
  spa: 'Body Spas & Rituals',
  academy: 'Academy Certification',
};

/** Editorial safety net for custom cards that a salon owner adds later. */
export const CATEGORY_EDITORIAL: Record<ServiceCategory, EditorialBlock> = {
  bridal: {
    description:
      'A complete luxury bridal artistry journey: private complexion and shade consultation, professional skin preparation, layered high-definition base work, bespoke eye and lip artistry, jewellery and dupatta setting, and a sealed long-wear finish with a take-home touch-up kit. Every look is engineered for Indian ceremonies, warm venue lighting and high-resolution photography.',
    processSteps: [
      'Private consultation and shade matching against your outfit, jewellery and venue lighting.',
      'Professional cleanse, hydration, primer and colour correction.',
      'Layered HD or airbrush base artistry with bespoke eye, contour and lip design.',
      'Jewellery setting, veil fixing, couture draping and styled hair finish.',
      'Flash-photography check, long-wear sealing spray and a personalised touch-up kit.',
    ],
    benefits: [
      'Camera-ready, long-wear finish for the full ceremony',
      'Complexion-corrected coverage that still looks like skin',
      'Complete draping, jewellery and accessory setting',
      'Private bridal suite or on-venue artist available',
    ],
    idealFor:
      'All Indian skin tones and all skin types — normal, dry, combination, oily and sensitive — including brides with pigmentation, redness or texture concerns.',
    productsUsed: [
      'MAC',
      'Huda Beauty',
      'Charlotte Tilbury',
      'Temptu Airbrush',
      'NARS',
      'Dyson',
    ],
    priceNote:
      'Transparent fixed price displayed on the card, inclusive of consultation, skin preparation and finishing. Optional add-ons are always quoted and approved before the appointment.',
  },
  hair: {
    description:
      'A professional hair ritual beginning with a strand, scalp and porosity assessment, followed by a clarifying cleanse, bond protection, precision application of the treatment or colour, controlled processing and a heat-protected Dyson finish. The result is healthier, smoother, glossier hair with a written home-care plan to protect your investment.',
    processSteps: [
      'Strand, scalp and porosity assessment with a documented patch or strand test.',
      'Clarifying cleanse to remove minerals, silicone and product build-up.',
      'Olaplex bond protection followed by section-by-section professional application.',
      'Controlled processing, calibrated thermal sealing and a nourishing masque.',
      'Dyson blow-dry finish, styling advice and a sulphate-free home-care plan.',
    ],
    benefits: [
      'Frizz control, mirror shine and easier daily styling',
      'Bond-protected formulas that respect colour-treated hair',
      'Predictable, even results with documented safety testing',
      'Complimentary after-care guidance with every service',
    ],
    idealFor:
      'Dry, frizzy, coarse, porous, colour-treated, chemically treated and hard-water damaged hair of all textures, with gentler settings for sensitive scalps and fine hair.',
    productsUsed: [
      'Olaplex',
      'L’Oréal Professionnel',
      'Kérastase',
      'GK Hair',
      'MoroccanOil',
      'Dyson',
    ],
    priceNote:
      'Transparent fixed price displayed on the card, inclusive of consultation, professional products and the finishing blow-dry. Length supplements are quoted before work begins.',
  },
  skin: {
    description:
      'A clinical-grade facial journey that begins with magnified skin analysis and a gentle double cleanse, continues through exfoliation, targeted serum infusion and a sculpting massage, and finishes with a calming mask and broad-spectrum SPF. The protocol is customised to your skin type for visible radiance, hydration and clarity with zero downtime.',
    processSteps: [
      'Magnified skin analysis and sensitivity screening.',
      'Double cleanse, gentle exfoliation and warm herbal steam.',
      'Targeted serum infusion with professional ultrasound, vortex or massage techniques.',
      'Cooling mask, lymphatic massage and LED or ice-globe therapy.',
      'Broad-spectrum SPF seal and a personalised home-care prescription.',
    ],
    benefits: [
      'Immediate, photography-ready glow with no downtime',
      'Deep hydration, refined pores and more even tone',
      'Customised actives for your exact skin concern',
      'Genuine sealed professional formulations, opened in front of you',
    ],
    idealFor:
      'Dry, dull, dehydrated, mature, pigmented, oily, congested, combination and sensitive skin. Acid strength and device settings are adjusted after sensitivity screening.',
    productsUsed: [
      '24K gold leaf',
      'Forest Essentials',
      'Clinical hyaluronic acid',
      'HydraFacial MD',
      'Vitamin C',
      'Rose quartz',
    ],
    priceNote:
      'Transparent fixed price displayed on the card, inclusive of skin analysis, all professional actives and SPF protection. Optional boosters are pre-quoted.',
  },
  nails: {
    description:
      'A meticulous nail journey starting with nail-health assessment and UV-sterilised tools, followed by precision dry Russian e-file preparation, shaping, professional gel application, bespoke artistry and a high-gloss cured seal. Cuticle oil and a personalised after-care card complete a flawless, long-lasting finish.',
    processSteps: [
      'Nail-health assessment, design consultation and tool sterilisation.',
      'Dry Russian e-file cuticle work, shaping, buffing and dehydration.',
      'Thin, apex-balanced builder or gel colour layers cured under a professional LED lamp.',
      'Bespoke nail art with genuine crystals, chrome or 24K gold foil.',
      'High-gloss top coat, cuticle oil, symmetry check and after-care guidance.',
    ],
    benefits: [
      'Immaculate cuticle line and chip-resistant, high-gloss wear',
      'Adds elegant length and symmetry to short or brittle nails',
      'Fully customisable art matched to your outfit',
      'Hospital-grade hygiene with sealed, authentic professional products',
    ],
    idealFor:
      'Short, bitten, brittle, peeling or uneven nails, dry cuticles and all nail types. Suitable for sensitive cuticles after an allergy and sensitivity screen.',
    productsUsed: [
      'CND Shellac',
      'OPI GelColor',
      'Swarovski crystals',
      '24K gold foil',
      'Russian e-file',
      'Medical-grade LED lamp',
    ],
    priceNote:
      'Transparent fixed price displayed on the card, inclusive of preparation, gel application and finishing care. Additional 3D art is quoted before application.',
  },
  spa: {
    description:
      'An unhurried private-suite body ritual that begins with a wellness consultation, then moves through exfoliation or a therapeutic soak, a full-body massage with warm oils, aromatic steam, a hydrating wrap and a calming reflexology finish. Designed to release muscle tension, restore deep hydration and leave skin satin-soft before a celebration.',
    processSteps: [
      'Wellness consultation, pressure preference and aromatherapy selection.',
      'Dry brushing or a warm therapeutic soak to soften and prepare the skin.',
      'Full-body exfoliation or Swedish and lymphatic massage with warm oils.',
      'Aromatic steam, herbal or mineral wrap and a warm towel ritual.',
      'Scalp and foot reflexology, moisture seal and quiet rest with herbal tea.',
    ],
    benefits: [
      'Deep relaxation and relief from travel or pre-wedding fatigue',
      'Satin-soft, evenly hydrated, luminous skin',
      'Lymphatic drainage reduces puffiness and water retention',
      'Private suite and unhurried, one-to-one therapist attention',
    ],
    idealFor:
      'All skin types, especially dry, dull, tired and sensitive skin, and anyone needing stress relief, better sleep or pre-event glow. Pressure and oils are customised on request.',
    productsUsed: [
      'Forest Essentials',
      'Cold-pressed almond oil',
      'Dead Sea mineral salts',
      'Kashmiri kesar & ubtan',
      'Rose hydrosol',
      'Shea butter',
    ],
    priceNote:
      'Transparent fixed price displayed on the card, inclusive of the private suite, all professional products, steam and refreshments.',
  },
  academy: {
    description:
      'A structured, certified professional programme combining theory, educator demonstrations and supervised hands-on practice on live models. The curriculum covers foundations, advanced technique, hygiene and safety, client consultation, pricing and portfolio creation, and concludes with a practical assessment and recognised certification.',
    processSteps: [
      'Orientation, kit walkthrough and foundational theory with safety and hygiene standards.',
      'Educator demonstration of core techniques followed by guided practice.',
      'Supervised live-model sessions and timed professional drills.',
      'Business module covering consultation, pricing, retail and portfolio building.',
      'Practical assessment, viva, certification and career or placement guidance.',
    ],
    benefits: [
      'Recognised professional certification',
      'Hands-on live-model practice, not just theory',
      'Genuine professional kits and products included in the fee',
      'Business and freelancing skills that build earning potential',
    ],
    idealFor:
      'Beginners, home-based beauticians, salon assistants and working professionals upgrading to advanced bridal, hair or chemical work. No prior experience required for foundation batches.',
    productsUsed: [
      'MAC Pro',
      'Huda Beauty',
      'Temptu Airbrush',
      'L’Oréal Professionnel',
      'Olaplex',
      'Dyson',
    ],
    priceNote:
      'Transparent fixed course fee displayed on the card, inclusive of training, professional products, study material and certification. Instalment options are available at enrolment.',
  },
};

const inr = (amount: number) => `₹${Math.max(0, Math.round(Number(amount) || 0)).toLocaleString('en-IN')}`;
const clean = (value?: string) => (typeof value === 'string' ? value.trim() : '');
const nonEmpty = (items: string[] | undefined, fallback: string[]) =>
  Array.isArray(items) && items.some((item) => clean(item)) ? items.filter((item) => clean(item)) : fallback;

export function buildFallbackServiceCopy(service: ServiceItem): EditorialBlock {
  const base = CATEGORY_EDITORIAL[service.category] || CATEGORY_EDITORIAL.hair;
  const duration = clean(service.duration) || '60 mins';
  const price = inr(service.price);
  const highlights = nonEmpty(service.highlights, []);
  const highlightLine = highlights.length ? ` Signature details include ${highlights.slice(0, 4).join(', ')}.` : '';
  return {
    ...base,
    description:
      `${clean(service.title) || 'This signature treatment'} is a ${duration} luxury salon journey priced at ${price}. ` +
      base.description +
      ` Every stage is performed with sealed, genuine professional products and a documented consultation, with clear pricing and no hidden charges.${highlightLine}`,
    priceNote:
      `${price} fixed price for ${duration}, inclusive of consultation, professional products and finishing care. Optional add-ons are always quoted and approved before the service begins.`,
  };
}

export function buildFallbackPackageCopy(pkg: SalonPackage): EditorialBlock {
  const services = nonEmpty(pkg.services, []);
  const duration = clean(pkg.duration) || '120 mins';
  const price = inr(pkg.package_price > 0 ? pkg.package_price : pkg.regular_price);
  const listed = services.length
    ? ` It brings together ${services.slice(0, 3).join(', ')}${services.length > 3 ? ` and ${services.length - 3} more curated rituals` : ''} in one carefully sequenced programme.`
    : '';
  const base = CATEGORY_EDITORIAL.bridal;
  return {
    description:
      `${clean(pkg.name) || 'This curated package'} is a ${duration} luxury programme priced at ${price}, designed for clients who want a complete, unhurried head-to-toe transformation.${listed} ` +
      'Your journey begins with a personal consultation and skin, hair or nail analysis, continues through each included ritual in a sequence planned by our senior therapists, and closes with a finishing glow, after-care guidance and a transparent final bill.',
    processSteps: services.length
      ? [
          'Private consultation, concern mapping and a written session plan.',
          ...services.map((item, index) => `Session ${index + 1}: ${item}.`),
          'Finishing glow check, home-care plan and transparent billing.',
        ]
      : base.processSteps,
    benefits: [
      'One transparent package price instead of separate service bills',
      'A professionally sequenced plan that avoids conflicting treatments',
      'Genuine sealed international and Ayurvedic products throughout',
      'Flexible scheduling across the redemption window',
    ],
    idealFor:
      'All skin and hair types, with protocols customised after a personal consultation. Especially recommended for brides, wedding guests and clients preparing for milestone celebrations.',
    productsUsed: [
      'MAC',
      'Huda Beauty',
      'Olaplex',
      'L’Oréal Professionnel',
      '24K gold leaf',
      'Dyson',
    ],
    priceNote:
      `${price} all-inclusive package price. Every included service, the validity window and the applicable outlets are listed on this card; optional upgrades are quoted before booking.`,
  };
}

/** Public, never-empty description for a service card. */
export function displayServiceDescription(service: ServiceItem): string {
  return clean(service.description) || buildFallbackServiceCopy(service).description;
}

/** Public, never-empty description for a bridal/combo package card. */
export function displayPackageDescription(pkg: SalonPackage): string {
  return clean(pkg.description) || buildFallbackPackageCopy(pkg).description;
}

export function toServiceDetail(service: ServiceItem): TreatmentDetail {
  const fallback = buildFallbackServiceCopy(service);
  return {
    id: service.id,
    kind: 'service',
    eyebrow: 'Signature Treatment',
    title: clean(service.title) || 'Signature Treatment',
    image: service.image,
    categoryLabel: CATEGORY_LABELS[service.category] || 'Luxury Salon',
    description: displayServiceDescription(service),
    processSteps: nonEmpty(service.processSteps, fallback.processSteps),
    benefits: nonEmpty(service.benefits, fallback.benefits),
    idealFor: clean(service.idealFor) || fallback.idealFor,
    productsUsed: nonEmpty(service.productsUsed, fallback.productsUsed),
    duration: clean(service.duration) || '60 mins',
    price: Number(service.price) || 0,
    priceNote: clean(service.priceNote) || fallback.priceNote,
    inclusions: nonEmpty(service.highlights, fallback.benefits),
  };
}

export function toPackageDetail(pkg: SalonPackage): TreatmentDetail {
  const fallback = buildFallbackPackageCopy(pkg);
  const original = Number(pkg.regular_price) || 0;
  const price = Number(pkg.package_price) || original;
  return {
    id: pkg.id,
    kind: 'package',
    eyebrow: 'Curated Bridal & Glow Package',
    title: clean(pkg.name) || 'Curated Luxury Package',
    image: pkg.image,
    categoryLabel: 'Curated Package',
    description: displayPackageDescription(pkg),
    processSteps: nonEmpty(pkg.processSteps, fallback.processSteps),
    benefits: nonEmpty(pkg.benefits, fallback.benefits),
    idealFor: clean(pkg.idealFor) || fallback.idealFor,
    productsUsed: nonEmpty(pkg.productsUsed, fallback.productsUsed),
    duration: clean(pkg.duration) || '120 mins',
    price,
    originalPrice: original > price ? original : undefined,
    savings: Number(pkg.savings) > 0 ? Number(pkg.savings) : undefined,
    discount: Number(pkg.discount) > 0 ? Number(pkg.discount) : undefined,
    priceNote: clean(pkg.priceNote) || fallback.priceNote,
    inclusions: nonEmpty(pkg.services, []),
    validity: clean(pkg.validity) || undefined,
    outlets: nonEmpty(pkg.outlets, []),
    usageRules: nonEmpty(pkg.usage_rules, []),
  };
}
