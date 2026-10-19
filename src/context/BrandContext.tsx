import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  WhiteLabelConfig,
  WhiteLabelTheme,
  WhiteLabelSectionToggles,
  WhiteLabelLocalizationConfig,
  WhiteLabelDomainSeoConfig,
  SupportedLanguage,
  TranslationDictionary,
} from '../types';
import {
  DEFAULT_WHITE_LABEL_CONFIG,
  WHITE_LABEL_PRESETS,
  loadWhiteLabelConfig,
  saveWhiteLabelConfig,
  WHITE_LABEL_STORAGE_KEY,
} from '../data/whiteLabelConfig';
import { DEFAULT_TRANSLATIONS, SUPPORTED_LANGUAGES } from '../data/i18nData';

interface BrandContextValue {
  brand: WhiteLabelConfig;
  updateBrand: (updates: Partial<WhiteLabelConfig>) => void;
  updateTheme: (updates: Partial<WhiteLabelTheme>) => void;
  updateSections: (updates: Partial<WhiteLabelSectionToggles>) => void;
  updateLocalization: (updates: Partial<WhiteLabelLocalizationConfig>) => void;
  updateDomainSeo: (updates: Partial<WhiteLabelDomainSeoConfig>) => void;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  isRtl: boolean;
  t: (key: keyof TranslationDictionary) => string;
  updateCustomTranslation: (
    lang: SupportedLanguage,
    key: keyof TranslationDictionary,
    value: string
  ) => void;
  resetCustomTranslations: (lang?: SupportedLanguage) => void;
  applyPreset: (presetId: string) => void;
  resetToDefault: () => void;
  exportConfigJson: () => string;
  importConfigJson: (jsonString: string) => { success: boolean; error?: string };
  formatPrice: (amount: number) => string;
  convertPrice: (amount: number) => number;
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: (open: boolean) => void;
  customizerInitialTab: string | null;
  openCustomizerTab: (tab: string) => void;
}

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

const CURRENCY_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.015,
  EUR: 0.014,
  GBP: 0.012,
  AED: 0.055,
};

function upsertMetaTag(
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLinkTag(rel: string, href: string) {
  if (typeof document === 'undefined' || !href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<WhiteLabelConfig>(() => loadWhiteLabelConfig());
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerInitialTab, setCustomizerInitialTab] = useState<string | null>(null);

  const language: SupportedLanguage =
    brand.localization?.activeLanguage || brand.localization?.defaultLanguage || 'en';

  const langMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  const isRtl = langMeta.dir === 'rtl';

  const openCustomizerTab = useCallback((tab: string) => {
    setCustomizerInitialTab(tab);
    setIsCustomizerOpen(true);
  }, []);

  // Sync to localStorage, document title, SEO meta tags, favicon, language dir, and CSS variables
  useEffect(() => {
    saveWhiteLabelConfig(brand);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // 1. Language & RTL / LTR direction
      root.setAttribute('lang', language);
      root.setAttribute('dir', isRtl ? 'rtl' : 'ltr');

      // 2. CSS Theme Variables
      root.style.setProperty('--wl-bg', brand.theme.bgColor);
      root.style.setProperty('--wl-primary', brand.theme.primaryColor);
      root.style.setProperty('--wl-accent', brand.theme.accentColor);
      root.style.setProperty('--wl-accent-hover', brand.theme.accentHoverColor);
      root.style.setProperty('--wl-text-muted', brand.theme.textMutedColor);
      root.style.setProperty('--wl-surface', brand.theme.surfaceColor);
      root.style.setProperty('--wl-font-heading', brand.theme.fontHeading);
      root.style.setProperty('--wl-font-body', brand.theme.fontBody);

      // 3. Dynamic SEO Title & Meta Tags
      const effectiveSeoTitle =
        brand.domainSeo?.seoTitle?.trim() ||
        `${brand.brandName} — ${brand.brandSubtext} | ${brand.cityName}`;
      const effectiveSeoDesc =
        brand.domainSeo?.seoDescription?.trim() ||
        `${brand.brandName} (${brand.cityName}): ${brand.heroDescription}`;
      const effectiveOgTitle =
        brand.domainSeo?.ogTitle?.trim() || effectiveSeoTitle;
      const effectiveOgDesc =
        brand.domainSeo?.ogDescription?.trim() || effectiveSeoDesc;
      const effectiveOgImage =
        brand.domainSeo?.ogImageUrl?.trim() || brand.heroImage;

      document.title = effectiveSeoTitle;
      upsertMetaTag('name', 'description', effectiveSeoDesc);
      if (brand.domainSeo?.seoKeywords) {
        upsertMetaTag('name', 'keywords', brand.domainSeo.seoKeywords);
      }
      upsertMetaTag(
        'name',
        'robots',
        brand.domainSeo?.robotsIndexing !== false ? 'index, follow' : 'noindex, nofollow'
      );
      upsertMetaTag(
        'name',
        'theme-color',
        brand.domainSeo?.themeColorHex || brand.theme.primaryColor
      );

      // OpenGraph & Twitter Cards
      upsertMetaTag('property', 'og:title', effectiveOgTitle);
      upsertMetaTag('property', 'og:description', effectiveOgDesc);
      upsertMetaTag('property', 'og:image', effectiveOgImage);
      upsertMetaTag('name', 'twitter:card', brand.domainSeo?.twitterCardType || 'summary_large_image');
      upsertMetaTag('name', 'twitter:title', effectiveOgTitle);
      upsertMetaTag('name', 'twitter:description', effectiveOgDesc);
      upsertMetaTag('name', 'twitter:image', effectiveOgImage);

      if (brand.domainSeo?.canonicalUrl) {
        upsertLinkTag('canonical', brand.domainSeo.canonicalUrl);
      }

      if (brand.domainSeo?.googleSiteVerification) {
        upsertMetaTag(
          'name',
          'google-site-verification',
          brand.domainSeo.googleSiteVerification
        );
      }

      // 4. Dynamic Favicon & Apple Touch Icon
      const faviconHref = brand.domainSeo?.faviconUrl || brand.logoUrl;
      if (faviconHref) {
        upsertLinkTag('icon', faviconHref);
      }
      if (brand.domainSeo?.appleTouchIconUrl) {
        upsertLinkTag('apple-touch-icon', brand.domainSeo.appleTouchIconUrl);
      }
    }
  }, [brand, language, isRtl]);

  const updateBrand = useCallback((updates: Partial<WhiteLabelConfig>) => {
    setBrand((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const updateTheme = useCallback((updates: Partial<WhiteLabelTheme>) => {
    setBrand((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        ...updates,
      },
    }));
  }, []);

  const updateSections = useCallback((updates: Partial<WhiteLabelSectionToggles>) => {
    setBrand((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        ...updates,
      },
    }));
  }, []);

  const updateLocalization = useCallback((updates: Partial<WhiteLabelLocalizationConfig>) => {
    setBrand((prev) => ({
      ...prev,
      localization: {
        ...prev.localization,
        ...updates,
      },
    }));
  }, []);

  const updateDomainSeo = useCallback((updates: Partial<WhiteLabelDomainSeoConfig>) => {
    setBrand((prev) => ({
      ...prev,
      domainSeo: {
        ...prev.domainSeo,
        ...updates,
      },
    }));
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setBrand((prev) => ({
      ...prev,
      localization: {
        ...prev.localization,
        activeLanguage: lang,
      },
    }));
  }, []);

  const t = useCallback(
    (key: keyof TranslationDictionary): string => {
      const customLangDict = brand.localization?.customTranslations?.[language];
      if (customLangDict && customLangDict[key]) {
        return customLangDict[key] as string;
      }
      const builtinLangDict = DEFAULT_TRANSLATIONS[language];
      if (builtinLangDict && builtinLangDict[key]) {
        return builtinLangDict[key];
      }
      return DEFAULT_TRANSLATIONS.en[key] || String(key);
    },
    [brand.localization, language]
  );

  const updateCustomTranslation = useCallback(
    (lang: SupportedLanguage, key: keyof TranslationDictionary, value: string) => {
      setBrand((prev) => {
        const prevLangCustom = prev.localization?.customTranslations?.[lang] || {};
        return {
          ...prev,
          localization: {
            ...prev.localization,
            customTranslations: {
              ...(prev.localization?.customTranslations || {}),
              [lang]: {
                ...prevLangCustom,
                [key]: value,
              },
            },
          },
        };
      });
    },
    []
  );

  const resetCustomTranslations = useCallback((lang?: SupportedLanguage) => {
    setBrand((prev) => {
      if (!lang) {
        return {
          ...prev,
          localization: {
            ...prev.localization,
            customTranslations: {},
          },
        };
      }
      const nextCustom = { ...(prev.localization?.customTranslations || {}) };
      delete nextCustom[lang];
      return {
        ...prev,
        localization: {
          ...prev.localization,
          customTranslations: nextCustom,
        },
      };
    });
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const found = WHITE_LABEL_PRESETS.find((p) => p.id === presetId);
    if (found) {
      const cloned: WhiteLabelConfig = JSON.parse(JSON.stringify(found.config));
      const slug = cloned.brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      cloned.domainSeo = {
        ...DEFAULT_WHITE_LABEL_CONFIG.domainSeo,
        ...(cloned.domainSeo || {}),
        customDomain: `www.${slug.replace(/-/g, '')}.com`,
        subdomainSlug: slug,
        seoTitle: `${cloned.brandName} — ${cloned.brandSubtext} | ${cloned.cityName}`,
        seoDescription: cloned.heroDescription,
        canonicalUrl: `https://www.${slug.replace(/-/g, '')}.com`,
        ogTitle: `${cloned.brandName} (${cloned.cityName}) — ${cloned.tagline}`,
        ogDescription: cloned.heroDescription,
        ogImageUrl: cloned.heroImage,
        themeColorHex: cloned.theme.primaryColor,
      };
      setBrand(cloned);
    }
  }, []);

  const resetToDefault = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WHITE_LABEL_STORAGE_KEY);
    }
    setBrand(JSON.parse(JSON.stringify(DEFAULT_WHITE_LABEL_CONFIG)));
  }, []);

  const exportConfigJson = useCallback(() => {
    return JSON.stringify(brand, null, 2);
  }, [brand]);

  const importConfigJson = useCallback(
    (jsonString: string): { success: boolean; error?: string } => {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== 'object' || !parsed.brandName) {
          return {
            success: false,
            error: 'Invalid configuration JSON: missing brandName field.',
          };
        }
        setBrand((prev) => ({
          ...DEFAULT_WHITE_LABEL_CONFIG,
          ...prev,
          ...parsed,
          theme: {
            ...DEFAULT_WHITE_LABEL_CONFIG.theme,
            ...(parsed.theme || {}),
          },
          sections: {
            ...DEFAULT_WHITE_LABEL_CONFIG.sections,
            ...(parsed.sections || {}),
          },
          localization: {
            ...DEFAULT_WHITE_LABEL_CONFIG.localization,
            ...(parsed.localization || {}),
          },
          domainSeo: {
            ...DEFAULT_WHITE_LABEL_CONFIG.domainSeo,
            ...(parsed.domainSeo || {}),
          },
        }));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to parse JSON.' };
      }
    },
    []
  );

  const convertPrice = useCallback(
    (amount: number): number => {
      const rate = CURRENCY_RATES[brand.currencyCode] ?? 1;
      if (rate === 1) return Math.round(amount);
      return Math.max(5, Math.round(amount * rate));
    },
    [brand.currencyCode]
  );

  const formatPrice = useCallback(
    (amount: number): string => {
      const converted = convertPrice(amount);
      const locale = brand.currencyCode === 'INR' ? 'en-IN' : 'en-US';
      return `${brand.currencySymbol}${converted.toLocaleString(locale)}`;
    },
    [brand.currencySymbol, brand.currencyCode, convertPrice]
  );

  return (
    <BrandContext.Provider
      value={{
        brand,
        updateBrand,
        updateTheme,
        updateSections,
        updateLocalization,
        updateDomainSeo,
        language,
        setLanguage,
        isRtl,
        t,
        updateCustomTranslation,
        resetCustomTranslations,
        applyPreset,
        resetToDefault,
        exportConfigJson,
        importConfigJson,
        formatPrice,
        convertPrice,
        isCustomizerOpen,
        setIsCustomizerOpen,
        customizerInitialTab,
        openCustomizerTab,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
};

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (!ctx) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return ctx;
}
