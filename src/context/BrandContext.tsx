import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  loadWhiteLabelConfig,
  saveWhiteLabelConfig,
  WHITE_LABEL_STORAGE_KEY,
} from '../data/whiteLabelConfig';
import { DEFAULT_TRANSLATIONS, SUPPORTED_LANGUAGES } from '../data/i18nData';
import { useAuth } from './AuthContext';
import { loadSiteSection, saveSiteSection } from '../lib/sectionStore';

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
  resetToDefault: () => void;
  exportConfigJson: () => string;
  importConfigJson: (jsonString: string) => { success: boolean; error?: string };
  formatPrice: (amount: number) => string;
  convertPrice: (amount: number) => number;
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: (open: boolean) => void;
  customizerInitialTab: string | null;
  openCustomizerTab: (tab: string) => void;
  /** True when rendered for a preview/public salon view where localStorage mutations are disabled. */
  readOnly?: boolean;
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
  const { user } = useAuth();
  const cloudBrandOwner = useRef<string | null | undefined>(undefined);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerInitialTab, setCustomizerInitialTab] = useState<string | null>(null);

  // Load the owner's saved brand configuration from Supabase after auth is known.
  useEffect(() => {
    let cancelled = false;
    const ownerId = user?.id || null;
    cloudBrandOwner.current = undefined;
    const hydrate = async () => {
      try {
        const cloudBrand = await loadSiteSection<Partial<WhiteLabelConfig>>('brand');
        if (cancelled) return;
        if (cloudBrand) {
          const { presetId: _removedPresetId, ...sanitizedCloudBrand } = cloudBrand as Partial<WhiteLabelConfig> & { presetId?: unknown };
          setBrand((current) => ({ ...current, ...sanitizedCloudBrand }));
        }
      } catch (error) {
        console.error('[brand] Supabase load failed; retaining local configuration:', error);
      } finally {
        if (!cancelled) cloudBrandOwner.current = ownerId;
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Persist subsequent customizer changes to the owner-scoped Supabase section.
  useEffect(() => {
    if (!user?.id || cloudBrandOwner.current !== user.id) return;
    void saveSiteSection('brand', brand).catch((error) => {
      console.error('[brand] Supabase save failed; local configuration remains available:', error);
    });
  }, [brand, user?.id]);

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
      let ogImage = effectiveOgImage;
      if (window.location.pathname === '/') {
        try { ogImage = new URL(effectiveOgImage, window.location.origin).href; } catch { /* Preserve a custom value if it is not a URL. */ }
      }
      upsertMetaTag('property', 'og:image', ogImage);
      upsertMetaTag('name', 'twitter:card', brand.domainSeo?.twitterCardType || 'summary_large_image');
      upsertMetaTag('name', 'twitter:title', effectiveOgTitle);
      upsertMetaTag('name', 'twitter:description', effectiveOgDesc);
      upsertMetaTag('name', 'twitter:image', effectiveOgImage);

      if (brand.domainSeo?.canonicalUrl) {
        const canonical = window.location.pathname === '/' && /^https:\/\/www\.luminaluxestudio\.com\/?$/.test(brand.domainSeo.canonicalUrl)
          ? DEFAULT_WHITE_LABEL_CONFIG.domainSeo.canonicalUrl
          : brand.domainSeo.canonicalUrl;
        upsertLinkTag('canonical', canonical);
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


  const resetToDefault = useCallback(() => {
    if (typeof window !== 'undefined') {
      [
        WHITE_LABEL_STORAGE_KEY,
        'whitelabel_salon_brand_config_v2',
        'whitelabel_salon_brand_config_v3',
        'whitelabel_salon_gallery_v2',
        'whitelabel_salon_gallery_v3',
        'whitelabel_salon_services_v2',
        'whitelabel_salon_services_v3',
        'whitelabel_salon_packages_v2',
        'whitelabel_salon_packages_v3',
        'whitelabel_salon_videos_v2',
        'whitelabel_salon_videos_v3',
      ].forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch {}
      });
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
        const { presetId: _removedPresetId, ...sanitizedImported } = parsed;
        setBrand((prev) => ({
          ...DEFAULT_WHITE_LABEL_CONFIG,
          ...prev,
          ...sanitizedImported,
          theme: {
            ...DEFAULT_WHITE_LABEL_CONFIG.theme,
            ...(sanitizedImported.theme || {}),
          },
          sections: {
            ...DEFAULT_WHITE_LABEL_CONFIG.sections,
            ...(sanitizedImported.sections || {}),
          },
          localization: {
            ...DEFAULT_WHITE_LABEL_CONFIG.localization,
            ...(sanitizedImported.localization || {}),
          },
          domainSeo: {
            ...DEFAULT_WHITE_LABEL_CONFIG.domainSeo,
            ...(sanitizedImported.domainSeo || {}),
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

/**
 * Scoped brand provider for unified salon websites (Preview, /salon/:slug, Subdomain,
 * and signed-in owner main view) so every section renders that salon's edited copy,
 * contact details and colours without touching global localStorage.
 */
export const BrandOverrideProvider: React.FC<{
  brand: WhiteLabelConfig;
  readOnly?: boolean;
  children: React.ReactNode;
}> = ({ brand: overrideBrand, readOnly = true, children }) => {
  const parent = useContext(BrandContext);
  const [language, setLanguageState] = useState<SupportedLanguage>(
    overrideBrand.localization?.activeLanguage || overrideBrand.localization?.defaultLanguage || 'en'
  );

  const langMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  const isRtl = langMeta.dir === 'rtl';

  const t = useCallback(
    (key: keyof TranslationDictionary): string => {
      const customLangDict = overrideBrand.localization?.customTranslations?.[language];
      if (customLangDict && customLangDict[key]) {
        return customLangDict[key] as string;
      }
      const builtinLangDict = DEFAULT_TRANSLATIONS[language];
      if (builtinLangDict && builtinLangDict[key]) {
        return builtinLangDict[key];
      }
      return DEFAULT_TRANSLATIONS.en[key] || String(key);
    },
    [overrideBrand.localization, language]
  );

  const convertPrice = useCallback(
    (amount: number): number => {
      const rate = CURRENCY_RATES[overrideBrand.currencyCode] ?? 1;
      if (rate === 1) return Math.round(amount);
      return Math.max(5, Math.round(amount * rate));
    },
    [overrideBrand.currencyCode]
  );

  const formatPrice = useCallback(
    (amount: number): string => {
      const converted = convertPrice(amount);
      const locale = overrideBrand.currencyCode === 'INR' ? 'en-IN' : 'en-US';
      return `${overrideBrand.currencySymbol}${converted.toLocaleString(locale)}`;
    },
    [overrideBrand.currencySymbol, overrideBrand.currencyCode, convertPrice]
  );

  const noop = useCallback(() => {}, []);

  const scopedStyles = {
    '--wl-bg': overrideBrand.theme.bgColor,
    '--wl-primary': overrideBrand.theme.primaryColor,
    '--wl-accent': overrideBrand.theme.accentColor,
    '--wl-accent-hover': overrideBrand.theme.accentHoverColor,
    '--wl-text-muted': overrideBrand.theme.textMutedColor,
    '--wl-surface': overrideBrand.theme.surfaceColor,
    '--wl-font-heading': overrideBrand.theme.fontHeading,
    '--wl-font-body': overrideBrand.theme.fontBody,
    backgroundColor: overrideBrand.theme.bgColor,
    color: overrideBrand.theme.primaryColor,
  } as React.CSSProperties;

  return (
    <BrandContext.Provider
      value={{
        brand: overrideBrand,
        updateBrand: readOnly ? noop : parent?.updateBrand || noop,
        updateTheme: readOnly ? noop : parent?.updateTheme || noop,
        updateSections: readOnly ? noop : parent?.updateSections || noop,
        updateLocalization: readOnly ? noop : parent?.updateLocalization || noop,
        updateDomainSeo: readOnly ? noop : parent?.updateDomainSeo || noop,
        language,
        setLanguage: setLanguageState,
        isRtl,
        t,
        updateCustomTranslation: readOnly ? noop : parent?.updateCustomTranslation || noop,
        resetCustomTranslations: readOnly ? noop : parent?.resetCustomTranslations || noop,
        resetToDefault: readOnly ? noop : parent?.resetToDefault || noop,
        exportConfigJson: () => JSON.stringify(overrideBrand, null, 2),
        importConfigJson: () => ({ success: false, error: 'Read-only view' }),
        formatPrice,
        convertPrice,
        isCustomizerOpen: readOnly ? false : parent?.isCustomizerOpen || false,
        setIsCustomizerOpen: readOnly ? noop : parent?.setIsCustomizerOpen || noop,
        customizerInitialTab: parent?.customizerInitialTab || null,
        openCustomizerTab: readOnly ? noop : parent?.openCustomizerTab || noop,
        readOnly,
      }}
    >
      <div style={scopedStyles} dir={isRtl ? 'rtl' : 'ltr'} className="w-full min-h-screen">
        {children}
      </div>
    </BrandContext.Provider>
  );
};
