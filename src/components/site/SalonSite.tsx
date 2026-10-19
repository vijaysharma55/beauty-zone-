import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Instagram,
  Facebook,
  Sparkles,
  Scissors,
  ArrowUpRight,
  MessageCircle,
} from 'lucide-react';
import { formatCurrency } from '../ui';
import type { Salon, SalonService, SalonStaff } from '../../types/auth';

const CATEGORY_LABELS: Record<string, string> = {
  bridal: 'Bridal',
  hair: 'Hair',
  skin: 'Skin',
  nails: 'Nails',
  spa: 'Spa',
  academy: 'Academy',
  makeup: 'Makeup',
  other: 'Other',
};

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const SalonSite: React.FC<{
  salon: Salon;
  services: SalonService[];
  staff: SalonStaff[];
}> = ({ salon, services, staff }) => {
  const accent = salon.theme?.accent || '#D09A40';
  const primary = salon.theme?.primary || '#0F172A';
  const background = salon.theme?.background || '#FAF5E5';
  const surface = salon.theme?.surface || '#FFFFFF';

  // Template presets change the layout/tonality; the salon's brand colours win.
  const template = salon.templateId || 'luxe';
  const light = template === 'minimal' || template === 'blush';
  const headerBg = light ? surface : template === 'noir' ? '#0B0B0F' : primary;
  const headerText = light ? primary : background;
  const heroBg =
    template === 'minimal' ? surface : template === 'blush' ? '#FBEDEC' : template === 'noir' ? '#0B0B0F' : primary;
  const heroText = light ? primary : background;
  const heroAccent = template === 'blush' ? '#C97C7C' : accent;
  const cardRadius = template === 'noir' ? 'rounded-none' : template === 'minimal' ? 'rounded-lg' : 'rounded-2xl';
  const headingClass = template === 'minimal' ? 'font-sans font-semibold' : 'font-serif';

  const categories = Array.from(new Set(services.map((s) => s.category)));
  const phoneRaw = (salon.whatsapp || salon.phone || '').replace(/[^\d]/g, '');
  const timings = Array.isArray(salon.timings) ? salon.timings : [];
  const mapHref =
    salon.mapUrl ||
    (salon.addressLine
      ? `https://maps.google.com/?q=${encodeURIComponent(
          [salon.name, salon.addressLine, salon.city, salon.state].filter(Boolean).join(', ')
        )}`
      : '');

  return (
    <div style={{ backgroundColor: background, color: primary }} className="min-h-screen antialiased">
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ backgroundColor: light ? `${surface}F2` : `${headerBg}F2`, borderColor: `${heroAccent}33` }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to={`/salon/${salon.slug}`} className="flex min-w-0 items-center gap-3">
            {salon.logoUrl ? (
              <img
                src={salon.logoUrl}
                alt={`${salon.name} logo`}
                className="h-10 w-10 rounded-full border object-cover"
                style={{ borderColor: accent }}
              />
            ) : (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: accent }}
              >
                <Sparkles className="h-5 w-5" style={{ color: primary }} />
              </span>
            )}
            <span className="min-w-0">
              <span
                className={`block truncate ${headingClass} text-lg font-bold tracking-wide sm:text-xl`}
                style={{ color: headerText }}
              >
                {salon.name}
              </span>
              {salon.tagline && (
                <span
                  className="block truncate text-[10px] font-medium uppercase tracking-[0.18em]"
                  style={{ color: heroAccent }}
                >
                  {salon.tagline}
                </span>
              )}
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-medium md:flex" style={{ color: `${headerText}B3` }}>
            {services.length > 0 && (
              <a href="#services" className="hover:opacity-100" style={{ color: 'inherit' }}>
                Services
              </a>
            )}
            {staff.length > 0 && (
              <a href="#team" className="hover:opacity-100" style={{ color: 'inherit' }}>
                Team
              </a>
            )}
            {salon.gallery.length > 0 && (
              <a href="#gallery" className="hover:opacity-100" style={{ color: 'inherit' }}>
                Gallery
              </a>
            )}
            <a href="#contact" className="hover:opacity-100" style={{ color: 'inherit' }}>
              Contact
            </a>
          </nav>

          {(phoneRaw || salon.phone) && (
            <a
              href={phoneRaw ? `tel:${phoneRaw}` : '#contact'}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold sm:text-sm"
              style={{ backgroundColor: heroAccent, color: light ? '#FFFFFF' : primary }}
            >
              <Phone className="h-3.5 w-3.5" /> Book now
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: heroBg }}>
        {salon.coverImage && (
          <img src={salon.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: salon.coverImage
              ? light
                ? `linear-gradient(90deg, ${surface}F2 0%, ${surface}B3 55%, ${surface}66 100%)`
                : `linear-gradient(90deg, ${heroBg}F5 0%, ${heroBg}99 60%, ${heroBg}55 100%)`
              : light
                ? `radial-gradient(circle at 18% 12%, ${heroAccent}33 0, transparent 45%)`
                : `radial-gradient(circle at 20% 10%, ${heroAccent}55 0, transparent 45%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <p
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ borderColor: `${accent}66`, color: accent }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {salon.city || 'Beauty studio'}
            {salon.state ? ` · ${salon.state}` : ''}
          </p>
          <h1
            className={`mt-5 max-w-2xl ${headingClass} text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl`}
            style={{ color: heroText }}
          >
            {salon.heroTitle || salon.name}
          </h1>
          {salon.heroSubtitle && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: `${heroText}B3` }}>
              {salon.heroSubtitle}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {phoneRaw && (
              <a
                href={`tel:${phoneRaw}`}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-lg"
                style={{ backgroundColor: heroAccent, color: light ? '#FFFFFF' : primary }}
              >
                <Phone className="h-4 w-4" /> Call to book
              </a>
            )}
            {phoneRaw && (
              <a
                href={`https://wa.me/${phoneRaw}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold"
                style={{ borderColor: `${heroAccent}66`, color: heroText }}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp us
              </a>
            )}
            {services.length > 0 && (
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold underline-offset-4 hover:underline"
                style={{ color: `${heroText}B3` }}
              >
                View services <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* About / contact strip */}
      <section className="border-b" style={{ borderColor: `${primary}12`, backgroundColor: surface }}>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <InfoItem icon={<MapPin className="h-4 w-4" />} label="Visit us" accent={accent} primary={primary}>
            {[salon.addressLine, salon.city, salon.state, salon.postalCode].filter(Boolean).join(', ') || 'Address coming soon'}
          </InfoItem>
          <InfoItem icon={<Phone className="h-4 w-4" />} label="Call or WhatsApp" accent={accent} primary={primary}>
            {salon.phone || salon.whatsapp || 'Phone coming soon'}
          </InfoItem>
          <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" accent={accent} primary={primary}>
            {salon.email || 'Email coming soon'}
          </InfoItem>
          <InfoItem icon={<Clock className="h-4 w-4" />} label="Appointments" accent={accent} primary={primary}>
            {salon.whatsapp ? 'WhatsApp booking available' : 'Call to book your slot'}
          </InfoItem>
        </div>
      </section>

      {/* About */}
      {salon.description && (
        <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: accent }}>
            About the studio
          </p>
          <p className={`mt-4 ${headingClass} text-xl leading-relaxed sm:text-2xl`}>{salon.description}</p>
        </section>
      )}

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-16 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: accent }}>
              Menu & prices
            </p>
            <h2 className={`mt-1 ${headingClass} text-3xl font-bold`}>Services</h2>
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{ borderColor: `${primary}22`, color: `${primary}AA` }}
                >
                  {CATEGORY_LABELS[c] || c}
                </span>
              ))}
            </div>
          )}
        </div>

        {services.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed p-12 text-center text-sm"
            style={{ borderColor: `${primary}22`, color: `${primary}88` }}
          >
            Services will be listed here shortly.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.id}
                className={`flex flex-col justify-between ${cardRadius} border p-5 shadow-sm`}
                style={{ backgroundColor: surface, borderColor: `${primary}12` }}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-snug">{service.name}</h3>
                    <span className="shrink-0 font-serif text-lg font-bold" style={{ color: accent }}>
                      {formatCurrency(service.pricePaise)}
                    </span>
                  </div>
                  {service.description && (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: `${primary}99` }}>
                      {service.description}
                    </p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide"
                    style={{ backgroundColor: `${accent}1F`, color: accent }}
                  >
                    {CATEGORY_LABELS[service.category] || service.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: `${primary}88` }}>
                    <Clock className="h-3.5 w-3.5" /> {service.durationMinutes} min
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Team */}
      {staff.length > 0 && (
        <section id="team" className="scroll-mt-24 py-16" style={{ backgroundColor: surface }}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: accent }}>
              Our artists
            </p>
            <h2 className={`mt-1 ${headingClass} text-3xl font-bold`}>Meet the team</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((member) => (
                <article
                  key={member.id}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: `${primary}12`, backgroundColor: background }}
                >
                  <div className="flex items-center gap-3">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-full font-serif text-lg font-bold"
                        style={{ backgroundColor: `${accent}26`, color: accent }}
                      >
                        {initials(member.name)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{member.name}</h3>
                      {member.roleTitle && (
                        <p className="truncate text-xs" style={{ color: `${primary}88` }}>
                          {member.roleTitle}
                        </p>
                      )}
                    </div>
                  </div>
                  {member.bio && (
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: `${primary}99` }}>
                      {member.bio}
                    </p>
                  )}
                  {member.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {member.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="rounded-full border px-2 py-0.5 text-[11px]"
                          style={{ borderColor: `${accent}44`, color: accent }}
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {salon.gallery.length > 0 && (
        <section id="gallery" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: accent }}>
            Lookbook
          </p>
          <h2 className={`mt-1 ${headingClass} text-3xl font-bold`}>Recent work</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {salon.gallery.map((image, index) => (
              <figure
                key={`${image.url}-${index}`}
                className="group relative overflow-hidden rounded-xl"
                style={{ backgroundColor: surface }}
              >
                <img
                  src={image.url}
                  alt={image.caption || `${salon.name} work ${index + 1}`}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {image.caption && (
                  <figcaption
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-medium text-white"
                  >
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="scroll-mt-24 py-16" style={{ backgroundColor: primary }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: accent }}>
              Visit or book
            </p>
            <h2 className={`mt-1 ${headingClass} text-3xl font-bold`} style={{ color: background }}>
              We'd love to see you
            </h2>
            <ul className="mt-6 space-y-3 text-sm" style={{ color: `${background}CC` }}>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
                <span>
                  {[salon.addressLine, salon.city, salon.state, salon.postalCode, salon.country]
                    .filter(Boolean)
                    .join(', ') || 'Address coming soon'}
                </span>
              </li>
              {salon.phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0" style={{ color: accent }} />
                  <a href={`tel:${salon.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">
                    {salon.phone}
                  </a>
                </li>
              )}
              {salon.email && (
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0" style={{ color: accent }} />
                  <a href={`mailto:${salon.email}`} className="hover:underline">
                    {salon.email}
                  </a>
                </li>
              )}
              {(salon.ownerName || salon.ownerPhone) && (
                <li className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
                  <span>
                    Ask for {salon.ownerName || 'the owner'}
                    {salon.ownerPhone ? ` · ${salon.ownerPhone}` : ''}
                  </span>
                </li>
              )}
            </ul>

            {timings.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
                  Opening hours
                </p>
                <ul className="mt-2 grid max-w-sm grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                  {timings.map((entry) => (
                    <li key={entry.day} className="flex justify-between gap-3" style={{ color: `${background}CC` }}>
                      <span className="capitalize">{entry.day}</span>
                      <span>{entry.closed ? 'Closed' : `${entry.open} – ${entry.close}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              {salon.instagram && (
                <a
                  href={salon.instagram.startsWith('http') ? salon.instagram : `https://instagram.com/${salon.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border p-2.5"
                  style={{ borderColor: `${accent}55`, color: accent }}
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {salon.facebook && (
                <a
                  href={salon.facebook.startsWith('http') ? salon.facebook : `https://facebook.com/${salon.facebook}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border p-2.5"
                  style={{ borderColor: `${accent}55`, color: accent }}
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-6" style={{ borderColor: `${accent}33`, backgroundColor: `${background}0F` }}>
            <h3 className="font-serif text-xl font-bold" style={{ color: background }}>
              Ready for your appointment?
            </h3>
            <p className="mt-2 text-sm" style={{ color: `${background}AA` }}>
              Call or WhatsApp us and our front desk will confirm your preferred stylist, service and time slot.
            </p>
            <div className="mt-5 space-y-2.5">
              {phoneRaw && (
                <a
                  href={`tel:${phoneRaw}`}
                  className="flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold"
                  style={{ backgroundColor: accent, color: primary }}
                >
                  <Phone className="h-4 w-4" /> {salon.phone || `+${phoneRaw}`}
                </a>
              )}
              {phoneRaw && (
                <a
                  href={`https://wa.me/${phoneRaw}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold"
                  style={{ borderColor: `${accent}55`, color: background }}
                >
                  <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                </a>
              )}
              {mapHref && (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold"
                  style={{ borderColor: `${accent}55`, color: background }}
                >
                  <MapPin className="h-4 w-4" /> Get directions
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: `${primary}22`, backgroundColor: primary, color: `${background}88` }}>
        <p>
          © {new Date().getFullYear()} {salon.name}. All rights reserved.
        </p>
        <p className="mt-1">
          Website by{' '}
          <Link to="/" className="font-semibold hover:underline" style={{ color: accent }}>
            BeautyZone
          </Link>
        </p>
      </footer>
    </div>
  );
};

const InfoItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  accent: string;
  primary: string;
}> = ({ icon, label, children, accent, primary }) => (
  <div>
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
      {icon} {label}
    </p>
    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: `${primary}AA` }}>
      {children}
    </p>
  </div>
);
