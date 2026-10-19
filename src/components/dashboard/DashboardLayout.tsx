import React, { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  Sparkles,
  Users,
  Eye,
  Globe,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button, cn } from '../ui';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/website', label: 'My Website', icon: Globe },
  { to: '/dashboard/services', label: 'Services & Prices', icon: Scissors },
  { to: '/dashboard/staff', label: 'Team', icon: Users },
  { to: '/dashboard/preview', label: 'Preview', icon: Eye },
  { to: '/dashboard/billing', label: 'Subscription', icon: CreditCard },
  { to: '/dashboard/account', label: 'Account & Security', icon: Settings },
];

export const DashboardLayout: React.FC = () => {
  const { user, salon, subscription, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isOnboarding = location.pathname.startsWith('/dashboard/onboarding');
  if (!salon && !isOnboarding) return <Navigate to="/dashboard/onboarding" replace />;
  if (salon && isOnboarding) return <Navigate to="/dashboard" replace />;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#D09A40] to-[#B37E28]">
            <Sparkles className="h-4 w-4 text-[#0F172A]" />
          </span>
          <span>
            <span className="block font-serif text-base font-bold leading-none text-slate-900">BeautyZone</span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-[#8a641f]">Owner Studio</span>
          </span>
        </Link>
      </div>

      <div className="mx-3 mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
        <p className="truncate text-sm font-semibold text-slate-900">{salon?.name || 'Your salon'}</p>
        <p className="truncate text-xs text-slate-500">{salon ? `/salon/${salon.slug}` : 'Onboarding in progress'}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {salon?.published ? <Badge tone="green">Live</Badge> : <Badge tone="amber">Draft</Badge>}
          {subscription && (
            <Badge tone="gold">
              {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} · {subscription.status}
            </Badge>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {salon &&
          navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#0F172A] text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        {salon && (
          <a
            href={`/salon/${salon.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[#8a641f] hover:bg-[#D09A40]/10"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Open live website
          </a>
        )}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 rounded-lg px-2 py-1.5">
          <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[11px] font-medium text-emerald-700">Salon owner</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">Owner dashboard</p>
              <p className="hidden text-xs text-slate-500 sm:block">
                {salon?.published ? 'Your website is live and accepting visitors.' : 'Your website is not published yet.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {salon?.published && (
              <a
                href={`/salon/${salon.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View live site
              </a>
            )}
            <Link
              to="/dashboard/website"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D09A40] px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-[#DCA54A]"
            >
              <Calendar className="h-3.5 w-3.5" /> Manage website
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
