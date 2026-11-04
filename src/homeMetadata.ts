import { DEFAULT_WHITE_LABEL_CONFIG } from './data/whiteLabelConfig';
import type { WhiteLabelConfig } from './types';

export const SITE_ORIGIN = 'https://beauty-zone-pearl.vercel.app';
export const homeStructuredData = (brand: WhiteLabelConfig = DEFAULT_WHITE_LABEL_CONFIG) => ({
  '@context': 'https://schema.org',
  '@type': 'BeautySalon',
  name: brand.brandName,
  url: `${SITE_ORIGIN}/`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: brand.cityName,
    addressRegion: brand.stateName,
    addressCountry: brand.countryName,
  },
});
