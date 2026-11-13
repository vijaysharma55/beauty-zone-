import type { DomainKey } from './detectSalonDomain';

export type ServiceGender = 'women' | 'men' | 'unisex';

export interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  defaultDurationMin: number;
  suggestedPriceRange?: [number, number];
  tags: string[];
  popularity: number;
  gender?: ServiceGender;
}

export interface ServiceSubcategoryCatalog {
  id: string;
  label: string;
  templates: ServiceTemplate[];
}

export interface ServiceCategoryCatalog {
  id: string;
  key: string;
  label: string;
  subcategories: ServiceSubcategoryCatalog[];
}

export interface DomainCatalog {
  key: DomainKey;
  label: string;
  categories: ServiceCategoryCatalog[];
}

const template = (
  id: string, name: string, description: string, defaultDurationMin: number,
  suggestedPriceRange: [number, number], tags: string[], popularity: number,
  gender?: ServiceGender
): ServiceTemplate => ({ id, name, description, defaultDurationMin, suggestedPriceRange, tags, popularity, gender });

export const SERVICE_CATALOG: Record<DomainKey, DomainCatalog> = {
  nails: {
    key: 'nails', label: 'Nails', categories: [{
      id: 'nails', key: 'nails', label: 'Nails', subcategories: [
        { id: 'gel-polish', label: 'Gel Nails', templates: [
          template('gel-polish', 'Gel Polish', 'Long-wear gel colour with a smooth, glossy finish and professional curing.', 45, [700, 1800], ['gel', 'polish', 'nail colour'], 10, 'women'),
          template('chrome-cat-eye', 'Chrome / Cat-eye Nails', 'A reflective chrome or magnetic cat-eye finish for a distinctive, salon-quality look.', 60, [1200, 2800], ['chrome', 'cat eye', 'gel'], 8, 'women'),
          template('french-tips', 'French Tips', 'A clean, refined French manicure with a natural base and crisp tip detailing.', 45, [800, 1800], ['french', 'tips', 'classic'], 8, 'women'),
        ]},
        { id: 'extensions', label: 'Nail Extensions & Refills', templates: [
          template('acrylic-extensions', 'Acrylic Nail Extensions', 'Custom-length acrylic extensions shaped and finished for a durable, polished look.', 100, [2200, 5000], ['acrylic', 'extension', 'sculpted'], 10, 'women'),
          template('gel-extensions', 'Gel Nail Extensions', 'Lightweight gel extensions shaped to your preferred length with a glossy finish.', 90, [2000, 4800], ['gel', 'extension'], 9, 'women'),
          template('polygel-extensions', 'Polygel Nail Extensions', 'Flexible polygel extensions combining lightweight feel with strong, precise shaping.', 100, [2500, 5500], ['polygel', 'extension'], 8, 'women'),
          template('nail-refill', 'Nail Refill', 'Refresh the growth area, rebalance the structure and restore the finish of existing extensions.', 60, [1000, 2500], ['refill', 'maintenance'], 9, 'women'),
          template('nail-removal', 'Nail Extension Removal', 'Careful product removal with gentle finishing to help protect the natural nail surface.', 30, [400, 1000], ['removal', 'soak off'], 7, 'women'),
        ]},
        { id: 'nail-art', label: 'Nail Art', templates: [
          template('nail-art', 'Nail Art', 'Personalised nail detailing using colour, fine-line designs and tasteful accents.', 30, [300, 1800], ['art', 'design', 'custom'], 9, 'women'),
        ]},
        { id: 'manicure-pedicure', label: 'Manicure & Pedicure', templates: [
          template('manicure', 'Manicure', 'A nail and hand-care ritual with shaping, cuticle care and a neat, hydrated finish.', 40, [500, 1400], ['manicure', 'hands'], 8, 'unisex'),
          template('pedicure', 'Pedicure', 'A relaxing foot-care treatment with nail grooming, exfoliation and moisturising.', 45, [600, 1600], ['pedicure', 'feet'], 8, 'unisex'),
        ]},
      ],
    }],
  },
  hair: {
    key: 'hair', label: 'Hair', categories: [{
      id: 'hair', key: 'hair', label: 'Hair', subcategories: [
        { id: 'haircut', label: 'Haircut & Styling', templates: [
          template('women-haircut', 'Women’s Haircut', 'A consultation-led cut with shaping and a polished finish suited to your hair texture.', 45, [500, 1800], ['haircut', 'cut', 'women'], 10, 'women'),
          template('men-haircut', 'Men’s Haircut', 'A tailored haircut with clean detailing and styling to suit your preferred look.', 30, [250, 900], ['haircut', 'men'], 9, 'men'),
          template('kids-haircut', 'Kids’ Haircut', 'A comfortable, age-appropriate haircut with gentle styling for children.', 25, [200, 600], ['haircut', 'kids'], 7, 'unisex'),
          template('hair-styling', 'Hair Styling', 'Professional styling for a smooth, defined look for everyday wear or special occasions.', 45, [500, 1800], ['styling', 'blowout'], 8, 'unisex'),
          template('blow-dry', 'Blow-dry', 'A salon blow-dry with brush styling for volume, movement and a polished finish.', 30, [300, 1000], ['blow dry', 'finish'], 8, 'unisex'),
        ]},
        { id: 'hair-treatments', label: 'Hair Treatments', templates: [
          template('hair-spa', 'Hair Spa', 'A nourishing scalp and hair treatment followed by a relaxing wash and finish.', 60, [800, 2200], ['spa', 'nourish', 'scalp'], 9, 'unisex'),
          template('keratin', 'Keratin Treatment', 'A smoothing service designed to reduce frizz and improve manageability and shine.', 150, [3500, 9000], ['keratin', 'smooth'], 9, 'unisex'),
          template('smoothening', 'Hair Smoothening', 'A professional frizz-control treatment for softer, more manageable hair.', 150, [3000, 8000], ['smoothening', 'frizz'], 9, 'unisex'),
          template('rebonding', 'Hair Rebonding', 'A straightening service that reshapes the hair for a sleek, straighter appearance.', 180, [3500, 9000], ['rebonding', 'straightening'], 7, 'unisex'),
        ]},
        { id: 'hair-colour', label: 'Hair Colour', templates: [
          template('global-colour', 'Global Hair Colour', 'All-over colour application for an even, refreshed shade and a polished result.', 120, [1800, 6500], ['global', 'colour', 'color'], 9, 'unisex'),
          template('highlights', 'Hair Highlights', 'Dimension-adding highlights placed to brighten and complement your base colour.', 150, [2500, 8000], ['highlights', 'colour'], 9, 'unisex'),
          template('balayage', 'Balayage', 'Hand-painted colour placement for soft dimension and a naturally blended finish.', 180, [4000, 12000], ['balayage', 'colour'], 8, 'unisex'),
        ]},
      ],
    }],
  },
  skin: {
    key: 'skin', label: 'Skin', categories: [{
      id: 'skin', key: 'skin', label: 'Skin', subcategories: [
        { id: 'cleanup-facial', label: 'Facial & Cleanup', templates: [
          template('cleanup', 'Cleanup', 'A refreshing cleanse, exfoliation and mask to leave skin feeling clean and comfortable.', 40, [500, 1400], ['cleanup', 'cleanse'], 9, 'unisex'),
          template('classic-facial', 'Classic Facial', 'A personalised facial with cleansing, gentle exfoliation, massage and a finishing mask.', 60, [900, 2200], ['facial', 'classic'], 10, 'unisex'),
          template('gold-facial', 'Gold Facial', 'A glow-focused facial ritual with a gold-inspired product range and relaxing massage.', 70, [1400, 3200], ['facial', 'gold', 'glow'], 8, 'unisex'),
          template('hydra-facial', 'HydraFacial', 'A multi-step hydration-focused facial to cleanse, exfoliate and leave skin looking refreshed.', 60, [1800, 4500], ['hydra', 'facial', 'hydration'], 9, 'unisex'),
        ]},
        { id: 'skin-finishing', label: 'Skin Finishing', templates: [
          template('detan', 'De-tan Treatment', 'A targeted de-tan service to refresh the appearance of sun-exposed skin.', 35, [500, 1500], ['detan', 'tan'], 8, 'unisex'),
          template('bleach', 'Bleach', 'A carefully applied salon bleach service for an even-looking skin finish.', 25, [300, 900], ['bleach', 'brightening'], 7, 'unisex'),
          template('skin-peel', 'Skin Peel', 'A professional exfoliation service selected according to skin suitability and salon protocol.', 40, [1200, 3500], ['peel', 'exfoliation'], 7, 'unisex'),
        ]},
      ],
    }],
  },
  makeup: {
    key: 'makeup', label: 'Makeup', categories: [{
      id: 'makeup', key: 'makeup', label: 'Makeup', subcategories: [
        { id: 'occasion-makeup', label: 'Occasion Makeup', templates: [
          template('party-makeup', 'Party Makeup', 'A camera-ready makeup look tailored to your outfit, occasion and preferred finish.', 75, [1800, 4500], ['party', 'occasion'], 9, 'women'),
          template('hd-makeup', 'HD Makeup', 'High-definition makeup with a refined, even finish for photography and special occasions.', 90, [3500, 8000], ['hd', 'makeup'], 9, 'women'),
          template('airbrush-makeup', 'Airbrush Makeup', 'Lightweight airbrush application for an even-looking finish and comfortable wear.', 90, [4000, 9000], ['airbrush', 'makeup'], 8, 'women'),
          template('saree-draping', 'Saree Draping', 'Neat, secure saree draping with pleat setting for a graceful occasion-ready look.', 25, [300, 900], ['saree', 'draping'], 8, 'women'),
        ]},
      ],
    }],
  },
  bridal: {
    key: 'bridal', label: 'Bridal', categories: [{
      id: 'bridal', key: 'bridal', label: 'Bridal', subcategories: [
        { id: 'bridal-makeup', label: 'Bridal Makeup', templates: [
          template('bridal-makeup', 'Bridal Makeup', 'A bespoke bridal look planned around your outfit, ceremony, skin preferences and photography.', 180, [12000, 35000], ['bridal', 'wedding', 'makeup'], 10, 'women'),
          template('engagement-makeup', 'Engagement Makeup', 'An occasion look designed for engagement celebrations, photography and long wear.', 100, [5000, 14000], ['engagement', 'bridal'], 8, 'women'),
          template('pre-bridal-package', 'Pre-bridal Package', 'A coordinated series of salon services planned ahead of the wedding date.', 240, [6000, 20000], ['pre bridal', 'package'], 9, 'women'),
        ]},
      ],
    }],
  },
  waxing_threading: {
    key: 'waxing_threading', label: 'Waxing & Threading', categories: [{
      id: 'waxing_threading', key: 'waxing_threading', label: 'Waxing & Threading', subcategories: [
        { id: 'waxing', label: 'Waxing', templates: [
          template('full-arms-wax', 'Full Arms Waxing', 'A thorough arm-waxing service with a clean finish and suitable aftercare guidance.', 30, [350, 900], ['wax', 'arms'], 8, 'women'),
          template('full-legs-wax', 'Full Legs Waxing', 'A full-leg waxing service performed with attention to comfort and an even finish.', 45, [500, 1200], ['wax', 'legs'], 8, 'women'),
          template('underarms-wax', 'Underarms Waxing', 'A quick underarm waxing service with a clean finish and post-service care advice.', 15, [150, 400], ['wax', 'underarms'], 8, 'women'),
        ]},
        { id: 'threading', label: 'Threading', templates: [
          template('eyebrow-threading', 'Eyebrow Threading', 'Precise brow shaping to complement your natural brow line.', 10, [50, 150], ['eyebrow', 'brow'], 9, 'women'),
          template('upper-lip-threading', 'Upper Lip Threading', 'Gentle, precise threading for a neat upper-lip finish.', 5, [30, 100], ['upper lip', 'threading'], 8, 'women'),
          template('full-face-threading', 'Full Face Threading', 'Detailed facial threading for a clean, well-groomed finish.', 25, [150, 400], ['face', 'threading'], 8, 'women'),
        ]},
      ],
    }],
  },
  spa_massage: {
    key: 'spa_massage', label: 'Spa & Massage', categories: [{
      id: 'spa', key: 'spa', label: 'Spa', subcategories: [
        { id: 'massage', label: 'Massage & Relaxation', templates: [
          template('head-massage', 'Head Massage', 'A relaxing scalp massage using suitable oils to ease everyday tension.', 20, [300, 900], ['head', 'massage'], 8, 'unisex'),
          template('body-massage', 'Body Massage', 'A full-body relaxation massage tailored to comfort and preferred pressure.', 60, [1500, 4000], ['body', 'massage'], 9, 'unisex'),
          template('foot-reflexology', 'Foot Reflexology', 'A focused foot-pressure treatment designed for a relaxing wellness experience.', 30, [600, 1500], ['foot', 'reflexology'], 7, 'unisex'),
        ]},
      ],
    }],
  },
  barber: {
    key: 'barber', label: 'Barber', categories: [{
      id: 'barber', key: 'barber', label: 'Barber', subcategories: [
        { id: 'mens-grooming', label: 'Men’s Grooming', templates: [
          template('barber-haircut', 'Barber Haircut', 'A tailored men’s haircut with clean edges and styling to match your preference.', 30, [250, 800], ['barber', 'haircut', 'men'], 10, 'men'),
          template('beard-trim', 'Beard Trim', 'A precise beard shape-up with clean lines and a balanced finish.', 20, [150, 500], ['beard', 'trim'], 9, 'men'),
          template('classic-shave', 'Classic Shave', 'A traditional close shave with careful preparation and soothing aftercare.', 25, [200, 600], ['shave', 'grooming'], 8, 'men'),
          template('barber-head-massage', 'Head Massage', 'A relaxing scalp massage to complete your grooming visit.', 15, [150, 450], ['head', 'massage'], 7, 'men'),
          template('grooming-combo', 'Grooming Combo', 'A convenient combination of haircut and beard detailing in one appointment.', 45, [450, 1200], ['combo', 'haircut', 'beard'], 9, 'men'),
        ]},
      ],
    }],
  },
  mehendi: {
    key: 'mehendi', label: 'Mehendi', categories: [{
      id: 'mehendi', key: 'mehendi', label: 'Mehendi', subcategories: [
        { id: 'henna-designs', label: 'Henna Designs', templates: [
          template('bridal-mehendi', 'Bridal Mehendi', 'Intricate bridal henna artistry planned for your preferred coverage and design style.', 180, [3500, 12000], ['bridal', 'henna', 'mehendi'], 10, 'women'),
          template('arabic-mehendi', 'Arabic Mehendi', 'Flowing Arabic-inspired henna patterns with bold motifs and elegant spacing.', 45, [500, 2500], ['arabic', 'henna'], 8, 'women'),
          template('simple-mehendi', 'Simple Mehendi', 'A neat, minimal henna design for a subtle festive or everyday look.', 20, [200, 900], ['simple', 'henna'], 7, 'women'),
        ]},
      ],
    }],
  },
  unisex_general: {
    key: 'unisex_general', label: 'Popular services', categories: [
      { id: 'hair', key: 'hair', label: 'Hair', subcategories: [
        { id: 'haircut', label: 'Haircut & Styling', templates: [
          template('generic-haircut', 'Haircut & Styling', 'A consultation-led haircut and finish tailored to your preferred look.', 40, [300, 1200], ['hair', 'cut', 'styling'], 9, 'unisex'),
        ]},
      ]},
      { id: 'skin', key: 'skin', label: 'Skin', subcategories: [
        { id: 'facial', label: 'Facial & Cleanup', templates: [
          template('generic-facial', 'Classic Facial', 'A refreshing facial with cleansing, gentle exfoliation and a finishing mask.', 60, [800, 2200], ['skin', 'facial'], 9, 'unisex'),
        ]},
      ]},
      { id: 'nails', key: 'nails', label: 'Nails', subcategories: [
        { id: 'manicure', label: 'Manicure & Pedicure', templates: [
          template('generic-manicure', 'Manicure', 'A complete hand and nail-care service with shaping and moisturising.', 40, [500, 1400], ['nails', 'manicure'], 8, 'unisex'),
        ]},
      ]},
      { id: 'makeup', key: 'makeup', label: 'Makeup', subcategories: [
        { id: 'party-makeup', label: 'Occasion Makeup', templates: [
          template('generic-party-makeup', 'Party Makeup', 'An occasion-ready makeup look tailored to your preferred finish.', 75, [1800, 4500], ['makeup', 'party'], 8, 'women'),
        ]},
      ]},
    ],
  },
};

export function getCatalogTemplates(domain: DomainKey): Array<ServiceTemplate & { domain: DomainKey; category: string; categoryLabel: string; subcategory: string }> {
  const catalog = SERVICE_CATALOG[domain];
  return catalog.categories.flatMap((category) => category.subcategories.flatMap((subcategory) =>
    subcategory.templates.map((item) => ({
      ...item, domain, category: category.key, categoryLabel: category.label, subcategory: subcategory.label,
    }))
  ));
}
