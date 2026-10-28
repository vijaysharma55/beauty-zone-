import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ImagePlus,
  Link2,
  Loader2,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { SmartImage } from './SmartImage';
import { optimizeImageFile } from '../../lib/imageUtils';
import { ImageUploadComponent } from '../ImageUploadComponent';

export type EditorFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'url'
  | 'select'
  | 'tags'
  | 'checkbox'
  | 'image';

export interface EditorField {
  key: string;
  label: string;
  type?: EditorFieldType;
  options?: Array<{ value: string; label: string }> | string[];
  placeholder?: string;
  help?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  span?: 1 | 2;
  /** Tailwind aspect utility used by the image preview, e.g. aspect-[4/3]. */
  aspect?: string;
  separator?: 'comma' | 'newline';
}

interface CardEditorModalProps {
  title: string;
  description?: string;
  fields: EditorField[];
  initialValues: Record<string, any>;
  submitLabel?: string;
  focusImage?: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, any>) => void;
  validate?: (values: Record<string, any>) => string | null;
}

const inputClass =
  'w-full rounded-xl border border-[#0F172A]/15 bg-white px-3 py-2 text-xs text-[#0F172A] outline-none transition-all placeholder:text-neutral-400 focus:border-[#D09A40] focus:ring-2 focus:ring-[#D09A40]/20';
const labelClass =
  'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-600';

const prepareValues = (fields: EditorField[], initialValues: Record<string, any>) => {
  const next: Record<string, any> = { ...initialValues };
  fields.forEach((field) => {
    if (field.type === 'tags' && Array.isArray(next[field.key])) {
      next[field.key] = next[field.key].join(
        field.separator === 'newline' ? '\n' : ', '
      );
    }
  });
  return next;
};

const normalizeOptions = (
  options: EditorField['options']
): Array<{ value: string; label: string }> => {
  if (!options) return [];
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option
  );
};

const fieldId = (key: string) => `editor-field-${key}`;

const ImageField: React.FC<{
  field: EditorField;
  value: string;
  error?: string;
  highlighted?: boolean;
  onChange: (value: string) => void;
}> = ({ field, value, error, highlighted, onChange }) => {
  return (
    <div
      id={fieldId(field.key)}
      className={`sm:col-span-2 rounded-2xl border transition-all ${
        highlighted ? 'border-[#D09A40] ring-2 ring-[#D09A40]/35' : 'border-[#0F172A]/10'
      }`}
    >
      <ImageUploadComponent
        value={value}
        onChange={onChange}
        label={field.label}
        help={field.help}
        aspect={field.aspect || 'aspect-video'}
      />
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-red-600 px-4 pb-2">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export const CardEditorModal: React.FC<CardEditorModalProps> = ({
  title,
  description,
  fields,
  initialValues,
  submitLabel = 'Save changes',
  focusImage = false,
  onClose,
  onSubmit,
  validate,
}) => {
  const [values, setValues] = useState<Record<string, any>>(() =>
    prepareValues(fields, initialValues)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const firstImageKey = fields.find((field) => field.type === 'image')?.key;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!focusImage || !firstImageKey) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(fieldId(firstImageKey))
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [firstImageKey, focusImage]);

  const updateValue = (key: string, value: any) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormError(null);
  };

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const value = values[field.key];
      if (field.required) {
        const empty =
          value === undefined ||
          value === null ||
          String(value).trim() === '';
        if (empty) nextErrors[field.key] = `${field.label} is required.`;
      }
      if (field.type === 'number' && value !== '' && value !== undefined) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          nextErrors[field.key] = 'Enter a valid number.';
        } else if (field.min !== undefined && parsed < field.min) {
          nextErrors[field.key] = `Enter a value of at least ${field.min}.`;
        } else if (field.max !== undefined && parsed > field.max) {
          nextErrors[field.key] = `Enter a value of ${field.max} or less.`;
        }
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Please fix the highlighted fields before saving.');
      return;
    }

    const coerced: Record<string, any> = { ...values };
    fields.forEach((field) => {
      if (field.type === 'tags') {
        coerced[field.key] = String(values[field.key] || '')
          .split(field.separator === 'newline' ? /\n/ : /[\n,]/)
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      if (field.type === 'number') {
        coerced[field.key] = Number(values[field.key]) || 0;
      }
      if (field.type === 'checkbox') {
        coerced[field.key] = !!values[field.key];
      }
    });

    const customError = validate?.(coerced) || null;
    if (customError) {
      setFormError(customError);
      return;
    }

    onSubmit(coerced);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0F172A]/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-editor-title"
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[#D09A40]/30 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#0F172A]/10 bg-[#0F172A] px-5 py-4 text-white sm:px-6">
          <div className="min-w-0">
            <h3 id="card-editor-title" className="font-serif text-lg font-bold leading-tight sm:text-xl">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-[11px] leading-relaxed text-white/70">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {formError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-semibold text-red-700"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const type = field.type || 'text';
              const value = values[field.key];
              const error = errors[field.key];
              const spanClass = field.span === 2 ? 'sm:col-span-2' : '';

              if (type === 'image') {
                return (
                  <ImageField
                    key={field.key}
                    field={field}
                    value={typeof value === 'string' ? value : ''}
                    error={error}
                    highlighted={focusImage && firstImageKey === field.key}
                    onChange={(next) => updateValue(field.key, next)}
                  />
                );
              }

              if (type === 'checkbox') {
                return (
                  <label
                    key={field.key}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#0F172A]/12 bg-[#FAF5E5]/45 px-3.5 py-3 ${spanClass}`}
                  >
                    <span className="text-xs font-semibold text-[#0F172A]">{field.label}</span>
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(event) => updateValue(field.key, event.target.checked)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 accent-[#D09A40]"
                    />
                  </label>
                );
              }

              return (
                <div key={field.key} className={spanClass}>
                  <label htmlFor={fieldId(field.key)} className={labelClass}>
                    {field.label}
                    {field.required && <span className="ml-1 text-[#D09A40]">*</span>}
                  </label>

                  {type === 'textarea' || type === 'tags' ? (
                    <textarea
                      id={fieldId(field.key)}
                      rows={field.rows || (type === 'tags' ? 3 : 3)}
                      value={value ?? ''}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      className={`${inputClass} resize-y leading-relaxed ${
                        error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                      }`}
                    />
                  ) : type === 'select' ? (
                    <select
                      id={fieldId(field.key)}
                      value={value ?? ''}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      className={`${inputClass} cursor-pointer ${
                        error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                      }`}
                    >
                      <option value="">Select {field.label.toLowerCase()}</option>
                      {normalizeOptions(field.options).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={fieldId(field.key)}
                      type={type === 'number' ? 'number' : type === 'url' ? 'url' : 'text'}
                      inputMode={type === 'number' ? 'decimal' : undefined}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={value ?? ''}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      className={`${inputClass} ${
                        error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''
                      }`}
                    />
                  )}

                  {field.help && !error && (
                    <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">{field.help}</p>
                  )}
                  {error && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-red-600">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#0F172A]/10 bg-[#FAF5E5]/70 px-4 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F172A]/15 bg-white px-4 py-2.5 text-xs font-bold text-[#0F172A] transition-colors hover:bg-neutral-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#D09A40] hover:text-[#0F172A] cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
