import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900',
  gold: 'bg-[#D09A40] text-slate-900 hover:bg-[#DCA54A] focus-visible:outline-[#D09A40] shadow-sm',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-base px-6 py-3 gap-2',
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
  }
> = ({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...rest }) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
      buttonVariants[variant],
      buttonSizes[size],
      className
    )}
  >
    {loading && <Spinner className="w-4 h-4" />}
    {children}
  </button>
);

export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('bg-white border border-slate-200 rounded-2xl shadow-sm', className)}>{children}</div>
);

export const CardHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, action, className }) => (
  <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-slate-100', className)}>
    <div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
    </div>
    {action}
  </div>
);

export const Field: React.FC<{
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ label, htmlFor, hint, error, required, children, className }) => (
  <div className={cn('space-y-1.5', className)}>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

const controlClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#D09A40] focus:outline-none focus:ring-2 focus:ring-[#D09A40]/25 disabled:bg-slate-50 disabled:text-slate-500';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} {...rest} className={cn(controlClass, className)} />
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea ref={ref} {...rest} className={cn(controlClass, 'min-h-[90px]', className)} />
  )
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} {...rest} className={cn(controlClass, 'pr-8', className)}>
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Renders the switch only (label kept for screen readers via aria-label). */
  hideLabel?: boolean;
}> = ({ checked, onChange, label, description, disabled, hideLabel = false }) => (
  <label className={cn('flex cursor-pointer select-none', hideLabel ? 'items-center' : 'items-start gap-3')}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D09A40]',
        checked ? 'bg-[#D09A40]' : 'bg-slate-300',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span
        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
    {!hideLabel && (
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
    )}
  </label>
);

type BadgeTone = 'green' | 'amber' | 'red' | 'slate' | 'blue' | 'gold';

const badgeTones: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  gold: 'bg-[#D09A40]/10 text-[#8a641f] border-[#D09A40]/30',
};

export const Badge: React.FC<{ tone?: BadgeTone; children: React.ReactNode; className?: string }> = ({
  tone = 'slate',
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
      badgeTones[tone],
      className
    )}
  >
    {children}
  </span>
);

export const Alert: React.FC<{ tone?: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({
  tone = 'info',
  children,
}) => {
  const tones = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  } as const;
  return <div className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone])}>{children}</div>;
};

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}> = ({ open, onClose, title, children, footer, maxWidth = 'max-w-xl' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('w-full bg-white rounded-2xl shadow-2xl my-auto', maxWidth)}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="text-center py-12 px-6">
    {icon && <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon}</div>}
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    {description && <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">{description}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
}> = ({ label, value, hint, icon }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {icon && <div className="rounded-xl bg-[#D09A40]/10 p-2.5 text-[#8a641f]">{icon}</div>}
    </div>
  </Card>
);

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a641f]">{eyebrow}</p>}
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const formatCurrency = (paise: number, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format((paise || 0) / 100);
  } catch {
    return `₹${Math.round((paise || 0) / 100)}`;
  }
};

export const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/* ------------------------------------------------------------------ */
/* Theme-bound action + switch primitives                              */
/* ------------------------------------------------------------------ */
/* These render the `.primary-action` / `.secondary-action` / ...       */
/* classes defined in index.css, so every button and switch follows the  */
/* live white-label theme instead of hard-coded Tailwind hex values.    */
/* ------------------------------------------------------------------ */

export type ActionVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverted';
export type ActionSize = 'sm' | 'md' | 'lg';

const actionVariantClass: Record<ActionVariant, string> = {
  primary: 'primary-action',
  secondary: 'secondary-action',
  ghost: 'ghost-action',
  danger: 'danger-action',
  inverted: 'inverted-action',
};

const actionSizeClass: Record<ActionSize, string> = {
  sm: 'action-sm',
  md: 'action-md',
  lg: 'action-lg',
};

export const ActionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ActionVariant;
    size?: ActionSize;
    loading?: boolean;
    block?: boolean;
  }
> = ({ variant = 'primary', size = 'md', loading = false, block = false, className, children, disabled, type = 'button', ...rest }) => (
  <button
    {...rest}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(
      'action-base',
      actionVariantClass[variant],
      actionSizeClass[size],
      block && 'w-full',
      className
    )}
  >
    {loading && <Spinner className="h-4 w-4" />}
    {children}
  </button>
);

/**
 * Accessible on/off switch (role="switch").
 * Used for controls such as "accepts online booking" on a specialist.
 */
export const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  hideLabel?: boolean;
  id?: string;
}> = ({ checked, onChange, label, description, disabled, hideLabel = false, id }) => (
  <label
    htmlFor={id}
    className={cn('flex select-none', hideLabel ? 'items-center' : 'items-start gap-3', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
  >
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="toggle-switch"
    >
      <span className="toggle-switch__knob" />
    </button>
    {!hideLabel && (
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
    )}
  </label>
);

/** Small status pill built on the themed `.status-chip` classes. */
export const StatusChip: React.FC<{
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className }) => (
  <span className={cn('status-chip', `status-chip--${tone}`, className)}>{children}</span>
);
