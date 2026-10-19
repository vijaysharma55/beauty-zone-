import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, ArrowLeft } from 'lucide-react';

export const AuthLayout: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen bg-[#FAF5E5] grid lg:grid-cols-[1.05fr_1fr]">
    {/* Brand panel */}
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0F172A] p-10 text-[#FAF5E5]">
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 12%, #D09A40 0, transparent 42%), radial-gradient(circle at 82% 78%, #D09A40 0, transparent 38%)',
        }}
      />
      <div className="relative">
        <Link to="/" className="inline-flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#D09A40] to-[#B37E28]">
            <Sparkles className="h-5 w-5 text-[#0F172A]" />
          </span>
          <span>
            <span className="block font-serif text-2xl font-bold tracking-wide">BEAUTYZONE</span>
            <span className="block text-[10px] uppercase tracking-[0.24em] text-[#D09A40]">
              Salon Website Platform
            </span>
          </span>
        </Link>
      </div>

      <div className="relative max-w-md">
        <h2 className="font-serif text-3xl leading-snug xl:text-4xl">
          Your salon deserves a <span className="text-[#D09A40]">beautiful</span> website — live in minutes.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-[#FAF5E5]/70">
          Manage your services, prices, staff and gallery in one secure dashboard. Publish a unique,
          shareable website for every salon — no developer required.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-[#FAF5E5]/80">
          {[
            'One dashboard, one salon — your data stays yours',
            'Instant publish / unpublish of your live website',
            'Secure accounts with email or Google sign-in',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D09A40]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-[#FAF5E5]/50">
        © {new Date().getFullYear()} BeautyZone. All salon data is protected by role-based access control.
      </p>
    </div>

    {/* Form panel */}
    <div className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10">
      <div className="mx-auto w-full max-w-md">
        <div className="lg:hidden mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to BeautyZone
          </Link>
        </div>
        <div className="mb-7">
          <h1 className="font-serif text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>
        {children}
      </div>
      {footer && <div className="mx-auto mt-8 w-full max-w-md text-center text-sm text-slate-600">{footer}</div>}
    </div>
  </div>
);
