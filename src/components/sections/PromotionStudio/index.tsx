import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BadgePercent, CalendarDays, Check, Copy, Download,
  ExternalLink, Globe, Image as ImageIcon, Instagram, Megaphone, MessageCircle,
  Palette, Share2, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Badge, Button, Card, PageHeader } from '../../ui';

type TemplateId = 'luxe' | 'blush' | 'minimal' | 'botanical';
type PosterFormat = 'portrait' | 'story';
type CampaignGoal = 'new-clients' | 'fill-slots' | 'promote-service';

interface CampaignDraft {
  templateId: TemplateId;
  format: PosterFormat;
  goal: CampaignGoal;
  headline: string;
  subheadline: string;
  serviceName: string;
  offerText: string;
  promoCode: string;
  validUntil: string;
  ctaText: string;
  caption: string;
  accentColor: string;
}

interface PosterTemplate {
  id: TemplateId;
  name: string;
  description: string;
  background: string;
  foreground: string;
  accent: string;
  muted: string;
  border: string;
}

const TEMPLATES: PosterTemplate[] = [
  { id: 'luxe', name: 'Midnight Luxe', description: 'Dark editorial style with a warm gold accent.', background: '#111827', foreground: '#FFF9EE', accent: '#D09A40', muted: '#D6C8AE', border: '#80633A' },
  { id: 'blush', name: 'Soft Blush', description: 'A soft, feminine look for beauty and bridal offers.', background: '#FFF0F3', foreground: '#471D2D', accent: '#C75D83', muted: '#865A6A', border: '#E6B5C5' },
  { id: 'minimal', name: 'Modern Minimal', description: 'Clean typography and a calm premium layout.', background: '#F5F1E9', foreground: '#29251F', accent: '#A67B4B', muted: '#746B60', border: '#CFC4B5' },
  { id: 'botanical', name: 'Botanical Calm', description: 'Fresh natural tones for skin, hair and wellness.', background: '#EAF1E8', foreground: '#20372B', accent: '#5B8069', muted: '#61766A', border: '#B8CBB9' },
];

const STORAGE_PREFIX = 'beautyzone.promotion-studio.draft:';

function dateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function initialDraft(): CampaignDraft {
  return {
    templateId: 'luxe',
    format: 'portrait',
    goal: 'new-clients',
    headline: 'A little glow goes a long way',
    subheadline: 'Your moment to look and feel amazing starts here.',
    serviceName: 'Signature salon services',
    offerText: '20% OFF',
    promoCode: 'GLOW20',
    validUntil: dateAfterDays(7),
    ctaText: 'BOOK YOUR APPOINTMENT',
    caption: '',
    accentColor: '#D09A40',
  };
}

function readDraft(key: string): CampaignDraft {
  const fallback = initialDraft();
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<CampaignDraft>;
    return {
      ...fallback,
      ...saved,
      templateId: TEMPLATES.some((item) => item.id === saved.templateId) ? (saved.templateId as TemplateId) : fallback.templateId,
      format: saved.format === 'story' ? 'story' : 'portrait',
    };
  } catch {
    return fallback;
  }
}

function wrapText(value: string, maxCharacters: number, maxLines = 3): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
    if (lines.length === maxLines - 1 && line.length > maxCharacters) {
      line = line.slice(0, maxCharacters - 1).trimEnd() + '…';
      break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length + 2) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[.…]*$/, '…');
  }
  return lines;
}

function findTemplate(id: TemplateId): PosterTemplate {
  return TEMPLATES.find((item) => item.id === id) || TEMPLATES[0];
}

function campaignCaption(draft: CampaignDraft, salonName: string, bookingUrl: string): string {
  if (draft.caption.trim()) return draft.caption.trim();
  return [
    draft.headline + ' ✨',
    draft.offerText + ' on ' + draft.serviceName + '.',
    draft.promoCode.trim() ? 'Use code ' + draft.promoCode.trim() + ' when booking.' : '',
    bookingUrl ? 'Book your appointment: ' + bookingUrl : '',
    '— ' + salonName,
  ].filter(Boolean).join('\n');
}

interface PosterArtworkProps {
  draft: CampaignDraft;
  salonName: string;
  bookingUrl: string;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

const PosterArtwork: React.FC<PosterArtworkProps> = ({ draft, salonName, bookingUrl, svgRef }) => {
  const template = findTemplate(draft.templateId);
  const height = draft.format === 'story' ? 1920 : 1350;
  const titleLines = wrapText(draft.headline || 'Your next beauty moment', draft.format === 'story' ? 24 : 27, draft.format === 'story' ? 3 : 2);
  const subtitleLines = wrapText(draft.subheadline || 'A little care goes a long way.', 38, 2);
  const titleY = draft.format === 'story' ? 560 : 370;
  const subtitleY = titleY + titleLines.length * 88 + 42;
  const offerY = Math.max(draft.format === 'story' ? 950 : 650, subtitleY + 105);
  const serviceY = offerY + 295;
  const ctaY = height - 260;
  const fontFamily = draft.templateId === 'minimal' ? 'Georgia, serif' : 'Arial, Helvetica, sans-serif';
  const accent = draft.accentColor || template.accent;
  const validDate = draft.validUntil
    ? new Date(draft.validUntil + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={'0 0 1080 ' + height}
      role="img"
      aria-label={'Promotional poster for ' + salonName}
      className="block h-auto w-full"
    >
      <defs>
        <linearGradient id="promotion-accent-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={template.accent} />
        </linearGradient>
        <radialGradient id="promotion-glow">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1080" height={height} fill={template.background} />
      <circle cx="930" cy="170" r="330" fill="url(#promotion-glow)" />
      <circle cx="90" cy={height - 80} r="330" fill="url(#promotion-glow)" opacity="0.65" />
      <rect x="38" y="38" width="1004" height={height - 76} rx="34" fill="none" stroke={template.border} strokeWidth="2" opacity="0.85" />
      <path d="M 105 245 H 975" stroke={template.border} strokeWidth="2" opacity="0.8" />
      <path d={'M 105 ' + (height - 165) + ' H 975'} stroke={template.border} strokeWidth="2" opacity="0.8" />

      <circle cx="540" cy="126" r="42" fill={accent} opacity="0.16" />
      <path d="M540 94 L548 118 L574 126 L548 134 L540 158 L532 134 L506 126 L532 118 Z" fill={accent} />
      <text x="540" y="205" textAnchor="middle" fill={template.foreground} fontFamily={fontFamily} fontSize="37" fontWeight="700" letterSpacing="4">
        {salonName.toUpperCase().slice(0, 28)}
      </text>
      <text x="540" y="233" textAnchor="middle" fill={template.muted} fontFamily="Arial, sans-serif" fontSize="15" letterSpacing="5">
        BEAUTY • SELF-CARE • CONFIDENCE
      </text>

      <text x="540" y={titleY - 82} textAnchor="middle" fill={accent} fontFamily="Arial, sans-serif" fontSize="20" fontWeight="700" letterSpacing="7">
        A SPECIAL TREAT FOR YOU
      </text>
      <text x="540" y={titleY} textAnchor="middle" fill={template.foreground} fontFamily={fontFamily} fontSize="76" fontWeight="700">
        {titleLines.map((line, index) => (
          <tspan key={'title-' + index} x="540" dy={index === 0 ? 0 : 88}>{line}</tspan>
        ))}
      </text>
      <text x="540" y={subtitleY} textAnchor="middle" fill={template.muted} fontFamily="Arial, sans-serif" fontSize="27">
        {subtitleLines.map((line, index) => (
          <tspan key={'subtitle-' + index} x="540" dy={index === 0 ? 0 : 38}>{line}</tspan>
        ))}
      </text>

      <rect x="160" y={offerY} width="760" height="230" rx="38" fill="url(#promotion-accent-gradient)" />
      <rect x="176" y={offerY + 16} width="728" height="198" rx="28" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="2" />
      <text x="540" y={offerY + 75} textAnchor="middle" fill="#FFFFFF" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700" letterSpacing="6">
        EXCLUSIVE OFFER
      </text>
      <text x="540" y={offerY + 157} textAnchor="middle" fill="#FFFFFF" fontFamily={fontFamily} fontSize="76" fontWeight="800">
        {draft.offerText.toUpperCase().slice(0, 20)}
      </text>
      {validDate && (
        <text x="540" y={offerY + 195} textAnchor="middle" fill="#FFFFFF" fontFamily="Arial, sans-serif" fontSize="18" letterSpacing="2">
          VALID UNTIL {validDate.toUpperCase()}
        </text>
      )}

      <text x="540" y={serviceY} textAnchor="middle" fill={template.foreground} fontFamily="Arial, sans-serif" fontSize="31" fontWeight="700">
        {draft.serviceName.toUpperCase().slice(0, 42)}
      </text>
      {draft.promoCode.trim() && (
        <text x="540" y={serviceY + 52} textAnchor="middle" fill={template.muted} fontFamily="Arial, sans-serif" fontSize="22" letterSpacing="2">
          USE CODE: {draft.promoCode.toUpperCase().slice(0, 24)}
        </text>
      )}

      <rect x="245" y={ctaY} width="590" height="88" rx="44" fill={template.foreground} />
      <text x="540" y={ctaY + 56} textAnchor="middle" fill={template.background} fontFamily="Arial, sans-serif" fontSize="24" fontWeight="800" letterSpacing="2">
        {draft.ctaText.toUpperCase().slice(0, 28)}
      </text>
      <text x="540" y={height - 100} textAnchor="middle" fill={template.muted} fontFamily="Arial, sans-serif" fontSize="17" letterSpacing="2">
        {bookingUrl ? 'BOOK ONLINE  •  VISIT OUR WEBSITE' : 'VISIT US  •  BOOK YOUR APPOINTMENT'}
      </text>
    </svg>
  );
};

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#D09A40] focus:ring-4 focus:ring-[#D09A40]/15';
const STEPS = [
  { title: 'Choose a template', description: 'Pick the look and poster size.' },
  { title: 'Campaign details', description: 'Add your offer and message.' },
  { title: 'Design preview', description: 'Fine-tune the poster before export.' },
  { title: 'Download & share', description: 'Send your campaign to customers.' },
];

export const PromotionStudio: React.FC = () => {
  const { salon } = useAuth();
  const storageKey = STORAGE_PREFIX + (salon?.id || 'default');
  const [draft, setDraft] = useState<CampaignDraft>(() => readDraft(storageKey));
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const posterRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // The studio remains usable when browser storage is disabled or full.
    }
  }, [draft, storageKey]);

  if (!salon) return null;

  const salonName = salon.name || 'Your Salon';
  const bookingUrl = typeof window !== 'undefined' && salon.published && salon.slug
    ? window.location.origin + '/salon/' + salon.slug
    : '';
  const caption = campaignCaption(draft, salonName, bookingUrl);
  const template = findTemplate(draft.templateId);

  const updateDraft = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const makePng = async (): Promise<Blob> => {
    const svg = posterRef.current;
    if (!svg) throw new Error('Poster preview is not ready. Open the preview step and try again.');

    const clone = svg.cloneNode(true) as SVGSVGElement;
    const height = draft.format === 'story' ? 1920 : 1350;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '1080');
    clone.setAttribute('height', String(height));

    const serialized = new XMLSerializer().serializeToString(clone);
    const objectUrl = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }));

    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Could not render the poster image.'));
        image.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not create an image canvas.');
      context.drawImage(image, 0, 0, 1080, height);

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Could not export the poster as PNG.'));
        }, 'image/png');
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const downloadPoster = async (forInstagram = false) => {
    setIsExporting(true);
    setNotice('');
    try {
      const blob = await makePng();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (salonName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'salon') + (forInstagram ? '-instagram-promo.png' : '-promotion.png');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      if (forInstagram) {
        try {
          await navigator.clipboard.writeText(caption);
          setNotice('Poster downloaded and caption copied. Open Instagram and upload the image to publish it.');
        } catch {
          setNotice('Poster downloaded. Copy the caption below, then upload the image in Instagram.');
        }
      } else {
        setNotice('Your poster has been downloaded as a high-resolution PNG.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Poster export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setNotice('Campaign caption copied to clipboard.');
    } catch {
      setNotice('Clipboard access is unavailable. Select and copy the caption manually.');
    }
  };

  const shareWhatsApp = () => {
    const text = [caption, bookingUrl].filter(Boolean).join('\n\n');
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
  };

  const shareFacebook = () => {
    const url = bookingUrl || window.location.href;
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer,width=720,height=640');
  };

  const shareNative = async () => {
    setIsSharing(true);
    setNotice('');
    try {
      const blob = await makePng();
      const file = new File([blob], 'salon-promotion.png', { type: 'image/png' });
      const text = [caption, bookingUrl].filter(Boolean).join('\n\n');
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: salonName + ' promotion', text, files: [file] });
        setNotice('Poster shared successfully.');
      } else if (navigator.share) {
        await navigator.share({ title: salonName + ' promotion', text });
      } else {
        shareWhatsApp();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setNotice(error instanceof Error ? error.message : 'Sharing is not available in this browser.');
    } finally {
      setIsSharing(false);
    }
  };

  const goNext = () => {
    if (step === 1 && (!draft.headline.trim() || !draft.offerText.trim() || !draft.serviceName.trim())) {
      setNotice('Add a headline, offer and service before continuing.');
      return;
    }
    setNotice('');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SALON MARKETING TOOL"
        title="Promotion Studio"
        description="Create a polished offer poster in minutes, then download it or share it with your audience."
        actions={<Badge tone="gold"><Sparkles className="mr-1 h-3.5 w-3.5" /> Creative workspace</Badge>}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Campaign creation progress">
            {STEPS.map((item, index) => {
              const complete = index < step;
              const active = index === step;
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => index < step && setStep(index)}
                    disabled={index > step}
                    aria-current={active ? 'step' : undefined}
                    className={'flex w-full items-start gap-2 rounded-xl p-2 text-left transition ' + (active ? 'bg-[#D09A40]/10' : complete ? 'hover:bg-slate-50' : 'opacity-60')}
                  >
                    <span className={'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ' + (complete ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-[#D09A40] text-slate-950' : 'bg-slate-100 text-slate-500')}>
                      {complete ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={'block text-xs font-semibold sm:text-sm ' + (active ? 'text-slate-900' : 'text-slate-700')}>{item.title}</span>
                      <span className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">{item.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="p-4 sm:p-6">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-[#9B6D25]" />
                  <h2 className="text-lg font-semibold text-slate-900">Choose your poster style</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {TEMPLATES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setDraft((current) => ({ ...current, templateId: item.id, accentColor: item.accent })); setNotice(''); }}
                      aria-pressed={draft.templateId === item.id}
                      className={'rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ' + (draft.templateId === item.id ? 'border-[#D09A40] bg-[#D09A40]/5 ring-2 ring-[#D09A40]/20' : 'border-slate-200 bg-white')}
                    >
                      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl p-4" style={{ background: item.background, color: item.foreground }}>
                        <div className="absolute inset-2 rounded-lg border opacity-60" style={{ borderColor: item.border }} />
                        <div className="relative w-full text-center">
                          <div className="mx-auto mb-4 h-7 w-7 rounded-full" style={{ background: item.accent }} />
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Your salon</p>
                          <p className="mt-3 font-serif text-xl font-bold leading-tight">A little glow goes a long way</p>
                          <div className="mx-auto mt-4 rounded-lg px-2 py-3 text-sm font-extrabold text-white" style={{ background: item.accent }}>20% OFF</div>
                          <p className="mt-3 text-[9px] uppercase tracking-widest opacity-70">Book your appointment</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                        {draft.templateId === item.id && <Check className="h-4 w-4 text-[#9B6D25]" />}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#9B6D25]" />
                  <h2 className="text-lg font-semibold text-slate-900">Choose your social format</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => updateDraft('format', 'portrait')} aria-pressed={draft.format === 'portrait'} className={'flex items-center gap-4 rounded-xl border p-4 text-left ' + (draft.format === 'portrait' ? 'border-[#D09A40] bg-[#D09A40]/5' : 'border-slate-200 hover:bg-slate-50')}>
                    <span className="flex h-14 w-12 items-center justify-center rounded-lg border-2 border-slate-300 bg-slate-100"><span className="h-9 w-7 rounded-sm bg-[#D09A40]" /></span>
                    <span><span className="block text-sm font-semibold text-slate-900">Portrait post · 4:5</span><span className="mt-1 block text-xs text-slate-500">1080 × 1350 · Instagram and Facebook feed</span></span>
                    {draft.format === 'portrait' && <Check className="ml-auto h-4 w-4 text-[#9B6D25]" />}
                  </button>
                  <button type="button" onClick={() => updateDraft('format', 'story')} aria-pressed={draft.format === 'story'} className={'flex items-center gap-4 rounded-xl border p-4 text-left ' + (draft.format === 'story' ? 'border-[#D09A40] bg-[#D09A40]/5' : 'border-slate-200 hover:bg-slate-50')}>
                    <span className="flex h-14 w-9 items-center justify-center rounded-lg border-2 border-slate-300 bg-slate-100"><span className="h-11 w-6 rounded-sm bg-[#D09A40]" /></span>
                    <span><span className="block text-sm font-semibold text-slate-900">Story · 9:16</span><span className="mt-1 block text-xs text-slate-500">1080 × 1920 · Instagram and Facebook stories</span></span>
                    {draft.format === 'story' && <Check className="ml-auto h-4 w-4 text-[#9B6D25]" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-3xl space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">What are you promoting?</h2>
                <p className="mt-1 text-sm text-slate-500">Keep the offer clear. Customers should understand the benefit at a glance.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Campaign objective
                  <select className={inputClass} value={draft.goal} onChange={(event) => updateDraft('goal', event.target.value as CampaignGoal)}>
                    <option value="new-clients">Attract new clients</option>
                    <option value="fill-slots">Fill available appointments</option>
                    <option value="promote-service">Promote a service</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Main headline <span className="text-red-500">*</span>
                  <input className={inputClass} maxLength={72} value={draft.headline} onChange={(event) => updateDraft('headline', event.target.value)} placeholder="e.g. Your new look starts here" />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Supporting message
                  <input className={inputClass} maxLength={110} value={draft.subheadline} onChange={(event) => updateDraft('subheadline', event.target.value)} placeholder="A short reason to book today" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Offer / discount <span className="text-red-500">*</span>
                  <input className={inputClass} maxLength={20} value={draft.offerText} onChange={(event) => updateDraft('offerText', event.target.value)} placeholder="e.g. 20% OFF" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Service being promoted <span className="text-red-500">*</span>
                  <input className={inputClass} maxLength={48} value={draft.serviceName} onChange={(event) => updateDraft('serviceName', event.target.value)} placeholder="e.g. Bridal makeup" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Promo code <span className="text-xs font-normal text-slate-400">(optional)</span>
                  <input className={inputClass} maxLength={24} value={draft.promoCode} onChange={(event) => updateDraft('promoCode', event.target.value.toUpperCase())} placeholder="e.g. GLOW20" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Offer valid until
                  <input className={inputClass} type="date" min={new Date().toISOString().slice(0, 10)} value={draft.validUntil} onChange={(event) => updateDraft('validUntil', event.target.value)} />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Button / call to action
                  <input className={inputClass} maxLength={28} value={draft.ctaText} onChange={(event) => updateDraft('ctaText', event.target.value)} placeholder="BOOK YOUR APPOINTMENT" />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Social caption <span className="text-xs font-normal text-slate-400">(optional — generated when blank)</span>
                  <textarea className={inputClass + ' min-h-28 resize-y'} maxLength={500} value={draft.caption} onChange={(event) => updateDraft('caption', event.target.value)} placeholder="Write a caption for WhatsApp, Facebook or Instagram..." />
                </label>
              </div>
              <p className="text-xs text-slate-500">Your draft is saved in this browser on this device. Add only offers your salon is prepared to honour.</p>
            </div>
          )}

          {step === 2 && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,390px)]">
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Make it yours</h2>
                  <p className="mt-1 text-sm text-slate-500">The poster updates as you edit. Use strong contrast so the offer stays easy to read.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Palette className="h-4 w-4 text-[#9B6D25]" /> Accent colour</div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input aria-label="Poster accent colour" type="color" value={draft.accentColor} onChange={(event) => updateDraft('accentColor', event.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
                    <span className="text-xs text-slate-500">{draft.accentColor.toUpperCase()}</span>
                    <button type="button" onClick={() => updateDraft('accentColor', template.accent)} className="text-xs font-semibold text-[#8A641F] underline underline-offset-4">Reset to template colour</button>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Selected design</h3>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div><p className="text-sm text-slate-700">{template.name}</p><p className="text-xs text-slate-500">{draft.format === 'story' ? 'Story · 1080 × 1920' : 'Portrait · 1080 × 1350'}</p></div>
                    <Badge tone="green">Live preview</Badge>
                  </div>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900"><strong>Before sharing:</strong> verify the discount, validity date and promo code. Promotion Studio creates the artwork; it does not publish paid ads or apply discounts to bookings.</div>
              </div>
              <div className="mx-auto w-full max-w-[390px]">
                <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Poster preview</span><Badge tone="gold">{draft.format === 'story' ? '9:16 Story' : '4:5 Portrait'}</Badge></div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-inner">
                  <PosterArtwork draft={draft} salonName={salonName} bookingUrl={bookingUrl} svgRef={posterRef} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,390px)]">
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Your campaign is ready</h2>
                  <p className="mt-1 text-sm text-slate-500">Download the poster or share the campaign caption and salon link.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Megaphone className="h-4 w-4 text-[#9B6D25]" /> Campaign summary</div>
                    <Badge tone={salon.published ? 'green' : 'amber'}>{salon.published ? 'Website live' : 'Website not live'}</Badge>
                  </div>
                  <p className="mt-3 text-base font-semibold text-slate-900">{draft.headline}</p>
                  <p className="mt-1 text-sm text-slate-600">{draft.offerText} · {draft.serviceName}</p>
                  <p className="mt-2 text-xs text-slate-500">{draft.validUntil ? 'Valid until ' + new Date(draft.validUntil + 'T00:00:00').toLocaleDateString('en-IN') : 'No expiry date added'}</p>
                  {bookingUrl ? <a className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8A641F] hover:underline" href={bookingUrl} target="_blank" rel="noreferrer">Open salon booking page <ExternalLink className="h-3 w-3" /></a> : <p className="mt-3 text-xs text-amber-700">Publish your salon website before sharing a booking link.</p>}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="gold" size="lg" onClick={() => downloadPoster(false)} loading={isExporting} className="w-full"><Download className="h-4 w-4" /> Download poster PNG</Button>
                  <Button variant="secondary" size="lg" onClick={shareNative} loading={isSharing} className="w-full"><Share2 className="h-4 w-4" /> Share from device</Button>
                  <Button variant="secondary" onClick={shareWhatsApp} className="w-full"><MessageCircle className="h-4 w-4 text-emerald-600" /> Share on WhatsApp</Button>
                  <Button variant="secondary" onClick={shareFacebook} className="w-full"><Globe className="h-4 w-4 text-blue-600" /> Share on Facebook</Button>
                  <Button variant="secondary" onClick={() => downloadPoster(true)} loading={isExporting} className="w-full sm:col-span-2"><Instagram className="h-4 w-4 text-pink-600" /> Prepare for Instagram</Button>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Social caption</h3>
                    <Button variant="ghost" size="sm" onClick={copyCaption}><Copy className="h-3.5 w-3.5" /> Copy</Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{caption}</p>
                </div>
                {notice && <div role="status" aria-live="polite" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{notice}</div>}
              </div>
              <div className="mx-auto w-full max-w-[390px]">
                <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Final creative</span><Badge tone="green">Ready to export</Badge></div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-inner">
                  <PosterArtwork draft={draft} salonName={salonName} bookingUrl={bookingUrl} svgRef={posterRef} />
                </div>
              </div>
            </div>
          )}

          {step !== 3 && notice && <p role="status" aria-live="polite" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
          <div className="text-xs text-slate-500">Step {step + 1} of {STEPS.length}<span className="ml-2 hidden sm:inline">· Your working draft is stored locally in this browser.</span></div>
          <div className="flex items-center gap-2">
            {step > 0 && <Button variant="secondary" onClick={() => { setNotice(''); setStep((current) => Math.max(current - 1, 0)); }}><ArrowLeft className="h-4 w-4" /> Back</Button>}
            {step < STEPS.length - 1 && <Button variant="gold" onClick={goNext}>Continue <ArrowRight className="h-4 w-4" /></Button>}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"><BadgePercent className="h-5 w-5 shrink-0 text-[#9B6D25]" /><div><p className="text-sm font-semibold text-slate-900">Offer-led creatives</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Make the discount and service easy to understand.</p></div></div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"><CalendarDays className="h-5 w-5 shrink-0 text-[#9B6D25]" /><div><p className="text-sm font-semibold text-slate-900">Clear expiry date</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Set a validity date to keep the offer specific.</p></div></div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"><ImageIcon className="h-5 w-5 shrink-0 text-[#9B6D25]" /><div><p className="text-sm font-semibold text-slate-900">High-resolution export</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Download a PNG formatted for common social placements.</p></div></div>
      </div>
    </div>
  );
};

export default PromotionStudio;
