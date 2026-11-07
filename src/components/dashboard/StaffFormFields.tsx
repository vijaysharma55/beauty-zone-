import React, { useMemo, useState } from 'react';
import { Check, CheckCheck, Plus, Search, X } from 'lucide-react';
import { Button, Input, cn } from '../ui';
import {
  MAX_STAFF_SKILLS,
  STAFF_SKILL_SUGGESTIONS,
  WEEKDAYS,
  maskMobileNumber,
  normalizeIndianMobile,
  normalizeSkillList,
  type StaffScheduleDay,
} from '../../lib/staffRoles.js';
import type { SalonService } from '../../types/auth';

/* ------------------------------------------------------------------ */
/* Skills — interactive pill/tag selector                              */
/* ------------------------------------------------------------------ */

interface SkillTagSelectorProps {
  value: string[];
  onChange: (skills: string[]) => void;
  id?: string;
}

/**
 * Pill selector for specialisations.
 *
 * Suggestions are one tap to add/remove; owners can also type any custom skill
 * (e.g. "Russian Manicure") and press Enter. Values are trimmed and
 * de-duplicated case-insensitively by `normalizeSkillList`.
 */
export const SkillTagSelector: React.FC<SkillTagSelectorProps> = ({ value, onChange, id = 'staff-skills' }) => {
  const [customSkill, setCustomSkill] = useState('');
  const selected = normalizeSkillList(value);
  const selectedKeys = new Set(selected.map((skill) => skill.toLowerCase()));

  // Surface custom skills the owner added earlier so they never disappear.
  const customSkills = selected.filter(
    (skill) => !STAFF_SKILL_SUGGESTIONS.some((s) => s.toLowerCase() === skill.toLowerCase())
  );

  const toggle = (skill: string) => {
    const key = skill.toLowerCase();
    if (selectedKeys.has(key)) {
      onChange(selected.filter((item) => item.toLowerCase() !== key));
      return;
    }
    if (selected.length >= MAX_STAFF_SKILLS) return;
    onChange([...selected, skill]);
  };

  const addCustom = () => {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    if (selected.length >= MAX_STAFF_SKILLS) return;
    const next = normalizeSkillList([...selected, trimmed]);
    onChange(next);
    setCustomSkill('');
  };

  const atLimit = selected.length >= MAX_STAFF_SKILLS;

  return (
    <div id={id} className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggested skills">
        {STAFF_SKILL_SUGGESTIONS.map((skill) => {
          const active = selectedKeys.has(skill.toLowerCase());
          return (
            <button
              key={skill}
              type="button"
              aria-pressed={active}
              disabled={!active && atLimit}
              onClick={() => toggle(skill)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D09A40]',
                active
                  ? 'border-[#D09A40] bg-[#D09A40]/15 text-[#6d4f14]'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-[#D09A40]/60 hover:bg-[#D09A40]/5',
                !active && atLimit && 'cursor-not-allowed opacity-50'
              )}
            >
              {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {skill}
            </button>
          );
        })}
      </div>

      {customSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Custom skills">
          {customSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {skill}
              <button
                type="button"
                onClick={() => toggle(skill)}
                aria-label={`Remove ${skill}`}
                className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={customSkill}
          onChange={(e) => setCustomSkill(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add a custom skill (e.g. Russian Manicure)"
          aria-label="Add a custom skill"
          maxLength={80}
        />
        <Button type="button" variant="secondary" size="sm" onClick={addCustom} disabled={!customSkill.trim() || atLimit}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        {selected.length}/{MAX_STAFF_SKILLS} selected · shown as pills on the website profile and booking cards.
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Service assignment — checkbox group                                 */
/* ------------------------------------------------------------------ */

interface ServiceAssignmentPickerProps {
  services: SalonService[];
  value: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  /** Deep-link to the Services dashboard when the catalogue is empty. */
  emptyAction?: React.ReactNode;
}

const categoryLabel = (category: string) =>
  category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Other';

/**
 * Checkbox group mapping the staff member to specific salon services.
 *
 * An empty selection means “not restricted”: the specialist stays eligible for
 * every service. Selecting services narrows the booking picker to just those.
 */
export const ServiceAssignmentPicker: React.FC<ServiceAssignmentPickerProps> = ({
  services,
  value,
  onChange,
  loading = false,
  emptyAction,
}) => {
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(value), [value]);
  const activeServices = useMemo(() => services.filter((service) => service.active !== false), [services]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? activeServices.filter(
          (service) =>
            service.name.toLowerCase().includes(q) || String(service.category || '').toLowerCase().includes(q)
        )
      : activeServices;
    const map = new Map<string, SalonService[]>();
    for (const service of filtered) {
      const key = String(service.category || 'other');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(service);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [activeServices, query]);

  const toggle = (id: string) => {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const selectAll = () => onChange(activeServices.map((service) => service.id));
  const clearAll = () => onChange([]);

  if (loading) {
    return <p className="text-xs text-slate-500">Loading your service catalogue…</p>;
  }

  if (activeServices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
        <p className="text-sm font-medium text-slate-700">No services in your catalogue yet</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Add services first, then map them to this team member so bookings route to the right specialist.
        </p>
        {emptyAction && <div className="mt-3 flex justify-center">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            aria-label="Search services"
            className="!py-1.5 pl-8 text-xs"
          />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
          <CheckCheck className="h-3.5 w-3.5" /> All
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={value.length === 0}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
        {grouped.length === 0 && <p className="py-4 text-center text-xs text-slate-500">No services match “{query}”.</p>}
        {grouped.map(([category, items]) => (
          <fieldset key={category}>
            <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {categoryLabel(category)} ({items.length})
            </legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {items.map((service) => {
                const checked = selected.has(service.id);
                return (
                  <label
                    key={service.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                      checked
                        ? 'border-[#D09A40] bg-[#D09A40]/10 text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(service.id)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#D09A40]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{service.name}</span>
                      <span className="block text-[11px] text-slate-500">
                        ₹{Math.round(service.pricePaise / 100).toLocaleString('en-IN')} · {service.durationMinutes} min
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        {value.length === 0
          ? 'No services selected — this team member can be booked for every service in your catalogue.'
          : `${value.length} of ${activeServices.length} services assigned. Only these services will offer this specialist online.`}
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Weekly schedule — day toggle + start/end time + closed             */
/* ------------------------------------------------------------------ */

interface WeeklyScheduleEditorProps {
  value: StaffScheduleDay[];
  onChange: (schedule: StaffScheduleDay[]) => void;
  /** Called with per-day validation messages (e.g. start after end). */
  errors?: Record<string, string>;
}

export const WeeklyScheduleEditor: React.FC<WeeklyScheduleEditorProps> = ({ value, onChange, errors = {} }) => {
  const byDay = useMemo(() => {
    const map = new Map<string, StaffScheduleDay>();
    for (const entry of value) map.set(entry.day, entry);
    return map;
  }, [value]);

  const update = (day: string, patch: Partial<StaffScheduleDay>) => {
    const next = WEEKDAYS.map(({ id }) => {
      const existing = byDay.get(id) || { day: id, startTime: '10:00', endTime: '20:00', closed: false };
      return id === day ? { ...existing, ...patch, day: id } : { ...existing, day: id };
    });
    onChange(next);
  };

  const openDays = value.filter((entry) => !entry.closed).length;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-slate-200">
        {WEEKDAYS.map(({ id, label, short }, index) => {
          const entry =
            byDay.get(id) || ({ day: id, startTime: '10:00', endTime: '20:00', closed: false } as StaffScheduleDay);
          const closed = Boolean(entry.closed);
          const error = errors[id];
          return (
            <div
              key={id}
              className={cn(
                'flex flex-wrap items-center gap-3 px-3 py-2',
                index !== 0 && 'border-t border-slate-100',
                closed ? 'bg-slate-50' : 'bg-white'
              )}
            >
              <label className="flex w-24 shrink-0 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={!closed}
                  onChange={(e) =>
                    update(id, {
                      closed: !e.target.checked,
                      startTime: e.target.checked ? entry.startTime || '10:00' : '',
                      endTime: e.target.checked ? entry.endTime || '20:00' : '',
                    })
                  }
                  className="h-4 w-4 rounded accent-[#D09A40]"
                  aria-label={`${label} working day`}
                />
                <span className="text-xs font-semibold text-slate-700" title={label}>
                  {short}
                </span>
              </label>

              {closed ? (
                <span className="text-xs font-medium text-slate-500">
                  Closed <span className="ml-1 font-mono text-slate-400">[--:--]</span>
                </span>
              ) : (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    type="time"
                    step="900"
                    value={entry.startTime || ''}
                    onChange={(e) => update(id, { startTime: e.target.value })}
                    aria-label={`${label} start time`}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-[#D09A40] focus:outline-none focus:ring-2 focus:ring-[#D09A40]/25"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="time"
                    step="900"
                    value={entry.endTime || ''}
                    onChange={(e) => update(id, { endTime: e.target.value })}
                    aria-label={`${label} end time`}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-[#D09A40] focus:outline-none focus:ring-2 focus:ring-[#D09A40]/25"
                  />
                  <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => update(id, { closed: true, startTime: '', endTime: '' })}
                      className="h-3.5 w-3.5 rounded accent-slate-500"
                    />
                    Closed this day
                  </label>
                </div>
              )}

              {error && <p className="w-full text-[11px] font-medium text-red-600">{error}</p>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        {openDays === 0
          ? 'Every day is closed — this team member will not appear in the online booking picker.'
          : `${openDays} working ${openDays === 1 ? 'day' : 'days'} · 15-minute increments. Clients can only book inside these hours.`}
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Mobile number — +91 input with private toggle                       */
/* ------------------------------------------------------------------ */

interface MobileNumberFieldProps {
  value: string;
  hideValue: boolean;
  onChange: (value: string) => void;
  onHideChange: (hidden: boolean) => void;
  id?: string;
}

export const MobileNumberField: React.FC<MobileNumberFieldProps> = ({
  value,
  hideValue,
  onChange,
  onHideChange,
  id = 'staff-mobile',
}) => {
  const trimmed = value.trim();
  const check = trimmed ? normalizeIndianMobile(trimmed) : { ok: true, value: '', error: null };
  const digits = trimmed.replace(/\D/g, '');

  return (
    <div className="space-y-2">
      <div className="flex rounded-lg border border-slate-300 bg-white focus-within:border-[#D09A40] focus-within:ring-2 focus-within:ring-[#D09A40]/25">
        <span className="flex items-center rounded-l-lg border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
          +91
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={trimmed}
          onChange={(e) => onChange(e.target.value)}
          placeholder="98765 43210"
          aria-label="Mobile number (10 digits)"
          maxLength={20}
          className="w-full rounded-r-lg bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>
      {digits.length > 0 && !check.ok && <p className="text-xs font-medium text-red-600">{check.error}</p>}
      {digits.length > 0 && check.ok && (
        <p className="text-xs text-slate-500">
          Saved as <span className="font-mono">{check.value}</span>
          {hideValue && <span className="ml-2 text-slate-400">· list view shows {maskMobileNumber(check.value)}</span>}
        </p>
      )}
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <input
          type="checkbox"
          checked={hideValue}
          onChange={(e) => onHideChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#D09A40]"
        />
        <span>
          <span className="block text-xs font-medium text-slate-800">Hide mobile number from public/staff list</span>
          <span className="mt-0.5 block text-[11px] text-slate-500">
            Staff mobile numbers are never published on your website. Enable this to also mask it in list views, so
            only you can see the full number.
          </span>
        </span>
      </label>
    </div>
  );
};
