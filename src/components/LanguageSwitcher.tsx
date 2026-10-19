import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { SUPPORTED_LANGUAGES } from '../data/i18nData';
import { SupportedLanguage } from '../types';

interface LanguageSwitcherProps {
  variant?: 'dark' | 'light' | 'gold';
  compact?: boolean;
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dark',
  compact = false,
  className = '',
}) => {
  const { brand, language, setLanguage } = useBrand();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const enabledCodes: SupportedLanguage[] =
    brand.localization?.enabledLanguages?.length > 0
      ? brand.localization.enabledLanguages
      : (['en'] as SupportedLanguage[]);

  const enabledLanguages = SUPPORTED_LANGUAGES.filter((l) =>
    enabledCodes.includes(l.code)
  );

  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (brand.localization && brand.localization.showLanguageSwitcher === false) {
    return null;
  }

  if (enabledLanguages.length <= 1) {
    return null;
  }

  const buttonStyles =
    variant === 'dark'
      ? 'bg-white/10 hover:bg-white/15 border-white/20 text-[#FAF5E5]'
      : variant === 'gold'
        ? 'bg-[#D09A40]/15 hover:bg-[#D09A40]/25 border-[#D09A40]/40 text-[#D09A40]'
        : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm';

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 border rounded-full font-semibold transition-all cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
        } ${buttonStyles}`}
        title={`Website Language: ${current.name} (${current.nativeName})`}
        aria-label="Switch website language"
        aria-expanded={open}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        {!compact && <span>{current.nativeName}</span>}
        {compact && <span>{current.badge}</span>}
        <ChevronDown
          className={`w-3 h-3 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-2 end-0 min-w-[220px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[90] animate-fadeIn">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Website Language / भाषा
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1.5">
            {enabledLanguages.map((lang) => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors cursor-pointer ${
                    active ? 'bg-[#D09A40]/10' : 'hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      active
                        ? 'bg-[#0F172A] text-[#D09A40]'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {lang.badge}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-sm font-semibold leading-tight ${
                        active ? 'text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {lang.nativeName}
                    </span>
                    <span className="block text-[11px] text-slate-500 leading-tight mt-0.5">
                      {lang.name} · {lang.regionLabel}
                    </span>
                  </span>
                  {active && <Check className="w-4 h-4 text-[#B37E28] shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              {enabledLanguages.length} languages enabled by salon owner
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
