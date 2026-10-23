import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Scissors,
  CheckCircle2,
  Calendar,
  X,
  Compass,
} from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { Spinner, Button, Card, Badge, EmptyState } from '../ui';

interface PublicSalonSummary {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  city: string;
  state: string;
  logoUrl?: string;
  coverImage?: string;
  templateId: string;
  serviceCount: number;
  url: string;
}

interface PublicSalonsResponse {
  salons: PublicSalonSummary[];
  cities: string[];
  total: number;
  filter: {
    city: string | null;
    q: string | null;
  };
}

export const SalonDirectoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCity = searchParams.get('city') || 'Jaipur';
  const initialQuery = searchParams.get('q') || '';

  const [salons, setSalons] = useState<PublicSalonSummary[]>([]);
  const [cities, setCities] = useState<string[]>(['Jaipur']);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSalons = async (cityVal: string, queryVal: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (cityVal && cityVal !== 'all') params.set('city', cityVal);
      if (queryVal.trim()) params.set('q', queryVal.trim());

      const res = await api.get<PublicSalonsResponse>(
        `/public/salons${params.toString() ? `?${params.toString()}` : ''}`
      );
      setSalons(res.salons || []);
      if (Array.isArray(res.cities) && res.cities.length > 0) {
        setCities(res.cities);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalons(selectedCity, searchQuery);
  }, [selectedCity]);

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    const params = new URLSearchParams(searchParams);
    if (newCity && newCity !== 'all') {
      params.set('city', newCity);
    } else {
      params.delete('city');
    }
    setSearchParams(params, { replace: true });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }
    setSearchParams(params, { replace: true });
    fetchSalons(selectedCity, searchQuery);
  };

  const clearFilters = () => {
    setSelectedCity('all');
    setSearchQuery('');
    setSearchParams({}, { replace: true });
    fetchSalons('all', '');
  };

  // Client-side quick filter for instantaneous typing response
  const displayedSalons = useMemo(() => {
    return salons.filter((salon) => {
      const matchesCity =
        selectedCity === 'all' ||
        (salon.city || '').trim().toLowerCase() === selectedCity.trim().toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        salon.name.toLowerCase().includes(q) ||
        (salon.tagline || '').toLowerCase().includes(q) ||
        (salon.city || '').toLowerCase().includes(q);
      return matchesCity && matchesQuery;
    });
  }, [salons, selectedCity, searchQuery]);

  return (
    <div className="min-h-screen bg-[#FAF5E5] text-[#0F172A] flex flex-col justify-between">
      {/* Top Header & Navigation */}
      <header className="bg-[#0F172A] text-[#FAF5E5] border-b border-[#D09A40]/30 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-[#D09A40] flex items-center justify-center text-[#0F172A] font-bold shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-[#FAF5E5] block leading-tight">
                BeautyZone
              </span>
              <span className="text-[10px] text-[#D09A40] uppercase tracking-wider block font-semibold">
                Verified Salon Network
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs font-semibold text-[#FAF5E5]/80 hover:text-white transition px-3 py-2"
            >
              Back to Home
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-[#D09A40] px-4 py-2 text-xs font-bold text-[#0F172A] hover:bg-[#DCA54A] transition shadow-xs"
            >
              Salon Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero & Geography Filter Banner */}
      <section className="bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-[#FAF5E5] pt-12 pb-16 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D09A40]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D09A40]/15 border border-[#D09A40]/40 text-[#D09A40] text-xs font-semibold uppercase tracking-widest">
            <Compass className="w-3.5 h-3.5" />
            <span>Salon Directory & Locations</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FAF5E5]">
            Find Luxury Salons in {selectedCity !== 'all' ? selectedCity : 'Your City'}
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#FAF5E5]/80">
            Browse verified luxury salons, bridal studios, and hair clinics. Book appointments directly or visit official websites.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D09A40]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search salons by name, bridal, hair or area…"
                className="w-full bg-transparent pl-10 pr-4 py-2.5 text-sm text-[#FAF5E5] placeholder-[#FAF5E5]/50 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="rounded-xl bg-[#D09A40] hover:bg-[#DCA54A] px-5 py-2.5 text-xs font-bold text-[#0F172A] transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>

          {/* City Location Filters */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-[#FAF5E5]/70 mr-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#D09A40]" /> Available Cities:
            </span>

            <button
              onClick={() => handleCityChange('all')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedCity === 'all'
                  ? 'bg-[#D09A40] text-[#0F172A] shadow-md'
                  : 'bg-white/10 text-[#FAF5E5]/80 hover:bg-white/20 border border-white/10'
              }`}
            >
              All Cities
            </button>

            {cities.map((city) => {
              const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
              const isJaipur = city.toLowerCase() === 'jaipur';
              return (
                <button
                  key={city}
                  onClick={() => handleCityChange(city)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#D09A40] text-[#0F172A] shadow-lg ring-2 ring-[#D09A40]/50'
                      : 'bg-white/10 text-[#FAF5E5]/90 hover:bg-white/20 border border-white/15'
                  }`}
                >
                  <span>{city}</span>
                  {isJaipur && (
                    <span className="text-[10px] bg-[#D09A40]/30 text-[#FAF5E5] px-1.5 py-0.2 rounded-full font-bold">
                      Flagship
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Salon Cards Grid Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        {/* Results Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#0F172A]">
              {selectedCity === 'all' ? 'All Verified Salons' : `Salons in ${selectedCity}`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Showing {displayedSalons.length} {displayedSalons.length === 1 ? 'salon' : 'salons'}
              {searchQuery ? ` matching "${searchQuery}"` : ''}
            </p>
          </div>

          {(selectedCity !== 'all' || searchQuery) && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-[#8a641f] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner className="h-8 w-8 text-[#D09A40]" />
            <p className="text-sm text-slate-600">Loading verified salons in {selectedCity}…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-red-700">
            <p className="font-medium text-sm">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchSalons(selectedCity, searchQuery)} className="mt-3">
              Retry Search
            </Button>
          </div>
        ) : displayedSalons.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#0F172A]/10 shadow-sm space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-[#FAF5E5] text-[#D09A40] flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#0F172A]">
              No salons found in {selectedCity}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We couldn't find any live salons matching your criteria. Try switching to <strong>Jaipur</strong> to explore our flagship studio!
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button variant="primary" onClick={() => handleCityChange('Jaipur')}>
                Explore Jaipur Salons
              </Button>
              <Button variant="secondary" onClick={clearFilters}>
                View All Cities
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {displayedSalons.map((salon) => (
              <div
                key={salon.id}
                className="group rounded-3xl bg-white border border-[#0F172A]/10 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#D09A40]/60 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Salon Cover Banner */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                    <img
                      src={salon.coverImage || '/images/jaipur_luxury_salon_1792644552318.jpg'}
                      alt={`${salon.name} in ${salon.city}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* City Location Tag */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#0F172A]/90 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold border border-white/20">
                      <MapPin className="w-3 h-3 text-[#D09A40]" />
                      <span>{salon.city || 'Jaipur'}{salon.state ? `, ${salon.state}` : ''}</span>
                    </div>

                    {/* Services Count Badge */}
                    <div className="absolute bottom-3 left-3 text-white">
                      <p className="font-serif text-xl font-bold">{salon.name}</p>
                      <p className="text-[11px] text-[#FAF5E5]/80 truncate max-w-xs">{salon.tagline}</p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Scissors className="w-3.5 h-3.5 text-[#D09A40]" />
                        <strong>{salon.serviceCount}</strong> services available
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Verified Live
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      Experience premium bridal artistry, hair transformations, and skincare rituals at {salon.name} located in {salon.city}.
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-5 pt-0 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    to={salon.url}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs py-2.5 transition shadow-xs"
                  >
                    <span>Visit Website</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D09A40]" />
                  </Link>

                  <Link
                    to={`${salon.url}#booking`}
                    className="rounded-xl bg-[#FAF5E5] hover:bg-[#D09A40]/20 text-[#0F172A] border border-[#D09A40]/40 font-bold text-xs px-3.5 py-2.5 transition flex items-center gap-1"
                    title="Book Appointment"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#D09A40]" />
                    <span className="hidden sm:inline">Book</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-[#FAF5E5]/70 py-8 text-center text-xs border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 BeautyZone Platform. Verified Salons in Jaipur, Rajasthan & Major Metros.</p>
        </div>
      </footer>
    </div>
  );
};
