import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ArrowLeft, Rocket, RefreshCw, Palette, Users } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { Salon, SalonService, SalonStaff, TemplateId } from '../../types/auth';
import { SalonSite } from '../site/SalonSite';
import { Alert, Badge, Button, PageHeader, Spinner } from '../ui';
import { useAuth } from '../../context/AuthContext';

const PREVIEW_TEMPLATES: Array<{ id: TemplateId; label: string }> = [
  { id: 'luxe', label: 'Luxe Gold' },
  { id: 'minimal', label: 'Minimal Ivory' },
  { id: 'noir', label: 'Noir Studio' },
  { id: 'blush', label: 'Rose Blush' },
];

export const PreviewPage: React.FC = () => {
  const { refresh } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<SalonService[]>([]);
  const [staff, setStaff] = useState<SalonStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [templateOverride, setTemplateOverride] = useState<TemplateId | null>(null);
  const [unpublishedStaffMode, setUnpublishedStaffMode] = useState<'demo' | 'real'>('demo');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [salonRes, serviceRes, staffRes] = await Promise.all([
        api.get<{ salon: Salon }>('/salon'),
        api.get<{ services: SalonService[] }>('/salon/services'),
        api.get<{ staff: SalonStaff[] }>('/salon/staff'),
      ]);
      setSalon(salonRes.salon);
      setServices(serviceRes.services.filter((s) => s.active));
      // Preview mirrors public consent rules for work photos.
      setStaff(
        staffRes.staff
          .filter((s) => s.active)
          .map((s) => ({
            ...s,
            workPhotos: s.workPhotosConsent ? s.workPhotos : [],
          }))
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const publish = async () => {
    setPublishing(true);
    setError('');
    try {
      await api.post('/salon/publish');
      await refresh();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  };

  const activeTemplate = templateOverride || salon?.templateId || 'luxe';
  const previewSalon = salon ? { ...salon, templateId: activeTemplate } : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Preview"
        title="Website preview"
        description="Preview how your website, staff profiles and booking experience look across templates."
        actions={
          <>
            <Button variant="secondary" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            {salon?.published ? (
              <a href={`/salon/${salon.slug}`} target="_blank" rel="noreferrer">
                <Button variant="secondary">
                  <Eye className="h-4 w-4" /> Open live site
                </Button>
              </a>
            ) : (
              <Button variant="gold" onClick={publish} loading={publishing}>
                <Rocket className="h-4 w-4" /> Publish now
              </Button>
            )}
          </>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <div className="space-y-3 rounded-xl border border-[#D09A40]/30 bg-[#D09A40]/10 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm text-[#6d4f14]">
            <Eye className="h-4 w-4 shrink-0" />
            <span>
              Preview of your <strong>current {salon?.published ? 'live configuration' : 'draft'}</strong>.{' '}
              {!salon?.published &&
                'Real client bookings stay disabled until your website is approved and published.'}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Badge tone={salon?.published ? 'green' : 'amber'}>
              {salon?.published ? 'Published · Booking Active' : 'Unpublished · Preview Only'}
            </Badge>
            <Link to="/dashboard/website" className="text-xs font-semibold text-[#6d4f14] hover:underline">
              <ArrowLeft className="mr-1 inline h-3 w-3" /> Back to editor
            </Link>
          </div>
        </div>

        {/* Template & Staff Preview Controls */}
        {salon && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D09A40]/20 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-[#6d4f14]">
                <Palette className="h-3.5 w-3.5" /> Template:
              </span>
              {PREVIEW_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplateOverride(tpl.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                    activeTemplate === tpl.id
                      ? 'bg-[#0F172A] text-[#FAF5E5] shadow-sm'
                      : 'bg-white/80 text-slate-700 hover:bg-white'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {!salon.published && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-[#6d4f14]">
                  <Users className="h-3.5 w-3.5" /> Unpublished team view:
                </span>
                <button
                  type="button"
                  onClick={() => setUnpublishedStaffMode('demo')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                    unpublishedStaffMode === 'demo'
                      ? 'bg-[#0F172A] text-[#FAF5E5] shadow-sm'
                      : 'bg-white/80 text-slate-700 hover:bg-white'
                  }`}
                >
                  Demo Staff (Sample)
                </button>
                <button
                  type="button"
                  onClick={() => setUnpublishedStaffMode('real')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                    unpublishedStaffMode === 'real'
                      ? 'bg-[#0F172A] text-[#FAF5E5] shadow-sm'
                      : 'bg-white/80 text-slate-700 hover:bg-white'
                  }`}
                >
                  My Added Team ({staff.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24">
          <Spinner className="h-7 w-7 text-[#D09A40]" />
        </div>
      ) : previewSalon ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <SalonSite
            salon={previewSalon}
            services={services}
            staff={staff}
            staffPreviewMode={previewSalon.published ? 'real' : unpublishedStaffMode}
          />
        </div>
      ) : null}
    </div>
  );
};
