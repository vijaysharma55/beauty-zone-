import { z } from 'zod';

// Shared by the wizard and the API. Drafts deliberately accept incomplete
// values; the step schemas are only applied when advancing or completing.
export const ONBOARDING_STEPS = [
  { title: 'Salon identity', shortTitle: 'Identity', fields: ['name', 'slug', 'tagline', 'description'] },
  { title: 'Location & contact', shortTitle: 'Location', fields: ['addressLine', 'city', 'state', 'phone', 'email'] },
  { title: 'Owner & branding', shortTitle: 'Branding', fields: ['ownerName', 'ownerPhone', 'logoUrl', 'coverImage'] },
  { title: 'Template & hours', shortTitle: 'Finish', fields: ['templateId', 'timings'] },
];

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
export const DEFAULT_ONBOARDING_TIMINGS = [
  { day: 'mon', open: '10:00', close: '20:00', closed: false },
  { day: 'tue', open: '10:00', close: '20:00', closed: false },
  { day: 'wed', open: '10:00', close: '20:00', closed: false },
  { day: 'thu', open: '10:00', close: '20:00', closed: false },
  { day: 'fri', open: '10:00', close: '21:00', closed: false },
  { day: 'sat', open: '09:00', close: '21:00', closed: false },
  { day: 'sun', open: '11:00', close: '18:00', closed: true },
];

export const RESERVED_ONBOARDING_SLUGS = new Set([
  'admin', 'api', 'login', 'logout', 'register', 'signup', 'signin', 'dashboard', 'onboarding',
  'preview', 'publish', 'settings', 'billing', 'account', 'salon', 'salons', 'www', 'app', 'assets',
  'static', 'public', 'help', 'support', 'terms', 'privacy',
]);

export function onboardingSlugify(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
    .replace(/-+$/g, '');
}

const requiredText = (label, max, min = 1) => z.string().max(max, `${label} must be ${max} characters or fewer.`)
  .refine((value) => value.trim().length >= min, `${label} is required${min > 1 ? ` (at least ${min} characters)` : ''}.`);
const phoneIsValid = (value) => {
  const text = value.trim();
  const digits = text.replace(/\D/g, '');
  return /^\+?[\d\s()-]+$/.test(text) && digits.length >= 8 && digits.length <= 15;
};
export function isOnboardingImageUrl(value) {
  const url = String(value || '').trim();
  if (/^\/(api\/uploads|images)\/[A-Za-z0-9._-]+$/.test(url)) return true;
  if (/\s/.test(url)) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
const image = (label) => z.string().max(2048, `${label} URL is too long.`)
  .refine(isOnboardingImageUrl, `Upload ${label.toLowerCase()} or enter a valid http(s) image URL.`);
const timingEntry = z.object({
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  open: z.string().max(5), close: z.string().max(5), closed: z.boolean(),
});
const timings = z.array(timingEntry).length(7, 'Set opening hours for all seven days.').superRefine((entries, ctx) => {
  if (new Set(entries.map((entry) => entry.day)).size !== 7) {
    ctx.addIssue({ code: 'custom', message: 'Each day must appear once.' });
  }
  if (entries.every((entry) => entry.closed)) {
    ctx.addIssue({ code: 'custom', message: 'Select at least one open day.' });
  }
  entries.forEach((entry, index) => {
    if (!entry.closed && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.open)
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.close) || entry.open >= entry.close)) {
      ctx.addIssue({ code: 'custom', path: [index], message: 'Enter valid times; closing must be after opening.' });
    }
  });
});

export const onboardingValuesSchema = z.object({
  name: requiredText('Salon name', 120, 2),
  slug: z.string().max(60).refine(
    (value) => /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(value) && !value.includes('--') && !RESERVED_ONBOARDING_SLUGS.has(value),
    'Use 3–60 lowercase letters, numbers or single hyphens. Reserved addresses cannot be used.'
  ),
  tagline: requiredText('Tagline', 160),
  description: requiredText('Description', 3000),
  addressLine: requiredText('Address', 300),
  city: requiredText('City', 100),
  state: requiredText('State / region', 100),
  phone: z.string().max(40).refine(phoneIsValid, 'Enter a valid phone number with 8–15 digits.'),
  email: z.string().max(254).refine((value) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value.trim()), 'Enter a valid business email.'),
  ownerName: z.string().max(120, 'Owner name must be 120 characters or fewer.'),
  ownerPhone: z.string().max(40).refine((value) => !value.trim() || phoneIsValid(value), 'Enter a valid phone number with 8–15 digits.'),
  logoUrl: image('A salon logo'),
  coverImage: image('A hero image'),
  templateId: z.enum(['luxe', 'minimal', 'noir', 'blush']),
  timings,
});

export const onboardingStepSchemas = ONBOARDING_STEPS.map(({ fields }) =>
  onboardingValuesSchema.pick(Object.fromEntries(fields.map((field) => [field, true])))
);

const draftValuesSchema = z.object({
  name: z.string().max(120), slug: z.string().max(60), tagline: z.string().max(160),
  description: z.string().max(3000), addressLine: z.string().max(300), city: z.string().max(100),
  state: z.string().max(100), phone: z.string().max(40), email: z.string().max(254),
  ownerName: z.string().max(120), ownerPhone: z.string().max(40),
  logoUrl: z.string().max(2048), coverImage: z.string().max(2048),
  templateId: z.enum(['luxe', 'minimal', 'noir', 'blush']),
  timings: z.array(timingEntry).length(7),
});

export const onboardingDraftSchema = z.object({
  values: draftValuesSchema,
  currentStep: z.number().int().min(1).max(4),
  slugTouched: z.boolean(),
});

export function defaultOnboardingDraft(user = {}) {
  return {
    values: {
      name: '', slug: '', tagline: '', description: '', addressLine: '', city: '', state: '',
      phone: '', email: user.email || '', ownerName: user.name || '', ownerPhone: '',
      logoUrl: '', coverImage: '', templateId: 'luxe',
      timings: DEFAULT_ONBOARDING_TIMINGS.map((entry) => ({ ...entry })),
    },
    currentStep: 1,
    slugTouched: false,
  };
}

/** Never resume beyond an invalid prerequisite, even if storage was tampered with. */
export function safeOnboardingStep(draft) {
  const requested = Math.min(4, Math.max(1, Number(draft.currentStep) || 1));
  for (let step = 1; step < requested; step += 1) {
    if (!onboardingStepSchemas[step - 1].safeParse(draft.values).success) return step;
  }
  return requested;
}

/** Reject jumps and edits outside the currently open section at the API boundary. */
export function checkDraftTransition(previous, next) {
  if (!previous) return next.currentStep === 1 ? null : 'Start with salon identity before moving to the next step.';
  const delta = next.currentStep - previous.currentStep;
  if (Math.abs(delta) > 1) return 'Complete each step in order.';
  const oldValues = previous.values;
  const newValues = next.values;
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (delta !== 0) {
    if (!equal(oldValues, newValues) || previous.slugTouched !== next.slugTouched) {
      return 'Save your changes before moving between steps.';
    }
    if (delta > 0 && !onboardingStepSchemas[previous.currentStep - 1].safeParse(oldValues).success) {
      return 'Complete the required fields in this step before continuing.';
    }
  } else {
    const editable = new Set(ONBOARDING_STEPS[previous.currentStep - 1].fields);
    for (const field of Object.keys(oldValues)) {
      if (!editable.has(field) && !equal(oldValues[field], newValues[field])) {
        return 'Only the current step can be edited.';
      }
    }
    if (previous.currentStep !== 1 && previous.slugTouched !== next.slugTouched) return 'Only the current step can be edited.';
  }
  return null;
}
