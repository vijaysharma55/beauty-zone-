import React, { useState } from 'react';
import {
  Languages,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  Globe,
  PencilLine,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_TRANSLATIONS,
  TRANSLATION_KEY_LABELS,
} from '../../data/i18nData';
import { SupportedLanguage, TranslationDictionary } from '../../types';

const inputCls =
  'w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-[#D09A40]/40 focus:border-[#D09A40] outline-none transition-all';
const labelCls =
  'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';

export const LanguagesTab: React.FC = () => {
  const {
    brand,
    updateLocalization,
    language,
    setLanguage,
    updateCustomTranslation,
    resetCustomTranslations,
  } = useBrand();

  const [dictLang, setDictLang] = useState<SupportedLanguage>(language);
  const [expandedSection, setExpandedSection] = useState<string | null>('Navigation');
  const [searchQuery, setSearchQuery] = useState('');

  const loc = brand.localization;
  const enabledCodes = loc?.enabledLanguages || ['en'];

  const toggleLanguage = (code: SupportedLanguage) => {
    let next: SupportedLanguage[];
    if (enabledCodes.includes(code)) {
      if (enabledCodes.length <= 1) return;
      next = enabledCodes.filter((c) => c !== code);
    } else {
      next = [...enabledCodes, code];
    }
    updateLocalization({ enabledLanguages: next });
    if (!next.includes(language) && next.length > 0) {
      setLanguage(next[0]);
    }
  };

  const customCount = (code: SupportedLanguage): number => {
    const dict = loc?.customTranslations?.[code];
    return dict ? Object.keys(dict).length : 0;
  };

  const totalCustom = SUPPORTED_LANGUAGES.reduce(
    (sum, l) => sum + customCount(l.code),
    0
  );

  const sections = Array.from(new Set(TRANSLATION_KEY_LABELS.map((k) => k.section)));

  const filteredKeys = TRANSLATION_KEY_LABELS.filter(
    (item) =>
      !searchQuery ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      DEFAULT_TRANSLATIONS[dictLang][item.key]
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] p-5 rounded-2xl border border-slate-700 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D09A40] text-[#0F172A] flex items-center justify-center shrink-0">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Multi-Language & Regional Localization (i18n)
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Run this salon storefront in{' '}
              <strong className="text-[#D09A40]">
                English, Hindi, Marathi, Gujarati, Punjabi, Arabic (RTL) or Spanish
              </strong>
              . Enable languages for the visitor switcher, then override any label with
              your own custom dictionary — changes apply live across the whole site.
            </p>
          </div>
        </div>
      </div>

      {/* Active language + switcher visibility */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          Live Preview Language
        </h3>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LANGUAGES.filter((l) => enabledCodes.includes(l.code)).map((l) => {
            const active = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLanguage(l.code);
                  setDictLang(l.code);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  active
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#D09A40]/60'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] ${
                    active ? 'bg-[#D09A40] text-[#0F172A]' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {l.badge}
                </span>
                {l.nativeName}
                {active && <Check className="w-3.5 h-3.5 text-[#D09A40]" />}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className={labelCls}>Default Language (First Visit)</label>
            <select
              value={loc?.defaultLanguage || 'en'}
              onChange={(e) =>
                updateLocalization({ defaultLanguage: e.target.value as SupportedLanguage })
              }
              className={inputCls}
            >
              {SUPPORTED_LANGUAGES.filter((l) => enabledCodes.includes(l.code)).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Visitor Language Switcher</label>
            <button
              type="button"
              onClick={() =>
                updateLocalization({
                  showLanguageSwitcher: !(loc?.showLanguageSwitcher !== false),
                })
              }
              className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                loc?.showLanguageSwitcher !== false
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {loc?.showLanguageSwitcher !== false ? (
                <>
                  <Eye className="w-4 h-4" /> Switcher Visible in Navbar
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" /> Switcher Hidden (Fixed Language)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Enable / disable languages */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Enabled Languages ({enabledCodes.length}/7)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Only enabled languages appear in the visitor&apos;s language switcher.
            </p>
          </div>
          <Globe className="w-5 h-5 text-slate-300" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUPPORTED_LANGUAGES.map((l) => {
            const enabled = enabledCodes.includes(l.code);
            const customs = customCount(l.code);
            return (
              <div
                key={l.code}
                className={`p-3.5 rounded-xl border transition-all ${
                  enabled
                    ? 'border-[#D09A40]/50 bg-[#D09A40]/5'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                      enabled ? 'bg-[#0F172A] text-[#D09A40]' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {l.badge}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {l.nativeName}{' '}
                      <span className="font-medium text-slate-500">· {l.name}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      {l.regionLabel}
                      {l.dir === 'rtl' && (
                        <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-bold uppercase">
                          RTL
                        </span>
                      )}
                      {customs > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase">
                          {customs} custom
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleLanguage(l.code)}
                    disabled={enabled && enabledCodes.length <= 1}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer disabled:opacity-40 ${
                      enabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                    aria-label={`Toggle ${l.name}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        enabled ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom translation dictionary editor */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <PencilLine className="w-4 h-4 text-[#B37E28]" />
              Custom Localized Dictionary (JSON Labels)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Override any built-in label per language. Empty = use built-in translation.
              {totalCustom > 0 && (
                <strong className="text-amber-700"> {totalCustom} overrides active.</strong>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => resetCustomTranslations()}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset All Overrides
          </button>
        </div>

        {/* Dictionary language picker */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Editing dictionary:</span>
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setDictLang(l.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                dictLang === l.code
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {l.nativeName}
              {customCount(l.code) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-[#0F172A] text-[10px]">
                  {customCount(l.code)}
                </span>
              )}
            </button>
          ))}
          {customCount(dictLang) > 0 && (
            <button
              type="button"
              onClick={() => resetCustomTranslations(dictLang)}
              className="px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Clear {dictLang.toUpperCase()} overrides
            </button>
          )}
        </div>

        {/* Search */}
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search labels e.g. booking, nav, hero..."
          className={inputCls}
        />

        {/* Grouped key editor */}
        <div className="space-y-3">
          {sections.map((section) => {
            const keys = filteredKeys.filter((k) => k.section === section);
            if (keys.length === 0) return null;
            const isOpen = expandedSection === section || searchQuery.length > 0;
            return (
              <div
                key={section}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSection(isOpen && !searchQuery ? null : section)}
                  className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {section} Labels ({keys.length})
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="p-4 space-y-3 bg-white">
                    {keys.map((item) => {
                      const builtin = DEFAULT_TRANSLATIONS[dictLang][item.key];
                      const custom =
                        loc?.customTranslations?.[dictLang]?.[item.key] || '';
                      return (
                        <div key={item.key}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-slate-600">
                              {item.label}
                              <span className="ml-1.5 font-mono font-normal text-slate-400">
                                {item.key}
                              </span>
                            </label>
                            {custom && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" /> Custom
                              </span>
                            )}
                          </div>
                          <input
                            value={custom}
                            placeholder={builtin}
                            dir={dictLang === 'ar' ? 'rtl' : 'ltr'}
                            onChange={(e) =>
                              updateCustomTranslation(dictLang, item.key, e.target.value)
                            }
                            className={`${inputCls} ${custom ? 'border-amber-300 bg-amber-50/40' : ''}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 leading-relaxed">
          <strong>How it works:</strong> each language ships with a built-in professional
          translation ({TRANSLATION_KEY_LABELS.length} editable labels). Your overrides are
          stored per language inside the exported brand JSON, so every white-label client
          can ship their own wording.
        </div>
      </div>
    </div>
  );
};

export default LanguagesTab;
