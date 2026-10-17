import React from 'react';
import { Sparkles, ArrowRight, ArrowUpRight } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { InstagramIcon, WhatsAppIcon, FacebookIcon, SOCIAL_LINKS } from './SocialIcons';

interface HeroProps {
  onBookClick: () => void;
  onExploreBridal: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onBookClick,
  onExploreBridal,
}) => {
  const quickServices = [
    {
      title: 'HD Bridal Makeup',
      subtitle: 'Airbrush & Jewelry Setting',
      price: 'From ₹24,999',
      image: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
      category: 'bridal',
    },
    {
      title: 'Hair Botox & Nanoplastia',
      subtitle: 'Frizz-Free Smooth Hair',
      price: 'From ₹6,999',
      image: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
      category: 'hair',
    },
    {
      title: '24K Gold Facial',
      subtitle: 'Real Gold Leaf Glow',
      price: 'From ₹3,299',
      image: '/src/assets/images/skin_spa_treatment_1790672037475.jpg',
      category: 'skin',
    },
    {
      title: 'Bridal Nail Extensions',
      subtitle: 'Gel Extensions & Stone Art',
      price: 'From ₹1,899',
      image: '/src/assets/images/nail_art_luxe_1790676094903.jpg',
      category: 'nails',
    },
    {
      title: 'Home Salon Service',
      subtitle: 'Doorstep Visits in Jaipur',
      price: 'Standard Travel Rates',
      image: '/src/assets/images/home_salon_service_1790676110547.jpg',
      category: 'home',
    },
  ];

  return (
    <section id="home" className="relative overflow-hidden pt-4 pb-10 sm:pt-10 sm:pb-16 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Hero Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <RevealOnScroll duration={0.65} yOffset={15}>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-[#4A4A4A] tracking-wider uppercase">
                <span className="text-[#D09A40]">Jaipur's Trusted Salon</span>
                <span aria-hidden="true">·</span>
                <span>3 Branches</span>
                <span aria-hidden="true">·</span>
                <span>15+ Years</span>
              </div>

              {/* Main Headline */}
              <h1 
                className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0F172A] leading-snug sm:leading-[1.12] mt-2 sm:mt-3 break-words overflow-wrap-anywhere"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", textWrap: 'balance' }}
              >
                Luxury Bridal Makeup & Premium Salon Care in Jaipur
              </h1>

              {/* Value Proposition Body */}
              <p className="text-xs sm:text-base text-[#4A4A4A] leading-relaxed max-w-2xl font-light mt-2 sm:mt-4">
                Destination wedding makeovers at Rambagh & Fairmont, smooth hair botox, 24K gold facials, and certified courses. 5-star salon care at our 3 Jaipur branches or right at your doorstep.
              </p>

              {/* Mobile Compact Action Buttons */}
              <div className="pt-3 sm:pt-6 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3.5">
                <button
                  onClick={onBookClick}
                  className="px-3.5 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-bold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Book Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <a
                  href={SOCIAL_LINKS.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl luxe-btn flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="WhatsApp Chat"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={onExploreBridal}
                  className="col-span-2 sm:col-span-1 px-4 py-2.5 sm:px-6 sm:py-3.5 text-xs sm:text-sm font-semibold text-[#0F172A] bg-white hover:bg-[#FAF5E5] border border-[#0F172A]/15 rounded-xl luxe-btn flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
                  <span>View Bridal Photos</span>
                </button>
              </div>

              {/* Social Channels Bar */}
              <div className="pt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-xs font-semibold text-[#4A4A4A]/80 uppercase tracking-wider">
                  Connect:
                </span>

                <a
                  href={SOCIAL_LINKS.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-50 hover:bg-pink-100 border border-pink-200 text-[11px] font-medium text-pink-900"
                >
                  <InstagramIcon className="w-3 h-3 text-pink-600" />
                  <span className="font-bold">Instagram</span>
                  <span className="text-[10px] text-pink-700 font-mono">52K</span>
                </a>

                <a
                  href={SOCIAL_LINKS.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-medium text-emerald-900"
                >
                  <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                  <span className="font-bold">WhatsApp</span>
                </a>

                <a
                  href={SOCIAL_LINKS.facebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[11px] font-medium text-blue-900"
                >
                  <FacebookIcon className="w-3 h-3 text-blue-600" />
                  <span className="font-bold">Facebook</span>
                  <span className="text-[10px] text-blue-700 font-mono">28K</span>
                </a>
              </div>

              {/* Compact Responsive Trust Badges */}
              <div className="pt-4 mt-3 border-t border-[#0F172A]/10 grid grid-cols-3 gap-2 sm:gap-4 text-center sm:text-left">
                <div>
                  <p className="text-lg sm:text-3xl font-bold text-[#0F172A] tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>
                    12,000+
                  </p>
                  <p className="text-[10px] sm:text-xs text-[#4A4A4A] mt-0.5">Brides Styled</p>
                </div>
                <div>
                  <p className="text-lg sm:text-3xl font-bold text-[#D09A40] tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>
                    4.9 / 5.0
                  </p>
                  <p className="text-[10px] sm:text-xs text-[#4A4A4A] mt-0.5">Google Rating</p>
                </div>
                <div>
                  <p className="text-lg sm:text-3xl font-bold text-[#0F172A] tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>
                    100%
                  </p>
                  <p className="text-[10px] sm:text-xs text-[#4A4A4A] mt-0.5">Branded Care</p>
                </div>
              </div>
            </RevealOnScroll>
          </div>

          {/* Right Column: Mobile-Safe Hero Image Container */}
          <div className="lg:col-span-5 w-full">
            <RevealOnScroll direction="left" delay={0.1} duration={0.6}>
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white/60 bg-white/40 aspect-[4/3] sm:aspect-[16/9] lg:aspect-[5/4] group">
                <img
                  src="/src/assets/images/hero_jaipur_salon_1790671992521.jpg"
                  alt="Beauty Zone Jaipur Salon Interior"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-[#0F172A]/20 to-transparent pointer-events-none" />
                
                {/* Floating Social Icons Overlay */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                  <a
                    href={SOCIAL_LINKS.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-black/70 text-white hover:bg-pink-600 transition-colors border border-white/30"
                    title="Instagram"
                  >
                    <InstagramIcon className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={SOCIAL_LINKS.whatsapp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-black/70 text-white hover:bg-emerald-600 transition-colors border border-white/30"
                    title="WhatsApp"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={SOCIAL_LINKS.facebook.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-black/70 text-white hover:bg-blue-600 transition-colors border border-white/30"
                    title="Facebook"
                  >
                    <FacebookIcon className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Floating Location Card Overlay (Mobile Compact) */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 p-3 rounded-xl bg-white border border-[#0F172A]/10 text-[#0F172A] shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#D09A40]" />
                        <p className="text-[10px] font-bold text-[#D09A40] uppercase tracking-wider">C-Scheme Salon</p>
                      </div>
                      <p className="text-xs font-serif font-bold text-[#0F172A] truncate">Private Bridal & Skin Rooms</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Open Today
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>

        {/* Popular Quick Services Carousel/Grid */}
        <div className="mt-10 sm:mt-16 pt-6 sm:pt-10 border-t border-[#0F172A]/10">
          <RevealOnScroll duration={0.5}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#D09A40]">
                  Popular Services
                </span>
                <h3 
                  className="text-base sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-0.5"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Top Requested Treatments
                </h3>
              </div>
              <a
                href="#services"
                className="text-xs font-bold text-[#0F172A] hover:text-[#D09A40] transition-colors flex items-center gap-1 group shrink-0"
              >
                <span>Full Rate Card</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
            {quickServices.map((item, idx) => (
              <RevealOnScroll key={idx} delay={idx * 0.05} duration={0.4}>
                <a
                  href={item.category === 'home' ? '#booking' : '#services'}
                  className="group relative rounded-xl sm:rounded-2xl overflow-hidden bg-white border border-[#0F172A]/10 hover:border-[#D09A40] shadow-2xs flex flex-col h-full cursor-pointer"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover luxe-img-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <span className="text-[9px] sm:text-[10px] font-mono text-white bg-black/75 px-1.5 py-0.5 rounded">
                        {item.price}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-[#0F172A] group-hover:text-[#D09A40] transition-colors leading-snug line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-[#4A4A4A] mt-0.5 line-clamp-1">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-[#D09A40]">
                      <span>Select</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </div>
                </a>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
