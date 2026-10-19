import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, cn } from '../ui';

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Salon owners', icon: Users },
  { to: '/admin/salons', label: 'Salons & websites', icon: Building2 },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/settings', label: 'Platform settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Link to="/admin" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F172A]">
            <ShieldCheck className="h-4 w-4 text-[#D09A40]" />
          </span>
          <span>
            <span className="block font-serif text-base font-bold leading-none text-slate-900">BeautyZone</span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-[#8a641f]">Platform admin</span>
          </span>
        </Link>
      </div>

      <div className="mx-3 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
          <ShieldCheck className="h-3.5 w-3.5" /> Super admin access
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
          You can manage every user, salon, subscription and platform setting.
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-4">
        {navItems.map((item) => {
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
                  isActive ? 'bg-[#0F172A] text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
        <Link
          to="/"
          className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[#8a641f] hover:bg-[#D09A40]/10"
        >
          <Globe className="h-4 w-4 shrink-0" /> Back to public site
        </Link>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 rounded-lg px-2 py-1.5">
          <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#D09A40]">
            Super admin
          </span>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

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
              <p className="text-sm font-semibold text-slate-900">Platform administration</p>
              <p className="hidden text-xs text-slate-500 sm:block">
                Role-based control over users, salons and subscriptions
              </p>
            </div>
          </div>
          <span className="hidden rounded-full border border-slate-300 px-3 py-1 text-[11px] font-medium text-slate-600 sm:inline">
            Signed in as {user?.name}
          </span>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
