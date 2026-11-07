import type { ServiceItem } from '../types';

/**
 * Lumina Luxe — master treatment catalog.
 *
 * Every card carries a complete editorial record: a rich overview, a numbered
 * step-by-step protocol, outcome-led benefits, the ideal skin/hair profile,
 * the genuine sealed professional brands used, and transparent pricing notes.
 * The `description` field is intentionally self-contained so that every surface
 * (booking picker, comparison table, recommendations, owner dashboard and the
 * tenant site) always has complete copy even without the detail panel.
 */
export const LUXURY_SERVICE_CATALOG: ServiceItem[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // BRIDAL MAKEUP & AIRBRUSH STUDIO
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'b1',
    title: 'Signature Royal HD Bridal Makeover',
    category: 'bridal',
    price: 24999,
    duration: '210 mins',
    description:
      'A couture bridal makeover choreographed for the long Indian wedding day, priced at ₹24,999 for 210 minutes of unhurried, private-suite artistry. Your senior artist begins with a one-to-one complexion, undertone and outfit consultation, then performs a gentle cleanse, collagen prep mask and MAC Prep + Prime hydration. A flawless high-definition base is built in thin layers with MAC Studio Fix, Huda Beauty #FauxFilter and Charlotte Tilbury Hollywood Flawless Filter, followed by bespoke eye artistry, contouring, Kundan-safe jewellery setting, lehenga and dupatta draping and a Dyson-styled hair finish. Expect 16-hour photography-ready wear, dimensional skin that never looks cakey under palace lighting, and complete calm on your wedding morning. Ideal for normal, dry, combination and sensitive skin, and for every Indian bridal complexion. Includes premium lashes, a MAC Fix+ sealing ritual and a complimentary touch-up kit.',
    processSteps: [
      'Private bridal consultation: skin mapping, undertone and shade matching against your lehenga, jewellery and venue lighting.',
      'Skin preparation: gentle Forest Essentials cleanse, mild exfoliation, collagen sheet mask, MAC Prep + Prime moisturising primer and lip balm.',
      'HD base artistry: thin, buildable layers of MAC Studio Fix, Huda Beauty #FauxFilter and Charlotte Tilbury Flawless Filter, colour-corrected for redness and pigmentation.',
      'Eye and feature definition: bespoke cut-crease or traditional smokey eye, Huda Beauty palettes, brow sculpting, contour, blush and a hand-blended highlight.',
      'Finishing couture: Kundan and polki jewellery setting, veil fixing, precision lehenga and dupatta draping, premium lashes and Dyson Airwrap hair styling.',
      'Sealing and handover: MAC Prep + Prime Fix+, blot-test under flash photography, plus a personalised touch-up kit and after-care card.',
    ],
    benefits: [
      '16+ hours of transfer-resistant, camera-ready wear through pheras, rituals and receptions',
      'Skin-like HD finish that never cakes, cracks or flashes white in professional photography',
      'Complete jewellery, dupatta and veil setting so nothing shifts during ceremonies',
      'Private bridal suite or on-venue service across Jaipur palaces, hotels and resorts',
      'Complimentary shade-match trial, false lashes and take-home touch-up kit',
    ],
    idealFor:
      'All Indian skin tones and skin types — normal, dry, combination, oily and sensitive. Especially recommended for brides with pigmentation, uneven texture, acne marks or redness who need high coverage without heaviness, and for daytime palace or outdoor mandap weddings in Jaipur.',
    productsUsed: [
      'MAC Studio Fix & Prep + Prime',
      'Huda Beauty #FauxFilter & palettes',
      'Charlotte Tilbury Flawless Filter',
      'Temptu / Kryolan HD finishing',
      'NARS & Bobbi Brown correctors',
      'Dyson Supersonic & Airwrap',
      'Ardell lashes & Forest Essentials prep',
    ],
    priceNote:
      '₹24,999 fixed bridal package price, inclusive of skin prep, lashes, draping, jewellery setting and touch-up kit. A 25% advance confirms your senior artist and is adjusted in the final bill; optional add-ons are quoted before booking.',
    highlights: [
      'MAC · Huda Beauty · Charlotte Tilbury',
      '16-Hour Waterproof HD Finish',
      '210 mins · All Skin Types',
      'Jewellery, Dupatta & Veil Setting',
      '₹24,999 All-Inclusive',
    ],
    popular: true,
    image: '/images/jaipur_royal_bride_1792647664582.jpg',
  },
  {
    id: 'b2',
    title: 'Premium Airbrush Bridal Makeup',
    category: 'bridal',
    price: 34999,
    duration: '240 mins',
    description:
      'Our most advanced bridal offering at ₹34,999 for 240 minutes: genuine Temptu and Kryolan silicone-airbrush artistry delivered by a Chief Bridal Artist. The journey opens with a detailed skin and longevity assessment, a calming cleanse, hydrating ampoule and silicone primer, after which micro-fine airbrush pigment is sprayed in whisper-thin layers for a poreless, weightless second skin. Huda Beauty and MAC detail work shapes the eyes and lips, while a Dyson-finished hairstyle, Kundan jewellery setting and couture draping complete the look. Waterproof, sweat-resistant and tear-proof for 18+ hours, it is engineered for Jaipur summer weddings, humid mandaps, long pheras and high-definition 4K videography. Ideal for oily, combination, mature, textured or acne-prone skin and for brides who prefer an ultra-light, transfer-proof base. Includes a pre-wedding trial, full touch-up kit and on-venue artist support.',
    processSteps: [
      'Longevity consultation and trial: record your skin behaviour, outfit palette, ceremony timeline and flash-photography requirements.',
      'Clinical skin prep: enzyme cleanse, hydrating hyaluronic ampoule, barrier balm and Temptu silicone-based airbrush primer.',
      'Airbrush application: compressed Temptu S/B foundation and Kryolan AirGlow pigment sprayed in 3–4 micro-layers with a calibrated PSI for seamless, weightless coverage.',
      'Hand-detailed artistry: MAC and Huda Beauty eye design, brow architecture, cream contour, lip gradation and sealed setting spray.',
      'Couture finishing: Dyson-styled hair, polki/Kundan jewellery fixation, dupatta and veil draping, and lash application.',
      'Quality check and handover: 18-hour wear test under warm and flash lighting, bespoke touch-up kit and an on-call artist for the ceremony window.',
    ],
    benefits: [
      '18+ hour waterproof, tear-proof and humidity-resistant finish',
      'Up to 70% lighter than conventional HD base — no caking or mask-like texture',
      'Pore-blurring, high-definition results for 4K wedding films and flash photography',
      'Hygienic, touch-free spray application ideal for sensitive or breakout-prone skin',
      'Chief Artist, pre-wedding trial and on-venue touch-up support included',
    ],
    idealFor:
      'Oily, combination, mature, textured, acne-prone and sensitive skin; equally suited to brides with visible pores, scarring or uneven tone. Recommended for summer and destination weddings in Jaipur, outdoor mandaps and any celebration involving heat, humidity, tears or long hours under studio lights.',
    productsUsed: [
      'Temptu S/B Airbrush System (USA)',
      'Kryolan AirGlow & Supracolor',
      'MAC Pro Longwear & Prep + Prime',
      'Huda Beauty & Charlotte Tilbury',
      'Dyson Supersonic & Airwrap',
      'Skindinavia / MAC Fix+ sealers',
      'Forest Essentials prep ampoules',
    ],
    priceNote:
      '₹34,999 all-inclusive for the Chief Bridal Artist, airbrush application, trial session, draping, lashes and touch-up kit. A 25% advance reserves the wedding date; venue travel within Jaipur is quoted transparently at booking.',
    highlights: [
      'Genuine Temptu & Kryolan Airbrush',
      '18-Hour Waterproof Wear',
      '240 mins · Oily & Sensitive Skin',
      'Chief Artist + Pre-Wedding Trial',
      '₹34,999 All-Inclusive',
    ],
    popular: true,
    image: '/images/jaipur_royal_bride_1792647664582.jpg',
  },
  {
    id: 'b3',
    title: 'Sangeet & Party Glam Makeup',
    category: 'bridal',
    price: 11999,
    duration: '120 mins',
    description:
      'A high-gloss evening look for sangeet, cocktail, reception and festive soirées, priced at ₹11,999 for 120 minutes. We begin with an express illuminating cleanse and MAC Prep + Prime hydration, then build a luminous dewy base with Charlotte Tilbury and Huda Beauty, add glitter or smokey eye artistry with MAC pigments, and finish with soft waves, a messy braid or a sleek updo using Dyson tools and L’Oréal Professionnel styling. Skin is sealed with a long-wear setting spray so the glow survives dancing, warm lights and endless photographs. The result is glass-skin radiance, defined features and movement-friendly hair that stays put for 10–12 hours. Ideal for normal, combination and dry skin and for all hair textures, including frizz-prone or previously coloured hair. Includes premium Ardell lashes, glitter accents and a mini touch-up kit.',
    processSteps: [
      'Look briefing: review outfit, jewellery, dance-floor lighting and preferred glam level, then map the eye and lip palette.',
      'Express glow prep: gentle cleanse, lightweight hydrating mask, MAC Prep + Prime primer and illuminating base drops.',
      'Dewy base: sheer layers of Charlotte Tilbury Flawless Filter and Huda Beauty #FauxFilter with cream blush and liquid highlight.',
      'Statement eyes: MAC glitter pigments or a soft smokey cut-crease, brow definition, Ardell lashes and a sealed lip colour.',
      'Hair styling: Dyson Airwrap waves, braid or updo with L’Oréal Professionnel heat protectant and Kérastase shine serum.',
      'Final seal and handover: setting spray, glitter fix, flash-photo check and a mini touch-up kit for the evening.',
    ],
    benefits: [
      'Photogenic glass-skin glow without glitter fallout or heavy coverage',
      '10–12 hour dance-proof wear with transfer-resistant lip and eye work',
      'Frizz-controlled, movement-friendly styling for straight, wavy and curly hair',
      'Ready in 120 minutes — ideal for back-to-back wedding functions',
      'Premium lashes, glitter accents and touch-up kit included',
    ],
    idealFor:
      'Normal, dry and combination skin; dull or tired complexions that need instant radiance. Suitable for all hair types, particularly frizz-prone, colour-treated and humidity-affected hair. Designed for bridesmaids, sisters of the bride, reception guests and festive party evenings.',
    productsUsed: [
      'MAC Glitter Pigments & Prep + Prime',
      'Huda Beauty #FauxFilter & palettes',
      'Charlotte Tilbury Flawless Filter',
      'NARS blush & highlighter',
      'Dyson Airwrap & Supersonic',
      'L’Oréal Professionnel & Kérastase',
      'Ardell lashes',
    ],
    priceNote:
      '₹11,999 for makeup, hairstyling, lashes and glitter accents. Draping and hair accessories can be added on request with a confirmed add-on price before your appointment.',
    highlights: [
      'Huda Beauty · MAC Glitter Artistry',
      'Dewy Glass-Skin Glow',
      '120 mins · All Hair Textures',
      'Dyson Waves, Braids or Updo',
      '₹11,999 Fixed Price',
    ],
    image: '/images/home_salon_service_1790676110547.jpg',
  },
  {
    id: 'b4',
    title: '7-Day Complete Pre-Bridal Glow Package',
    category: 'bridal',
    price: 28500,
    duration: '7 Sessions',
    description:
      'A seven-session, head-to-toe bridal countdown priced at ₹28,500, scheduled across the fortnight before your wedding. Session one maps your skin, hair and body concerns with a senior therapist; sessions two to six deliver a 24K Gold Leaf Glow Facial, a full-body herbal Kesar Ubtan de-tan polish, Rica full-body waxing, an Olaplex and Kérastase luxury hair spa, and a spa manicure–pedicure with CND Shellac; the final session is a calming rose petal milk body spa and a patch-test-safe finishing facial timed 48 hours before the big day. The programme evens sun damage, clears congestion, softens rough texture and restores shine without a single aggressive peel, so makeup sits flawlessly. Ideal for all skin types, including sensitive and acne-prone, and for dry, frizzy or colour-treated hair. Includes a personalised home-care calendar and genuine Forest Essentials, Olaplex, Rica and OPI products throughout.',
    processSteps: [
      'Session 1 — Consultation: skin and scalp analysis, patch tests, wedding timeline and a written 7-day glow calendar.',
      'Session 2 — Radiance: 24K Gold Leaf Glow Facial with kesar, sandalwood and ultrasound serum infusion.',
      'Session 3 — De-tan: full-body herbal Kesar Ubtan scrub, multani mitti brightening pack and cooling rose-quartz massage.',
      'Session 4 — Smooth: Rica / chocolate full-body waxing followed by a calming aloe and almond post-wax seal.',
      'Session 5 — Hair revival: Olaplex No.3 bond repair, Kérastase masque, scalp massage and a warm steam therapy.',
      'Session 6 — Hands & feet: spa manicure and pedicure with CND Shellac, cuticle care and paraffin hydration.',
      'Session 7 — Final glow: rose petal and milk body spa, gentle finishing facial 48 hours before the ceremony, plus home-care kit.',
    ],
    benefits: [
      'Visibly brighter, even-toned skin with reduced tan, pigmentation and dullness',
      'Smooth, hydrated skin that lets bridal base makeup blend seamlessly',
      'Stronger, frizz-free, mirror-shine hair before elaborate wedding styling',
      'Zero harsh peels or last-minute experiments — all patch-tested for sensitive skin',
      'One dedicated therapist, one calendar, one transparent package price',
    ],
    idealFor:
      'Every bride-to-be: normal, dry, oily, combination, sensitive and acne-prone skin, plus dry, frizzy, chemically treated or colour-treated hair. Especially valuable for Jaipur brides with sun tan from outdoor festivities and for destination weddings requiring a predictable, camera-ready glow.',
    productsUsed: [
      '24K gold leaf & Forest Essentials kesar ubtan',
      'Olaplex No.3 & No.7 Bond Oil',
      'Kérastase Nutritive & Elixir Ultime',
      'Rica / Chocolate wax',
      'CND Shellac & OPI',
      'L’Oréal Professionnel hair masks',
      'Rose quartz & cold-pressed almond oil',
    ],
    priceNote:
      '₹28,500 for all 7 sessions and the home-care calendar — a saving against booking each ritual individually. Sessions can be spread across 14 days; a 25% advance locks your preferred pre-wedding dates.',
    highlights: [
      '7 Sessions · 24K Gold & Ubtan',
      'Olaplex · Kérastase · Rica Wax',
      'Patch-Tested for Sensitive Skin',
      '14-Day Bridal Countdown Plan',
      '₹28,500 Complete Programme',
    ],
    image: '/images/prebridal_spa_ritual_1790676123541.jpg',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HAIR TREATMENTS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'h1',
    title: 'Moroccan Nanoplastia & Hair Botox Treatment',
    category: 'hair',
    price: 6999,
    duration: '180 mins',
    description:
      'A 100% formaldehyde-free, amino-acid smoothing ritual priced at ₹6,999 for 180 minutes. After a microscopic scalp and strand analysis we cleanse with an Olaplex-compatible clarifying shampoo, apply a Moroccan argan, collagen and keratin nanoplastia complex section by section, allow it to process under controlled steam, then seal each strand with a temperature-calibrated flat iron and finish with a Kérastase gloss and Dyson blow-dry. The treatment rebuilds the internal lipid layer rather than breaking hair bonds, so curls are softened, not destroyed, and colour stays vibrant. Expect mirror-shine, humidity-proof, frizz-free hair for 5–6 months with a 60% reduction in daily styling time. Ideal for dry, frizzy, coarse, porous, colour-treated, highlighted or hard-water damaged hair, and safe for sensitive scalps. Includes a complimentary patch test, split-end trim and a written sulphate-free after-care plan with Olaplex and L’Oréal Professionnel home products.',
    processSteps: [
      'Strand and scalp diagnosis: assess porosity, previous colour, breakage and hard-water mineral build-up; perform a 24-hour patch test.',
      'Clarifying ritual wash: a double cleanse with L’Oréal Professionnel Metal Detox / clarifying shampoo to open the cuticle evenly.',
      'Bond protection: Olaplex No.1 or No.3 applied to compromised lengths before any smoothing product touches the hair.',
      'Nanoplastia infusion: section-by-section application of formaldehyde-free Moroccan argan, collagen, amino-acid and keratin complex, combed for even saturation.',
      'Steam and seal: 20–30 minutes of controlled warm steam, a light rinse, then temperature-calibrated flat-iron sealing at 180–210°C based on hair density.',
      'Gloss finish: Kérastase Elixir Ultime serum, precision split-end trim, Dyson Supersonic blow-dry and a personalised after-care card.',
    ],
    benefits: [
      'Up to 95% frizz reduction with a mirror-shine silk finish for 5–6 months',
      'Formaldehyde-free, fumes-free and safe on coloured or highlighted hair',
      'Repairs porosity and split ends instead of merely coating the shaft',
      'Cuts daily blow-drying and straightening time by more than half',
      'Patch test, split-end trim and written home-care guide included',
    ],
    idealFor:
      'Frizzy, dry, coarse, wavy, curly, porous, colour-treated, bleached and chemically damaged hair; also excellent for Jaipur hard-water roughness and humidity-induced puffiness. Suitable for sensitive scalps and for clients who want smoothness without permanent straightening.',
    productsUsed: [
      'GK Hair / Floractive Nanoplastia complex',
      'MoroccanOil argan oil',
      'Olaplex No.1, No.3 & No.7',
      'L’Oréal Professionnel Metal Detox',
      'Kérastase Elixir Ultime',
      'Dyson Supersonic & Corrale styler',
    ],
    priceNote:
      '₹6,999 for shoulder-length hair, inclusive of patch test, bond protection, split-end trim and blow-dry. Length beyond waist or extremely dense hair is quoted before the service begins; no hidden charges.',
    highlights: [
      '100% Formaldehyde-Free',
      'Olaplex · GK Hair · MoroccanOil',
      '180 mins · 5–6 Months Shine',
      'Colour-Safe, Frizzy & Damaged Hair',
      '₹6,999 with Free After-Care',
    ],
    popular: true,
    image: '/images/luxury_hair_nanoplastia_1792647835332.jpg',
  },
  {
    id: 'h2',
    title: 'French Balayage & Ombre Hair Color',
    category: 'hair',
    price: 7499,
    duration: '240 mins',
    description:
      'Hand-painted, sun-kissed French balayage priced at ₹7,499 for 240 minutes. Your colourist begins with a strand test, face-shape consultation and a personalised tone map, protects the lengths with Olaplex Bond Builder, then freehand-paints L’Oréal Professionnel Blond Studio lightener through selected ribbons — never foils — for a seamless, grow-out-friendly gradient. A bespoke gloss toner neutralises brass, followed by a Kérastase bond masque and a Dyson blow-dry that reveals the dimension. Expect soft caramel, honey or ash ribbons tailored to Indian skin tones, with no harsh regrowth line and no compromise to hair integrity. Ideal for virgin, previously coloured, fine, thick, wavy and straight hair; a patch test makes it suitable for sensitive scalps too. Includes Olaplex protection, custom toner, wash, blow-dry and a sulphate-free home-care prescription.',
    processSteps: [
      'Colour consultation: analyse natural level, previous colour history, undertone, face shape and lifestyle; agree the ribbon placement and target tone.',
      'Strand and patch test: check elasticity and porosity, then record the safe lift level before any lightener is mixed.',
      'Bond protection: Olaplex No.1 mixed into the lightener and No.2 applied post-rinse to preserve internal disulphide bonds.',
      'Freehand painting: L’Oréal Professionnel Blond Studio applied in hand-painted ribbons with graduated saturation for a natural root shadow.',
      'Gloss and tone: bespoke acidic toner to cancel brass, followed by Kérastase Chroma Absolu masque and a cool rinse.',
      'Reveal and after-care: Dyson Supersonic blow-dry, styling, flash-photo check and a written colour-maintenance plan.',
    ],
    benefits: [
      'Soft, natural dimension with no visible regrowth line — maintenance only every 3–4 months',
      'Olaplex-protected lightening with measurably less breakage and dryness',
      'Bespoke caramel, honey, beige and ash tones curated for Indian complexions',
      'Custom gloss toner delivers mirror shine and eliminates brassiness',
      'Includes strand test, wash, Dyson blow-dry and home-care plan',
    ],
    idealFor:
      'Virgin, previously coloured, fine, medium, thick, straight and wavy hair looking for low-maintenance dimension. Suitable for sensitive scalps after patch testing; recommended for clients who want brightness without all-over bleach or a high-contrast root line.',
    productsUsed: [
      'L’Oréal Professionnel Blond Studio',
      'Olaplex No.1, No.2 & No.3',
      'Kérastase Chroma Absolu',
      'Wella / Majirel gloss toners',
      'Dyson Supersonic',
      'Mise en scène colour-safe care',
    ],
    priceNote:
      '₹7,499 for mid-length hair including Olaplex, toner, wash and blow-dry. Extra-long hair, major colour correction or pre-existing box dye is quoted after the strand test — always before work begins.',
    highlights: [
      'Hand-Painted French Balayage',
      'Olaplex & L’Oréal Professionnel',
      '240 mins · No Regrowth Line',
      'All Hair Types, Patch-Tested',
      '₹7,499 with Toner & Blowdry',
    ],
    image: '/images/hair_styling_luxe_1790672021591.jpg',
  },
  {
    id: 'h3',
    title: 'Brazilian Keratin Hair Smoothening',
    category: 'hair',
    price: 5499,
    duration: '150 mins',
    description:
      'A restorative Brazilian protein ritual priced at ₹5,499 for 150 minutes. We start with a scalp and porosity assessment and a clarifying L’Oréal Professionnel wash, then infuse a low-fume, formaldehyde-free GK Hair keratin complex enriched with argan oil and amino acids strand by strand. Controlled steam drives the protein into the cortex before a calibrated iron seal, a Kérastase deep-conditioning masque and a Dyson silk finish. Unlike conventional straightening, this treatment softens the curl pattern while retaining natural movement and body, delivering 3–4 months of manageable, glossy, comb-able hair with heat and humidity protection. Ideal for unmanageable, frizzy, coarse, dry, hard-water damaged and mildly chemically treated hair. Includes a complimentary split-end haircut, patch test, heat-protectant application and a sulphate-free after-care guide.',
    processSteps: [
      'Assessment: scalp check, porosity and elasticity test, plus a documented 24-hour patch test.',
      'Clarifying cleanse: two rounds of L’Oréal Professionnel clarifying shampoo to remove minerals, silicones and product build-up.',
      'Keratin infusion: GK Hair / Brazilian Blowout protein complex with argan oil combed through fine sections from root to tip.',
      'Steam processing: 20 minutes of gentle warm steam to open the cuticle, followed by a controlled 50% rinse.',
      'Thermal sealing: section-by-section flat-iron passes at a temperature matched to hair density, then Kérastase Nutritive masque.',
      'Finish: precision split-end trim, Olaplex No.7 bond oil, Dyson blow-dry and a written 72-hour after-care plan.',
    ],
    benefits: [
      '3–4 months of smooth, frizz-resistant, easy-to-comb hair',
      'Protein rebuilds weak areas while natural volume and movement remain',
      'Heat and humidity shield — especially effective in Jaipur summers',
      'Noticeable mirror shine and softer ends from the first wash',
      'Low-fume, formaldehyde-free formula with patch test and trim included',
    ],
    idealFor:
      'Frizzy, coarse, dry, unmanageable, porous, hard-water damaged and lightly chemically treated hair of any length. Suitable for wavy and loose-curl patterns that need discipline rather than pin-straight results; patch testing recommended for sensitive scalps.',
    productsUsed: [
      'GK Hair Brazilian Keratin',
      'Brazilian Blowout smoothing complex',
      'MoroccanOil argan infusion',
      'L’Oréal Professionnel clarifier',
      'Kérastase Nutritive Masque Magistral',
      'Olaplex No.7 Bonding Oil',
      'Dyson Supersonic',
    ],
    priceNote:
      '₹5,499 inclusive of patch test, clarifying wash, split-end trim and blow-dry. Waist-length or very dense hair carries a pre-approved length supplement quoted at consultation.',
    highlights: [
      'Formaldehyde-Free Brazilian Keratin',
      'GK Hair · Kérastase · Olaplex',
      '150 mins · 3–4 Months Smooth',
      'Frizzy, Coarse & Hard-Water Hair',
      '₹5,499 with Free Trim',
    ],
    image: '/images/hair_styling_luxe_1790672021591.jpg',
  },
  {
    id: 'h4',
    title: 'Professional Haircut, Wash & Blowdry',
    category: 'hair',
    price: 1499,
    duration: '45 mins',
    description:
      'A precision 45-minute salon ritual priced at ₹1,499. Your stylist begins with a face-shape, density and lifestyle consultation, then performs a relaxing Kérastase shampoo and scalp massage, followed by a sectioned, scissors-or-razor cut tailored to your growth pattern and cowlicks. Olaplex No.6 and L’Oréal Professionnel heat protectant are worked through the lengths before a Dyson Supersonic blowout with a round-brush finish, and Kérastase Elixir Ultime seals the shine. The result is a shape that grows out beautifully, bouncy volume, frizz control and a polished finish that lasts 3–4 days. Ideal for every hair type — fine, thick, straight, wavy, curly, colour-treated and chemically smoothed — and for clients who want expert advice without a chemical service. Includes a complimentary consultation and a personalised styling recommendation.',
    processSteps: [
      'Consultation: discuss face shape, hair density, growth pattern, maintenance routine and the look you want to achieve.',
      'Relaxing cleanse: Kérastase prescription shampoo, 3-minute scalp massage and a lightweight conditioner on the mid-lengths.',
      'Precision cut: sectioning and scissor or razor work on damp hair, followed by a dry check for balance and fall.',
      'Protection: Olaplex No.6 Bond Smoother and L’Oréal Professionnel heat protectant applied before any hot tool.',
      'Bouncy blowout: Dyson Supersonic with round-brush tension, root lift and a cool-shot set for lasting shape.',
      'Finish: Kérastase Elixir Ultime shine serum, styling advice and a recommended 6–8 week maintenance interval.',
    ],
    benefits: [
      'A bespoke shape that flatters your face and grows out evenly',
      'Relaxing scalp massage and a genuinely restorative wash',
      'Bouncy, frizz-controlled blowout that lasts 3–4 days',
      'Bond-protecting, heat-shielding products on every strand',
      'Honest, no-pressure consultation with a senior stylist',
    ],
    idealFor:
      'All hair types and textures — fine, thick, straight, wavy, curly, colour-treated, keratin-treated and nanoplastia-treated hair. Ideal for a quick refresh before a meeting, celebration or wedding function, and for anyone maintaining an existing chemical treatment.',
    productsUsed: [
      'Kérastase prescription shampoo & Elixir Ultime',
      'Olaplex No.6 Bond Smoother',
      'L’Oréal Professionnel heat protectant',
      'Dyson Supersonic',
      'Professional Japanese scissors & razor',
    ],
    priceNote:
      '₹1,499 fixed price for consultation, wash, cut and blow-dry. Premium add-on masks or scalp therapies are always quoted and approved before application.',
    highlights: [
      'Face-Shape Consultation',
      'Kérastase · Olaplex · Dyson',
      '45 mins · All Hair Types',
      'Bouncy 3–4 Day Blowout',
      '₹1,499 Fixed Price',
    ],
    image: '/images/hair_styling_luxe_1790672021591.jpg',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SKIN & LUXURY FACIALS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 's1',
    title: '24K Gold Leaf Glow Facial',
    category: 'skin',
    price: 3299,
    duration: '90 mins',
    description:
      'Our signature 90-minute radiance ritual, priced at ₹3,299. After a therapist-led skin analysis we double-cleanse with Forest Essentials, gently exfoliate with a kesar and sandalwood scrub, and steam with a rose hydrosol. Real edible-grade 24K gold leaf is then pressed over a hyaluronic and collagen serum while a 1 MHz ultrasound probe drives the actives deep into the skin; a chilled rose-quartz and ice-globe massage follows to calm, lift and de-puff. A gold-infused alginate mask and a vitamin-C seal complete the treatment. Expect an immediate bridal luminescence, firmer contours, improved microcirculation and a visible softening of fine lines with zero downtime. Ideal for dull, tired, dry, mature, pigmented and pre-bridal skin, and gentle enough for sensitive complexions. Includes genuine 24K gold leaf, pure Kashmiri kesar, sandalwood and a personalised home-glow plan.',
    processSteps: [
      'Skin mapping: analyse hydration, pigmentation, pore congestion and sensitivity under magnified light; select serum strength.',
      'Double cleanse and exfoliation: Forest Essentials milk cleanser, kesar–sandalwood polish and a warm rose-hydrosol steam.',
      'Gold leaf application: genuine 24K gold sheets layered over hyaluronic acid, collagen and vitamin-C ampoules.',
      'Ultrasound infusion: 1 MHz sonophoresis in upward strokes to drive actives into the deeper epidermis without needle or heat.',
      'Sculpting massage: chilled rose-quartz rollers and ice globes with almond and sandalwood cream for lymphatic drainage.',
      'Mask and seal: 24K gold alginate mask, cooling compress, broad-spectrum SPF and a written 7-day home-glow plan.',
    ],
    benefits: [
      'Instant, camera-ready bridal glow with visibly plumper, hydrated skin',
      'Firmer jawline and reduced puffiness from ultrasound and ice-globe lymphatic work',
      'Softens fine lines, dullness and uneven tone over a course of sessions',
      'Anti-inflammatory gold and sandalwood calm redness and post-travel fatigue',
      'Zero downtime — safe 48 hours before a wedding or photoshoot',
    ],
    idealFor:
      'Dull, dehydrated, dry, mature, pigmented, tired and pre-bridal skin; also suitable for sensitive and redness-prone complexions thanks to its non-abrasive, acid-free protocol. Not recommended during active cystic breakouts or immediately after strong clinical peels.',
    productsUsed: [
      'Genuine 24K edible-grade gold leaf',
      'Forest Essentials Kashmiri kesar & sandalwood',
      'Clinical hyaluronic acid & collagen ampoules',
      'Rose quartz rollers & ice globes',
      '1 MHz ultrasound infusion device',
      'Vitamin-C & SPF finishing care',
    ],
    priceNote:
      '₹3,299 for the complete 90-minute protocol including real 24K gold leaf, ultrasound infusion and SPF finish. Course pricing for 3 or 6 pre-bridal sessions is available at the front desk.',
    highlights: [
      'Real 24K Gold Leaf & Kesar',
      'Ultrasound + Rose Quartz Lift',
      '90 mins · Dull, Dry & Mature Skin',
      'Instant Bridal Glow, Zero Downtime',
      '₹3,299 All-Inclusive',
    ],
    popular: true,
    image: '/images/skin_spa_treatment_1790672037475.jpg',
  },
  {
    id: 's2',
    title: 'Hydra-Facial Deep Clean & Glow',
    category: 'skin',
    price: 5999,
    duration: '75 mins',
    description:
      'A clinical yet indulgent 7-step HydraFacial MD protocol priced at ₹5,999 for 75 minutes. We begin with a magnified skin assessment and a gentle double cleanse, then use the patented vortex handpiece for cleanse + peel, a glycolic/salicylic resurfacing pass, painless vacuum blackhead extraction and an oxygen-jet hydration rinse. A hyaluronic, peptide and antioxidant serum is infused under LED red light, followed by cooling ice globes, an alginate mask and broad-spectrum SPF. The result is visibly decongested pores, refined texture, balanced oil and deep, glass-like hydration with absolutely no downtime. Ideal for oily, acne-prone, congested, combination and dull skin, and safe for sensitive complexions with a customised acid strength. Includes genuine single-use HydraFacial tips opened in front of you, clinical hyaluronic serum, LED therapy and a personalised skin-care prescription.',
    processSteps: [
      'Skin analysis: magnified pore, sebum and hydration mapping to set suction level, acid strength and serum choice.',
      'Step 1–2 — Cleanse + peel: gentle milk cleanse followed by a vortex-driven glycolic/salicylic resurfacing pass.',
      'Step 3 — Extraction: painless vacuum suction clears blackheads, whiteheads and sebum plugs from the T-zone.',
      'Step 4 — Oxygen jet and hydration: pressurised oxygen mist and hyaluronic acid infusion calm and re-plump the skin.',
      'Step 5 — LED therapy: red or blue LED for 10 minutes to reduce inflammation, bacteria and post-extraction redness.',
      'Step 6–7 — Serum, mask and seal: peptide antioxidant cocktail, ice-globe massage, cooling alginate mask and SPF 50.',
    ],
    benefits: [
      'Visible blackhead and congestion clearance in a single painless session',
      'Deep hyaluronic hydration for plumper, glass-like skin',
      'Refined pores, balanced sebum and a measurably smoother texture',
      'LED and ice-globe therapy minimise redness with zero downtime',
      'Single-use genuine HydraFacial tips, opened in front of every client',
    ],
    idealFor:
      'Oily, combination, acne-prone, congested, blackhead-prone, dull and mildly pigmented skin. Acid strength is customised for sensitive and rosacea-prone complexions. Ideal 5–7 days before a wedding or event; not performed during active cystic acne flare-ups.',
    productsUsed: [
      'Genuine HydraFacial MD vortex tips',
      'Clinical hyaluronic acid & peptide serums',
      'Glycolic / salicylic resurfacing solutions',
      'Medical-grade LED red & blue light',
      'Antioxidant vitamin-C cocktail',
      'Ice globes & SPF 50 finish',
    ],
    priceNote:
      '₹5,999 for the complete 7-step protocol with genuine single-use tips, LED therapy and SPF. Booster serums are optional and quoted before the treatment starts.',
    highlights: [
      '7-Step Genuine HydraFacial MD',
      'Painless Blackhead Extraction',
      '75 mins · Oily & Congested Skin',
      'LED Light + Ice Globe Therapy',
      '₹5,999 Zero-Downtime Glow',
    ],
    popular: true,
    image: '/images/skin_spa_treatment_1790672037475.jpg',
  },
  {
    id: 's3',
    title: 'Ayurvedic Kesar & Ubtan De-Tan Facial',
    category: 'skin',
    price: 3299,
    duration: '60 mins',
    description:
      'A heritage Rajasthani de-tan ritual priced at ₹3,299 for 60 minutes, built entirely on fresh, kitchen-grade Ayurvedic actives. Your therapist begins with a skin and tan assessment, a Forest Essentials milk cleanse and a warm rose steam, then massages a freshly blended ubtan of wild turmeric, Kashmiri kesar, gram flour, almond paste, sandalwood and raw honey in upward strokes. A multani mitti and rose-water brightening pack draws out impurities, followed by chilled rose-quartz rolling, an aloe cooling gel and SPF. Expect a visibly lighter, more even tone, softened sun damage, calmed inflammation and a natural, non-greasy luminosity — with no bleach, no acid peel and no downtime. Ideal for tanned, pigmented, dull, sun-exposed and sensitive skin, and for brides who prefer a fully herbal pre-wedding regime. Includes pure kesar, wild haldi and a customised home ubtan recipe.',
    processSteps: [
      'Consultation: map tan depth, pigmentation, sensitivity and recent sun exposure under magnified light.',
      'Cleanse and steam: Forest Essentials milk cleanser, gentle rose-water toning and 5 minutes of warm herbal steam.',
      'Fresh ubtan blend: wild turmeric, Kashmiri saffron, gram flour, almond paste, sandalwood, rose petals and raw honey mixed to order.',
      'Ayurvedic massage: 15 minutes of upward, circulation-stimulating strokes to lift dead cells and soften tan.',
      'Brightening pack: multani mitti, rose water and aloe vera applied for 10 minutes, removed with a cool compress.',
      'Cooling seal: chilled rose-quartz rollers, aloe gel, light almond moisturiser, SPF and a take-home ubtan recipe.',
    ],
    benefits: [
      'Visibly reduces sun tan, dullness and uneven pigmentation without bleach',
      '100% herbal, freshly prepared actives — gentle on reactive skin',
      'Improves microcirculation and leaves skin soft, calm and naturally luminous',
      'Zero downtime, safe as a weekly pre-bridal ritual',
      'Includes a personalised home ubtan recipe for maintenance',
    ],
    idealFor:
      'Sun-tanned, pigmented, dull, uneven and sensitive skin; ideal for clients exposed to Jaipur sun, outdoor festivities or destination-wedding photoshoots. Recommended for brides avoiding acids, bleaches and clinical peels before the ceremony.',
    productsUsed: [
      'Kashmiri kesar (saffron)',
      'Wild turmeric (haldi) & gram flour',
      'Forest Essentials sandalwood & rose water',
      'Cold-pressed almond paste & raw honey',
      'Multani mitti & aloe vera gel',
      'Rose quartz rollers',
    ],
    priceNote:
      '₹3,299 for the complete 60-minute herbal protocol with fresh ubtan prepared for your skin. A 3-session de-tan course can be booked at a published package price from the front desk.',
    highlights: [
      '100% Herbal Fresh Ubtan',
      'Pure Kesar, Haldi & Sandalwood',
      '60 mins · Tanned & Sensitive Skin',
      'Bleach-Free, Zero Downtime',
      '₹3,299 with Home Recipe',
    ],
    image: '/images/prebridal_spa_ritual_1790676123541.jpg',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NAIL ART & RUSSIAN MANICURE EXTENSIONS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'n1',
    title: 'Bridal Gel Nail Extensions with Nail Art',
    category: 'nails',
    price: 3499,
    duration: '90 mins',
    description:
      'Couture bridal nails priced at ₹3,499 for 90 minutes. Your nail artist starts with a nail-health and shape consultation, then performs a meticulous dry Russian e-file prep, cuticle work and dehydration before fitting and sculpting lightweight gel extensions with CND and OPI systems. A hand-painted design follows — French ombré, chrome, glitter fade, real Swarovski crystals or 24K gold foil — sealed under a high-gloss, chip-resistant top coat cured in a medical-grade LED lamp. Expect flawless, symmetrical, photo-ready nails that stay strong for 4 weeks through mehndi, rituals and travel. Ideal for short, bitten, brittle, weak and uneven nails as well as healthy natural nails; every tool is UV-sterilised and every product is a sealed, genuine professional brand. Includes cuticle care, shaping, art of your choice, cuticle oil and a gentle removal guide.',
    processSteps: [
      'Consultation: assess nail health, length, shape and your lehenga or jewellery palette; agree the art design on a practice tip.',
      'Dry Russian prep: sterile e-file cuticle work, pterygium removal, surface buff, dehydrator and acid-free primer — no soaking.',
      'Extension build: tips or sculpting forms fitted, then CND / OPI builder gel applied in thin, apex-balanced layers and LED-cured.',
      'Artistry: hand-painted French ombré, chrome powder, glitter, genuine Swarovski stones or 24K gold foil placed with precision tweezers.',
      'Seal and refine: high-gloss non-yellowing top coat, sidewall filing, cuticle oil and a symmetry check under photo lighting.',
      'Handover: 4-week wear and after-care card, plus safe removal guidance to protect the natural nail.',
    ],
    benefits: [
      'Chip-proof, salon-perfect nails for 4 weeks including mehndi and honeymoon travel',
      'Adds elegant length and symmetry to short, bitten or brittle nails',
      'Fully customisable bridal art matched to your outfit and jewellery',
      'Dry Russian e-file technique means zero water-lifting and longer retention',
      'UV-sterilised tools and sealed, authentic professional gels only',
    ],
    idealFor:
      'Short, bitten, brittle, peeling, ridged or uneven nails and anyone wanting extra length for wedding photographs. Suitable for all nail types, including sensitive cuticles; gel allergies are screened at consultation and a non-gel alternative is offered.',
    productsUsed: [
      'CND Shellac & Brisa builder gel',
      'OPI GelColor & Powder Perfection',
      'Genuine Swarovski crystals',
      '24K gold foil & chrome pigments',
      'Russian e-file (Medicool / MelodySusie bits)',
      'Medical-grade LED lamp & cuticle oil',
    ],
    priceNote:
      '₹3,499 includes shaping, gel extensions, cuticle care and one bespoke art design. Extra 3D charms or hand-painted portrait art are quoted as add-ons before application.',
    highlights: [
      'CND · OPI · Swarovski · 24K Foil',
      'Dry Russian E-File Prep',
      '90 mins · Brittle & Short Nails',
      '4-Week Chip-Proof Wear',
      '₹3,499 with Custom Art',
    ],
    popular: true,
    image: '/images/bridal_nail_art_1792647953738.jpg',
  },
  {
    id: 'n2',
    title: 'Russian Manicure & Warm Hand Spa',
    category: 'nails',
    price: 1899,
    duration: '60 mins',
    description:
      'A precision dry-manicure and hand-ritual priced at ₹1,899 for 60 minutes. Without any water soak, your artist uses a sterile Russian e-file and diamond bits to remove pterygium and dead cuticle tissue with millimetre accuracy, then shapes, buffs and dehydrates the plate before applying CND Shellac or OPI GelColor in flawlessly thin, LED-cured coats. Hands are then immersed in a warm paraffin wax bath, followed by a 10-minute almond-oil massage and a cooling rose lotion finish. The result is immaculately clean cuticles, a glass-smooth polish line that lasts 2–3 weeks, and baby-soft, deeply hydrated hands. Ideal for dry, rough or overgrown cuticles, brittle nails, hard-water dryness and anyone who wants a flawless polish edge. Includes gel polish of your choice, cuticle oil and a hand-care prescription.',
    processSteps: [
      'Nail assessment: check plate health, cuticle condition and any sensitivity; sterilise all bits and tools in front of you.',
      'Dry Russian e-file prep: flame and ball diamond bits lift and remove cuticle tissue and pterygium without soaking.',
      'Shape and refine: precision file to your chosen silhouette, gentle buff, dehydrator and acid-free primer.',
      'Gel colour: two thin CND Shellac or OPI GelColor coats with sealed free edges, each LED-cured for lasting gloss.',
      'Warm paraffin spa: paraffin wax dip, warm mitts for 10 minutes, then an almond-oil and rose hand-and-forearm massage.',
      'Finish: high-gloss top coat, cuticle oil, cooling lotion and a personalised hand-care plan.',
    ],
    benefits: [
      'Immaculate, razor-clean cuticle line that makes polish look professionally airbrushed',
      '2–3 weeks of chip-free, high-gloss gel wear',
      'Paraffin and almond oil relieve dryness, roughness and hard-water damage',
      'Dry technique reduces lifting and is gentler on the nail plate',
      'Fully UV-sterilised tools and sealed, genuine CND / OPI products',
    ],
    idealFor:
      'Dry, overgrown or ragged cuticles, brittle and peeling nails, rough working hands, and anyone preparing for mehndi, ring ceremonies or close-up photography. Suitable for sensitive skin; gel sensitivity is screened before application.',
    productsUsed: [
      'CND Shellac & SolarOil',
      'OPI GelColor & ProSpa',
      'Russian diamond e-file bits',
      'Medical-grade paraffin wax',
      'Cold-pressed almond & rose oils',
      'Medical-grade LED lamp',
    ],
    priceNote:
      '₹1,899 includes dry Russian prep, gel polish of choice, paraffin spa and massage. French finish or nail art is available as a pre-quoted add-on.',
    highlights: [
      'Dry Russian E-File Manicure',
      'CND Shellac · OPI · Paraffin',
      '60 mins · Dry & Brittle Nails',
      '2–3 Week Chip-Free Gloss',
      '₹1,899 with Hand Massage',
    ],
    image: '/images/nail_art_luxe_1790676094903.jpg',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BODY SPAS & RITUALS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'sp1',
    title: 'Rose Petal & Milk Bath Body Spa',
    category: 'spa',
    price: 3999,
    duration: '90 mins',
    description:
      'A 90-minute restorative body ritual priced at ₹3,999. Your therapist begins with a wellness consultation and a choice of bespoke essential-oil blend, then guides you into a private warm organic-milk and fresh rose-petal soak to soften the skin and settle the nervous system. A full-body Swedish and lymphatic drainage massage follows using warm cold-pressed almond oil, followed by a gentle rose-and-almond exfoliation, a 15-minute aromatic steam, a hydrating body wrap and a cooling scalp-and-foot reflexology finish. Expect deeply relaxed muscles, silky, hydrated skin, better sleep and a luminous pre-wedding calm with no harsh actives. Ideal for all skin types, including dry and sensitive, and for fatigue, travel stiffness and pre-bridal stress. Includes fresh rose petals, Forest Essentials oils, private spa suite, steam and a herbal tea service.',
    processSteps: [
      'Wellness consultation: discuss pressure preference, allergies, fatigue points and choose your aromatherapy blend.',
      'Rose and milk soak: 15 minutes in a warm organic-milk bath with fresh rose petals and rose hydrosol.',
      'Exfoliation: gentle rose, almond and oat polish in long strokes to remove dull surface cells.',
      'Full-body massage: 40 minutes of Swedish and lymphatic techniques with warm cold-pressed almond and Forest Essentials oils.',
      'Steam and wrap: 15 minutes of aromatic steam followed by a hydrating milk-and-honey body wrap and a warm towel ritual.',
      'Finish: scalp and foot reflexology, cooling rose lotion, herbal tea and a quiet 10-minute rest in your private suite.',
    ],
    benefits: [
      'Deep muscular relaxation and measurably lower pre-wedding stress',
      'Silky, intensively hydrated skin with a natural rose-scented glow',
      'Lymphatic drainage reduces puffiness and travel-related water retention',
      'Improves sleep quality and restores energy before long celebration days',
      'Private suite, fresh petals, steam and herbal tea included',
    ],
    idealFor:
      'All skin types, especially dry, dehydrated, tired and sensitive skin. Recommended for brides, frequent travellers, and anyone with muscle fatigue, poor sleep or pre-event tension. Pressure and oils are customised for prenatal and aromatherapy-sensitive guests on request.',
    productsUsed: [
      'Fresh organic rose petals & hydrosol',
      'Forest Essentials almond & rose oils',
      'Cold-pressed sweet almond oil',
      'Organic milk & raw honey wrap',
      'Therapeutic-grade lavender / rose essential oils',
      'Aromatic steam & herbal tea service',
    ],
    priceNote:
      '₹3,999 for 90 minutes in a private spa suite, including milk bath, full-body massage, steam, wrap and tea. Couples and pre-bridal multi-session pricing is published at the front desk.',
    highlights: [
      'Fresh Rose & Organic Milk Bath',
      'Forest Essentials Almond Oils',
      '90 mins · All Skin Types',
      'Lymphatic Massage + Steam',
      '₹3,999 Private Suite Ritual',
    ],
    image: '/images/prebridal_spa_ritual_1790676123541.jpg',
  },
  {
    id: 'sp2',
    title: 'Herbal Full Body Scrub & Polish',
    category: 'spa',
    price: 4499,
    duration: '80 mins',
    description:
      'An 80-minute resurfacing and brightening ritual priced at ₹4,499. After a skin assessment, your therapist dry-brushes the body to stimulate circulation, then works a custom-blended scrub of Dead Sea mineral salts, walnut shell, multani mitti, wild turmeric and kesar across the skin in long, even strokes. A warm steam opens the pores before a mineral-rich herbal clay and rose pack is applied to draw out impurities, followed by a cool rinse, a 20-minute almond and shea massage, and a vitamin-E moisture seal. Expect visibly smoother texture, reduced tan and ingrown hairs, even tone and satin-soft skin that photographs beautifully. Ideal for dull, tanned, rough, dry and congested body skin, and gentle enough for sensitive skin with a mild scrub blend. Includes genuine mineral salts, Forest Essentials herbs, steam and a home-moisturising plan.',
    processSteps: [
      'Skin mapping: identify tan, roughness, dryness and congestion; select scrub grain intensity and clay blend.',
      'Dry brushing: 5 minutes of lymph-direction brushing with a natural bristle brush to wake up circulation.',
      'Mineral exfoliation: Dead Sea salts, walnut shell, multani mitti, haldi and kesar massaged from feet to shoulders.',
      'Warm steam: 10 minutes of herbal steam to soften the skin and prepare it for the clay pack.',
      'Herbal clay mask: multani mitti, rose and sandalwood pack applied for 12 minutes, removed with cool compresses.',
      'Hydration seal: 20-minute almond-and-shea massage, vitamin-E body lotion, SPF on exposed areas and a home-care plan.',
    ],
    benefits: [
      'Instantly smoother, satin-soft skin with a visible reduction in tan',
      'Unclogs pores and helps prevent ingrown hairs before waxing or mehndi',
      'Evens body tone on arms, back and shoulders for bridal photography',
      'Deep almond and shea hydration that lasts for days',
      'Customisable scrub strength for sensitive or reactive skin',
    ],
    idealFor:
      'Dull, tanned, rough, flaky, dry or congested body skin, and clients preparing for a lehenga, sleeveless outfit, mehndi or pre-wedding photoshoot. A gentler grain is used for sensitive skin; not recommended on sunburn or active eczema.',
    productsUsed: [
      'Dead Sea mineral salts',
      'Multani mitti & wild turmeric',
      'Kashmiri kesar & sandalwood',
      'Forest Essentials herbal clays',
      'Cold-pressed almond oil & shea butter',
      'Vitamin-E body lotion & SPF',
    ],
    priceNote:
      '₹4,499 for the complete 80-minute scrub, clay pack, steam and massage. Recommended 5–7 days before waxing or a bridal event; exact timing is advised at consultation.',
    highlights: [
      'Dead Sea Salt + Herbal Clay',
      'Kesar, Haldi & Forest Essentials',
      '80 mins · Tanned & Rough Skin',
      'Steam + Almond Moisture Seal',
      '₹4,499 Full-Body Polish',
    ],
    image: '/images/prebridal_spa_ritual_1790676123541.jpg',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ACADEMY CERTIFICATION COURSES
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'a1',
    title: '30-Day Professional Bridal Makeup Course',
    category: 'academy',
    price: 45000,
    duration: '30 Days (Daily)',
    description:
      'A 30-day, 120-hour certified bridal artistry diploma priced at ₹45,000, taught in small batches by senior working artists. Week one covers skin science, hygiene, colour theory, face and eye mapping and product literacy with a professional MAC, Huda Beauty, Charlotte Tilbury and Temptu vanity kit. Week two builds core technique — HD base, correction, cut-crease and smokey eyes, brows, contour, lips and airbrush handling. Week three is devoted to regional bridal looks, Kundan jewellery setting, dupatta draping and Dyson hair styling on live models. Week four covers client consultation, quoting, portfolio shoots, social-media branding and freelancing, ending in a practical and written assessment, an ISO/Government-recognised certificate and a professional portfolio shoot. Ideal for beginners, beauticians, salon professionals and aspiring freelance bridal artists. Includes a full professional kit, live-model practice, study material, certification and placement support.',
    processSteps: [
      'Week 1 — Foundations: sanitisation, skin types and disorders, colour theory, undertone mapping, brush hygiene and product decoding.',
      'Week 2 — Core artistry: primers, HD and airbrush base, colour correction, concealing, eye shapes, liner, brows, contour and long-wear lip work.',
      'Week 3 — Bridal specialisation: North Indian, Rajasthani, South Indian and contemporary reception looks, jewellery and veil setting, saree/lehenga draping and Dyson styling.',
      'Week 4 — Live practice: supervised makeovers on real clients and models, timed wedding-morning drills, photoshoot styling and portfolio curation.',
      'Business module: consultation scripts, pricing and quotations, kit investment, Instagram portfolio building, client contracts and freelancing.',
      'Assessment and certification: practical bridal makeover, viva, hygiene audit, ISO/Govt-recognised diploma, portfolio shoot and placement guidance.',
    ],
    benefits: [
      'ISO and Government-recognised certification accepted by salons and studios across India',
      'Daily hands-on practice on live models, never just mannequins',
      'Full professional vanity kit with genuine MAC, Huda Beauty, Temptu and Dyson tools included in the fee',
      'Real business training — pricing, client handling and portfolio building',
      '100% placement and freelance onboarding support through our Jaipur studio network',
    ],
    idealFor:
      'Complete beginners, home-based beauticians, salon assistants, working makeup artists upgrading to bridal/airbrush work, and aspiring freelance artists. No prior experience required; a basic interest in beauty and a willingness to practise daily are enough.',
    productsUsed: [
      'MAC Pro kit & Prep + Prime',
      'Huda Beauty & Charlotte Tilbury',
      'Temptu Airbrush System',
      'Kryolan & NARS professional range',
      'Dyson Supersonic & Airwrap',
      'Ardell lashes & professional brush set',
      'ISO / Govt-recognised certification',
    ],
    priceNote:
      '₹45,000 all-inclusive for 30 days of training, the full professional kit, study material, live models, portfolio shoot and certification. Instalment payment plans are available at enrolment.',
    highlights: [
      'ISO & Govt Certified Diploma',
      'MAC · Huda · Temptu · Dyson Kit',
      '30 Days · 120 Hours · Beginners',
      'Live Models + Portfolio Shoot',
      '₹45,000 with Kit & Placement',
    ],
    popular: true,
    image: '/images/makeup_academy_class_1792648280089.jpg',
  },
  {
    id: 'a2',
    title: '15-Day Advanced Hair Styling & Chemical Course',
    category: 'academy',
    price: 28000,
    duration: '15 Days',
    description:
      'A 15-day, 60-hour advanced professional hair programme priced at ₹28,000, designed for working stylists and serious learners. Days 1–3 cover hair and scalp science, strand testing, consultation and sectioning; days 4–7 build precision cutting, blow-dry architecture and Dyson styling; days 8–12 deliver supervised chemical work with L’Oréal Professionnel colour, Olaplex bond protection, French balayage, GK Hair keratin and formaldehyde-free nanoplastia; the final days cover colour correction, client safety documentation, pricing, retail recommendation and a practical assessment. Every technique is practised on live models under educator supervision using sealed, authentic salon products. Graduates leave with a certification, a before-and-after portfolio and the confidence to charge for advanced services. Ideal for salon professionals, beauticians expanding into hair and academy graduates seeking chemical-work certification. Includes professional products, study notes, live models and certification.',
    processSteps: [
      'Days 1–3 — Science: hair structure, porosity and elasticity, scalp conditions, patch and strand tests, hygiene and consultation scripts.',
      'Days 4–5 — Cutting: sectioning, precision scissor and razor work, face-shape mapping, fringe and layer architecture.',
      'Days 6–7 — Styling: Dyson Supersonic blowouts, round-brush tension, heat protection, updos and long-wear event styling.',
      'Days 8–10 — Colour: L’Oréal Professionnel mixing ratios, global colour, grey coverage, freehand French balayage and gloss toning with Olaplex.',
      'Days 11–12 — Chemical smoothing: GK Hair keratin and nanoplastia application, processing times, temperature calibration and after-care.',
      'Days 13–15 — Correction, business and assessment: colour correction, service pricing and retail, live-model practical, viva and certification.',
    ],
    benefits: [
      'Confident, safety-first chemical work with documented patch and strand testing',
      'Hands-on balayage, keratin and nanoplastia practice on live models',
      'Genuine L’Oréal Professionnel, Olaplex, GK Hair and Kérastase products supplied',
      'Service pricing, consultation and retail skills that increase earning potential',
      'Advanced certification plus a before-and-after portfolio',
    ],
    idealFor:
      'Working salon stylists, salon owners, beauticians adding hair services, and graduates of a basic makeup or cosmetology course who want certified chemical and colour expertise. Basic blow-drying experience is helpful but not mandatory.',
    productsUsed: [
      'L’Oréal Professionnel Majirel & Blond Studio',
      'Olaplex No.1 / No.2 / No.3',
      'GK Hair keratin & nanoplastia systems',
      'Kérastase Chroma Absolu & Elixir Ultime',
      'Dyson Supersonic & Corrale',
      'Professional Japanese shears & sectioning kit',
    ],
    priceNote:
      '₹28,000 all-inclusive for 15 days of training, professional products, live models, study notes and certification. A combined bridal + hair diploma is available at a published bundle fee.',
    highlights: [
      '15 Days · 60 Hours · Advanced',
      'L’Oréal · Olaplex · GK Hair · Dyson',
      'Live Chemical & Colour Practice',
      'Colour Theory + Client Pricing',
      '₹28,000 with Certification',
    ],
    image: '/images/hair_styling_luxe_1790672021591.jpg',
  },
];
