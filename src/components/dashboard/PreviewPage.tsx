import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ArrowLeft, Rocket, RefreshCw } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { Salon, SalonService, SalonStaff } from '../../types/auth';
import { SalonSite } from '../site/SalonSite';
import { Alert, Badge, Button, PageHeader, Spinner } from '../ui';
import { useAuth } from '../../context/AuthContext';

export const PreviewPage: React.FC = () => {
  const { refresh } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<SalonService[]>([]);
  const [staff, setStaff] = useState<SalonStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

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
      setStaff(staffRes.staff.filter((s) => s.active));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Preview"
        title="Website preview"
        description="This is exactly how your website will look to visitors once published."
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

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D09A40]/30 bg-[#D09A40]/10 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-[#6d4f14]">
          <Eye className="h-4 w-4" />
          Preview mode — this page is private to your account.
        </p>
        <div className="flex items-center gap-2">
          <Badge tone={salon?.published ? 'green' : 'amber'}>{salon?.published ? 'Published' : 'Draft'}</Badge>
          <Link to="/dashboard/website" className="text-xs font-semibold text-[#6d4f14] hover:underline">
            <ArrowLeft className="mr-1 inline h-3 w-3" /> Back to editor
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24">
          <Spinner className="h-7 w-7 text-[#D09A40]" />
        </div>
      ) : salon ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <SalonSite salon={salon} services={services} staff={staff} />
        </div>
      ) : null}
    </div>
  );
};
