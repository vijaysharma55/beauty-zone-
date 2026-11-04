import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Globe, Lock, SearchX } from 'lucide-react';
import { SalonSite } from './SalonSite';
import { api, errorMessage } from '../../lib/api';
import type { PublicSalonResponse, Salon, SalonService, SalonStaff } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import { Button, Spinner } from '../ui';

export const PublicSalonPage: React.FC<{ forcedSlug?: string }> = ({ forcedSlug }) => {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ slug: string }>();
  const slug = forcedSlug || params.slug || '';
  const [data, setData] = useState<PublicSalonResponse | null>(null);
  const [ownerDraftPreview, setOwnerDraftPreview] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!slug || slug.trim().length === 0) {
      setMessage('No salon address was provided.');
      setState('missing');
      return () => {
        cancelled = true;
      };
    }
    if (slug.length > 60 || !/^[a-z0-9-]{2,60}$/i.test(slug)) {
      setMessage('The salon address format is invalid.');
      setState('missing');
      return () => {
        cancelled = true;
      };
    }
    if (authLoading) {
      return () => {
        cancelled = true;
      };
    }

    setState('loading');
    setOwnerDraftPreview(false);

    (async () => {
      try {
        const response = await api.get<PublicSalonResponse>(`/public/salons/${encodeURIComponent(slug)}`);
        if (cancelled) return;
        setData(response);
        setState('ready');
        if (response.salon.name) document.title = `${response.salon.name} — ${response.salon.tagline || 'Salon'}`;
      } catch (err) {
        if (cancelled) return;
        // If signed in as the owner of this unpublished salon, render private preview with demo staff & booking disabled.
        if (user?.role === 'salon_owner') {
          try {
            const [salonRes, serviceRes, staffRes] = await Promise.all([
              api.get<{ salon: Salon }>('/salon'),
              api.get<{ services: SalonService[] }>('/salon/services'),
              api.get<{ staff: SalonStaff[] }>('/salon/staff'),
            ]);
            if (cancelled) return;
            if (salonRes.salon && salonRes.salon.slug.toLowerCase() === slug.toLowerCase()) {
              setData({
                salon: salonRes.salon,
                services: serviceRes.services.filter((s) => s.active),
                staff: staffRes.staff
                  .filter((s) => s.active)
                  .map((s) => ({
                    ...s,
                    workPhotos: s.workPhotosConsent ? s.workPhotos : [],
                  })),
              });
              setOwnerDraftPreview(true);
              setState('ready');
              document.title = `${salonRes.salon.name} (Preview) — BeautyZone`;
              return;
            }
          } catch {
            // Fall through to missing state
          }
        }
        setMessage(errorMessage(err));
        setState('missing');
      }
    })();

    return () => {
      cancelled = true;
      document.title = 'BeautyZone';
    };
  }, [slug, user?.id, user?.role, authLoading]);

  if (state === 'loading' || authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF5E5]">
        <Spinner className="h-8 w-8 text-[#D09A40]" />
        <p className="text-sm text-slate-600">Loading salon website…</p>
      </div>
    );
  }

  if (state !== 'ready' || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF5E5] px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/5 text-slate-500">
          <SearchX className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-slate-900">This salon website isn't available</h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          {message || 'The website you are looking for does not exist or has been unpublished by its owner.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/">
            <Button variant="primary">
              <ArrowLeft className="h-4 w-4" /> Back to BeautyZone
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">
              <Globe className="h-4 w-4" /> Salon owner login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SalonSite
      salon={data.salon}
      services={data.services}
      staff={data.staff}
      staffPreviewMode={data.salon.published ? 'real' : 'demo'}
      previewBanner={
        ownerDraftPreview ? (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Eye className="h-3.5 w-3.5 text-amber-700" />
                Owner Preview · Your website is unpublished (showing sample demo staff; real booking is disabled).
              </span>
              <Link
                to="/dashboard/preview"
                className="inline-flex items-center gap-1 rounded-full bg-amber-900 px-3 py-1 font-bold text-white hover:bg-amber-800"
              >
                <Lock className="h-3 w-3" /> Manage & Publish in Dashboard
              </Link>
            </div>
          </div>
        ) : undefined
      }
    />
  );
};
