import React, { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button, Field, Input, Select } from '../ui';
import {
  MAX_SERVICE_CATEGORY_LENGTH,
  MAX_SERVICE_SUBCATEGORY_LENGTH,
  normalizeServiceCategory,
  normalizeServiceSubcategory,
  serviceCategoryLabel,
} from '../../lib/serviceCategories.js';
import type { ServiceCategoryOption } from '../../types/auth';

const NEW_VALUE = '__new__';

/**
 * Two-level category selector.
 *
 * Owners pick a main category from the presets + their own custom ones, or
 * switch the dropdown to "Add new category" and type one. The subcategory
 * options are the suggestions for that category merged with every subcategory
 * already used in the catalogue, and a new one can be typed inline.
 */
export const ServiceCategoryPicker: React.FC<{
  category: string;
  subcategory: string;
  options: ServiceCategoryOption[];
  onChange: (next: { category: string; subcategory: string }) => void;
  disabled?: boolean;
  categoryError?: string;
  subcategoryError?: string;
  recommendedCategoryValues?: string[];
  categoryOrder?: string[];
  showAllCategories?: boolean;
  onToggleAllCategories?: (showAll: boolean) => void;
}> = ({ category, subcategory, options, onChange, disabled = false, categoryError, subcategoryError, recommendedCategoryValues = [], categoryOrder = [], showAllCategories = false, onToggleAllCategories }) => {
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingSubcategory, setAddingSubcategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [subcategoryDraft, setSubcategoryDraft] = useState('');
  const [localError, setLocalError] = useState('');

  const isCustomCategory = useMemo(
    () => Boolean(category) && !options.some((option) => option.value === category && !option.custom),
    [category, options]
  );

  const orderedOptions = useMemo(() => {
    if (!categoryOrder.length) return options;
    const rank = new Map<string, number>(categoryOrder.map((value, index) => [value, index] as const));
    return [...options].sort((a, b) => {
      const aRank = rank.get(a.value) ?? Number.MAX_SAFE_INTEGER;
      const bRank = rank.get(b.value) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank || a.label.localeCompare(b.label);
    });
  }, [options, categoryOrder]);

  const recommendedOptions = useMemo(
    () => orderedOptions.filter((option) => recommendedCategoryValues.includes(option.value)),
    [orderedOptions, recommendedCategoryValues]
  );

  const visibleOptions = useMemo(() => {
    if (showAllCategories || !recommendedOptions.length) return orderedOptions;
    const selected = orderedOptions.find((option) => option.value === normalizeServiceCategory(category));
    return [...recommendedOptions, ...(selected && !recommendedOptions.some((option) => option.value === selected.value) ? [selected] : [])];
  }, [orderedOptions, recommendedOptions, showAllCategories, category]);

  const activeOption = useMemo(
    () => options.find((option) => option.value === normalizeServiceCategory(category)) || null,
    [category, options]
  );

  /** Suggested subcategories + everything already used for this category. */
  const subcategoryOptions = useMemo(() => {
    const values: string[] = [...(activeOption?.subcategories || [])];
    if (subcategory) values.push(subcategory);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of values) {
      const label = normalizeServiceSubcategory(value);
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
    return out;
  }, [activeOption, subcategory]);

  const submitCategory = () => {
    const next = normalizeServiceCategory(categoryDraft);
    if (!next) {
      setLocalError('Enter a category name.');
      return;
    }
    setLocalError('');
    // A new main category starts without a subcategory; the picker then offers
    // the (empty) suggestion list so a subcategory can be typed straight away.
    onChange({ category: next, subcategory: '' });
    setCategoryDraft('');
    setAddingCategory(false);
  };

  const submitSubcategory = () => {
    const next = normalizeServiceSubcategory(subcategoryDraft);
    if (!next) {
      setLocalError('Enter a subcategory name.');
      return;
    }
    setLocalError('');
    onChange({ category: normalizeServiceCategory(category), subcategory: next });
    setSubcategoryDraft('');
    setAddingSubcategory(false);
  };

  const selectValue = addingCategory ? NEW_VALUE : normalizeServiceCategory(category) || '';

  return (
    <div className="space-y-3">
      {recommendedOptions.length > 0 && (
        <div className="rounded-xl border border-[#D09A40]/25 bg-[#D09A40]/5 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a641f]">Recommended categories</p>
            <button type="button" onClick={() => onToggleAllCategories?.(!showAllCategories)} className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900">
              {showAllCategories ? 'Show recommended only' : 'Show all categories'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recommendedOptions.map((option) => (
              <button key={option.value} type="button" disabled={disabled} onClick={() => onChange({ category: option.value, subcategory: '' })} aria-pressed={normalizeServiceCategory(category) === option.value} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${normalizeServiceCategory(category) === option.value ? 'border-[#D09A40] bg-[#D09A40]/15 text-[#76551f]' : 'border-[#D09A40]/30 bg-white text-slate-700 hover:bg-[#D09A40]/10'} disabled:opacity-50`}>
                {option.label}<span className="ml-1.5 text-[9px] uppercase tracking-wide text-[#98702d]">Recommended</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Main category" htmlFor="service-category" required error={categoryError}>
          {addingCategory ? (
            <div className="flex gap-2">
              <Input
                id="service-category-new"
                autoFocus
                value={categoryDraft}
                maxLength={MAX_SERVICE_CATEGORY_LENGTH}
                placeholder="e.g. Piercing, Extensions, Bridal Party"
                onChange={(e) => setCategoryDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitCategory();
                  }
                  if (e.key === 'Escape') setAddingCategory(false);
                }}
                disabled={disabled}
              />
              <Button type="button" size="sm" variant="gold" onClick={submitCategory} disabled={disabled}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAddingCategory(false)}
                disabled={disabled}
                aria-label="Cancel new category"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Select
              id="service-category"
              value={selectValue}
              disabled={disabled}
              onChange={(e) => {
                const value = e.target.value;
                if (value === NEW_VALUE) {
                  setAddingCategory(true);
                  setCategoryDraft('');
                  return;
                }
                onChange({ category: normalizeServiceCategory(value), subcategory: '' });
              }}
            >
              <option value="">Select a category…</option>
              {visibleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.custom ? ' (custom)' : ''}
                </option>
              ))}
              <option value={NEW_VALUE}>+ Add new category…</option>
            </Select>
          )}
        </Field>

        <Field
          label="Subcategory"
          htmlFor="service-subcategory"
          error={subcategoryError}
          hint={category ? undefined : 'Choose a main category first.'}
        >
          {addingSubcategory ? (
            <div className="flex gap-2">
              <Input
                id="service-subcategory-new"
                autoFocus
                value={subcategoryDraft}
                maxLength={MAX_SERVICE_SUBCATEGORY_LENGTH}
                placeholder="e.g. Gel Nails, Acrylic Nails"
                onChange={(e) => setSubcategoryDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitSubcategory();
                  }
                  if (e.key === 'Escape') setAddingSubcategory(false);
                }}
                disabled={disabled}
              />
              <Button type="button" size="sm" variant="gold" onClick={submitSubcategory} disabled={disabled}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAddingSubcategory(false)}
                disabled={disabled}
                aria-label="Cancel new subcategory"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Select
              id="service-subcategory"
              value={normalizeServiceSubcategory(subcategory)}
              disabled={disabled || !category}
              onChange={(e) => {
                const value = e.target.value;
                if (value === NEW_VALUE) {
                  setAddingSubcategory(true);
                  setSubcategoryDraft('');
                  return;
                }
                onChange({ category: normalizeServiceCategory(category), subcategory: value });
              }}
            >
              <option value="">No subcategory</option>
              {subcategoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={NEW_VALUE}>+ Add new subcategory…</option>
            </Select>
          )}
        </Field>
      </div>

      {isCustomCategory && !addingCategory && (
        <p className="text-xs text-slate-500">
          <strong className="font-semibold text-slate-700">{serviceCategoryLabel(category)}</strong> is a custom
          category. It will appear on your website exactly as typed.
        </p>
      )}

      {category && subcategory && !addingSubcategory && (
        <p className="text-xs text-slate-500">
          Grouped as <span className="font-medium text-slate-700">{serviceCategoryLabel(category)}</span> ›{' '}
          <span className="font-medium text-slate-700">{normalizeServiceSubcategory(subcategory)}</span>
        </p>
      )}

      {localError && <p className="text-xs font-medium text-red-600">{localError}</p>}
    </div>
  );
};
