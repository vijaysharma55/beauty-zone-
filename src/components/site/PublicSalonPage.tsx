import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Globe, SearchX } from 'lucide-react';
import { SalonSite } from './SalonSite';
import { api, errorMessage } from '../../lib/api';
import type { PublicSalonResponse } from '../../types/auth';
import { Button, Spinner } from '../ui';

export const PublicSalonPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicSalonResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const response = await api.get<PublicSalonResponse>(`/public/salons/${encodeURIComponent(slug || '')}`);
        if (cancelled) return;
        setData(response);
        setState('ready');
        if (response.salon.name) document.title = `${response.salon.name} — ${response.salon.tagline || 'Salon'}`;
      } catch (err) {
        if (cancelled) return;
        setMessage(errorMessage(err));
        setState('missing');
      }
    })();
    return () => {
      cancelled = true;
      document.title = 'BeautyZone';
    };
  }, [slug]);

  if (state === 'loading') {
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

  return <SalonSite salon={data.salon} services={data.services} staff={data.staff} />;
};
