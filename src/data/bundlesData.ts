import type { BundlePackage } from '../types';

/**
 * Curated combos used as the no-cache fallback for the packages section.
 * Each bundle carries the same complete editorial record as the master package
 * catalog: process, benefits, ideal profiles, genuine brands and clear pricing.
 */
export const CURATED_BUNDLES: BundlePackage[] = [
  {
    id: 'bundle-bridal-glow',
    title: 'The Royal Bridal Glow & Draping Package',
    tagline: 'Complete Bridal Package for Destination & Grand Weddings',
    description:
      'Our most requested wedding programme, priced at ₹29,999 against a ₹37,496 regular value. Session one opens with a complexion and outfit consultation, a 24K Gold Leaf Glow Facial with ultrasound infusion, a Swarovski bridal gel manicure and a rose petal milk body spa. On the wedding day a Chief Bridal Artist builds a MAC, Huda Beauty and Temptu HD airbrush base, sets Kundan jewellery, drapes the lehenga and dupatta and seals the look for 16+ hours. Expect luminous, even-toned skin and a photographically flawless finish across two unhurried sessions. Ideal for all Indian skin tones and every skin type, including sensitive and pigmentation-prone complexions.',
    originalPrice: 37496,
    discountedPrice: 29999,
    savings: 7497,
    duration: '2 Sessions (Wedding Eve & Wedding Day)',
    servicesIncluded: [
      'Signature Royal HD Bridal Makeover (Airbrush Makeup & Jewelry Setting)',
      '24K Gold Leaf Glow Facial with Ultrasound Skin Firming',
      'Bridal Gel Nail Extensions with Swarovski Stones & Gold Foil Art',
      'Rose Petal & Milk Body Spa with Warm Almond Oil Massage',
    ],
    processSteps: [
      'Bridal consultation, shade matching and a written two-session timeline.',
      'Wedding-eve 24K Gold Leaf Glow Facial with kesar, hyaluronic serum and 1 MHz ultrasound infusion.',
      'Wedding-eve rose petal milk body spa and Swarovski bridal gel extensions.',
      'Wedding-day MAC Prep + Prime skin prep and layered Huda Beauty / Temptu HD airbrush base.',
      'Bespoke eye artistry, Kundan jewellery setting, couture dupatta draping and a Dyson hair finish.',
      'Flash-photo check, 16-hour sealing spray and a personalised touch-up kit.',
    ],
    benefits: [
      'Save ₹7,497 (20% OFF) on four signature rituals in one plan',
      'Camera-ready 16-hour waterproof bridal finish',
      'Prepped, hydrated skin so makeup blends without caking',
      'Private bridal suite or on-venue service across Jaipur',
    ],
    idealFor:
      'All Indian skin tones and skin types — normal, dry, oily, combination and sensitive — including brides with pigmentation, tan or texture concerns. Ideal for palace and destination weddings.',
    productsUsed: [
      'MAC Studio Fix & Prep + Prime',
      'Huda Beauty #FauxFilter',
      'Temptu HD Airbrush',
      '24K gold leaf & Forest Essentials',
      'CND Shellac, OPI & Swarovski',
      'Dyson Supersonic & Airwrap',
    ],
    priceNote:
      '₹29,999 all-inclusive for both sessions, trial, lashes, draping and touch-up kit. A 25% advance reserves your Chief Bridal Artist.',
    image: '/images/bridal_makeup_jaipur_1790672008691.jpg',
    badge: 'Save ₹7,497 (20% OFF)',
    popular: true,
  },
  {
    id: 'bundle-pre-wedding-radiance',
    title: 'Pre-Wedding Glow & Hair Botox Combo',
    tagline: 'Frizz-Free Smooth Hair with 7-Step Deep Clean Facial',
    description:
      'A 330-minute, one-day transformation priced at ₹12,499 against a ₹16,396 regular value. After a scalp, strand and skin analysis with a documented patch test, we perform formaldehyde-free Moroccan Nanoplastia and Hair Botox with Olaplex bond protection, L’Oréal Professionnel Metal Detox and Kérastase sealing. A genuine 7-step HydraFacial MD follows for painless blackhead extraction, hyaluronic infusion and LED calming, while a dry Russian manicure with warm paraffin restores the hands. The day closes with a precision trim and Dyson bouncy blow-dry. Expect 5–6 months of frizz-free mirror shine, glass-like skin and immaculate nails. Ideal for colour-treated, frizzy or hard-water damaged hair and oily, congested or dull skin.',
    originalPrice: 16396,
    discountedPrice: 12499,
    savings: 3897,
    duration: '330 mins (Full Day Care)',
    servicesIncluded: [
      'Moroccan Nanoplastia & Hair Botox Treatment (Chemical-Free)',
      'Hydra-Facial Deep Clean with Blackhead Removal',
      'Russian Manicure & Warm Paraffin Hand Spa',
      'Haircut, Head Wash & Bouncy Blowdry',
    ],
    processSteps: [
      'Consultation and documented patch / strand testing for hair and skin.',
      'Nanoplastia protocol: clarifying wash, Olaplex protection, argan infusion, steam and calibrated iron seal.',
      'HydraFacial MD: vortex cleanse, painless extraction, oxygen jet, hyaluronic serum and LED therapy.',
      'Russian manicure: dry e-file cuticle work, CND Shellac / OPI GelColor, paraffin dip and almond-oil massage.',
      'Precision split-end trim, Kérastase gloss and Dyson bouncy blow-dry.',
      'Written 72-hour hair after-care and 6-week maintenance calendar.',
    ],
    benefits: [
      'Save ₹3,897 (24% OFF) on four premium treatments in one visit',
      '5–6 months of frizz-free, humidity-proof mirror shine',
      'Decongested, deeply hydrated skin with zero downtime',
      'Patch-tested, formaldehyde-free and safe on coloured hair',
    ],
    idealFor:
      'Frizzy, porous, colour-treated, highlighted and hard-water damaged hair; oily, combination, congested and dull skin. Settings are customised for sensitive scalps and reactive complexions.',
    productsUsed: [
      'GK Hair Nanoplastia & MoroccanOil',
      'Olaplex No.1 / No.3 / No.7',
      'L’Oréal Professionnel Metal Detox',
      'Kérastase Elixir Ultime',
      'Genuine HydraFacial MD tips & hyaluronic serum',
      'CND Shellac, OPI & Dyson',
    ],
    priceNote:
      '₹12,499 all-inclusive for the four treatments, patch test, trim, blow-dry and after-care plan. Length supplements are quoted before the service begins.',
    image: '/images/hair_styling_luxe_1790672021591.jpg',
    badge: 'Save ₹3,897 (24% OFF)',
    popular: true,
  },
  {
    id: 'bundle-sangeet-glam',
    title: 'Sangeet & Cocktail Party Look Combo',
    tagline: 'Photo-Ready Glowing Makeup with Trendy Hair Color',
    description:
      'A 360-minute evening-ready edit priced at ₹17,999 against a ₹22,997 regular value. We begin with a colour and skin consultation plus a strand test, then create Olaplex-protected hand-painted French Balayage with L’Oréal Professionnel Blond Studio and a bespoke anti-brass gloss toner. After a Kérastase bond masque and Dyson soft waves, our artist builds a dewy long-wear sangeet look with Charlotte Tilbury, Huda Beauty and MAC glitter pigments, Ardell lashes and mini touch-up kit. CND and Swarovski gel extensions with gold foil art finish the transformation. Expect luminous hair dimension, 10–12 hours of dance-proof makeup and photo-perfect nails. Ideal for previously coloured or frizz-prone hair and normal to combination skin.',
    originalPrice: 22997,
    discountedPrice: 17999,
    savings: 4998,
    duration: '360 mins',
    servicesIncluded: [
      'Sangeet & Party Glam Makeup (Dewy Glow & Soft Waves)',
      'French Balayage & Ombre Hair Color with Olaplex Protection',
      'Bridal Gel Nail Extensions with Gold Foil Art',
    ],
    processSteps: [
      'Consultation, strand test and agreement on ribbon placement, eye look and nail art.',
      'Olaplex-protected freehand balayage with a bespoke anti-brass gloss toner.',
      'Kérastase Chroma Absolu masque, Olaplex No.7 and Dyson Airwrap soft waves.',
      'Illuminating skin prep, dewy Charlotte Tilbury / Huda Beauty base, MAC glitter eyes and Ardell lashes.',
      'Dry Russian prep, CND/OPI gel extensions, Swarovski stones and 24K gold foil art.',
      'Flash-photo check, setting spray and mini touch-up kit handover.',
    ],
    benefits: [
      'Save ₹4,998 (22% OFF) on colour, makeup and couture nails',
      'Natural balayage dimension with no harsh regrowth line for 3–4 months',
      '10–12 hour dance-proof, transfer-resistant party makeup',
      'Bond-protected colour with less dryness and breakage',
    ],
    idealFor:
      'Virgin, previously coloured, fine, thick, straight, wavy and frizz-prone hair; normal, dry and combination skin. Suitable for sensitive scalps after a patch test.',
    productsUsed: [
      'L’Oréal Professionnel Blond Studio',
      'Olaplex Bond Builder',
      'Kérastase Chroma Absolu',
      'Charlotte Tilbury, Huda Beauty & MAC',
      'CND Shellac, OPI & Swarovski',
      'Dyson Airwrap & Ardell lashes',
    ],
    priceNote:
      '₹17,999 all-inclusive for the strand test, balayage, toner, blow-dry, lashes and gel nail art. Major colour correction is quoted separately before work begins.',
    image: '/images/home_salon_service_1790676110547.jpg',
    badge: 'Save ₹4,998 (22% OFF)',
  },
  {
    id: 'bundle-ayurvedic-detox',
    title: 'Ayurvedic Body Polish & Glow Spa Combo',
    tagline: 'Herbal De-Tan & Deep Skin Moisturization for Dry Weather',
    description:
      'A 230-minute heritage detox priced at ₹9,999 against a ₹13,497 regular value. After skin and sensitivity mapping, a 24K Gold Leaf Glow Facial with pure Kashmiri kesar, sandalwood and ultrasound serum infusion restores facial radiance. A full-body Dead Sea salt, multani mitti, wild turmeric and kesar scrub follows with a herbal clay pack and warm steam to lift impurities and even out tan. The ritual closes with a rose petal and milk bath, warm cold-pressed almond oil massage, hydrating wrap and rose-quartz cooling finish. Expect brighter, satin-soft, evenly toned skin, relaxed muscles and zero downtime. Ideal for tanned, dull, rough, dry and sensitive skin, with genuine 24K gold leaf and Forest Essentials herbs throughout.',
    originalPrice: 13497,
    discountedPrice: 9999,
    savings: 3498,
    duration: '230 mins',
    servicesIncluded: [
      '24K Gold Leaf Glow Facial with Pure Kesar & Sandalwood',
      'Herbal Full Body Scrub & Mud Pack',
      'Rose Petal & Milk Body Spa with Steam Bath',
    ],
    processSteps: [
      'Consultation: map tan depth, pigmentation, dryness and sensitivity.',
      '24K Gold Glow Facial with real gold leaf, hyaluronic ultrasound infusion and rose-quartz massage.',
      'Full-body Dead Sea salt, multani mitti, haldi and kesar exfoliation in lymph-direction strokes.',
      'Herbal clay pack, 10 minutes of warm aromatic steam and a cool compress removal.',
      'Rose petal and organic milk bath with warm almond oil massage and a hydrating honey wrap.',
      'Aloe and shea moisture seal, SPF, herbal tea and a take-home ubtan recipe.',
    ],
    benefits: [
      'Save ₹3,498 (26% OFF) on a complete face-and-body glow programme',
      'Visibly reduces sun tan, dullness and uneven tone without bleach or acids',
      'Instant bridal radiance with real 24K gold leaf and ultrasound infusion',
      'Deep relaxation and satin-soft, hydrated skin',
    ],
    idealFor:
      'Sun-tanned, dull, pigmented, rough, dry, dehydrated and sensitive skin; especially recommended after outdoor Jaipur festivities and before lehenga photography.',
    productsUsed: [
      'Genuine 24K gold leaf',
      'Forest Essentials kesar, sandalwood & rose',
      'Dead Sea mineral salts & multani mitti',
      'Wild turmeric & Kashmiri saffron',
      'Cold-pressed almond oil & shea butter',
      'Rose quartz rollers & rose hydrosol',
    ],
    priceNote:
      '₹9,999 all-inclusive for all three rituals, private spa suite, steam, herbal tea and home-care recipe. Best taken 5–7 days before a wedding or photoshoot.',
    image: '/images/prebridal_spa_ritual_1790676123541.jpg',
    badge: 'Save ₹3,498 (26% OFF)',
  },
];
