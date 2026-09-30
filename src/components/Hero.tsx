import React from 'react';
import { Sparkles, ArrowRight, ArrowUpRight, MessageCircle } from 'lucide-react';
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
      subtitle: 'Real Gold Leaf & Kesar Glow',
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
      subtitle: 'Clean & Sanitized Home Visits',
      price: 'Standard Travel Rates',
      image: '/src/assets/images/home_salon_service_1790676110547.jpg',
      category: 'home',
    },
  ];

  return (
    <section id="home" className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <RevealOnScroll duration={0.65} yOffset={20}>
              <div className="flex items-center gap-2 text-xs font-medium text-[#4A4A4A] tracking-wider uppercase">
                <span className="text-[#D09A40] font-semibold">Jaipur's Trusted Salon</span>
                <span aria-hidden="true">·</span>
                <span>3 Salon Branches</span>
                <span aria-hidden="true">·</span>
                <span>15+ Years of Excellence</span>
              </div>

              {/* Main Headline */}
              <h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0F172A] leading-[1.12] mt-4"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", textWrap: 'balance' }}
              >
                Luxury Bridal Makeup & Premium Salon Services in Jaipur
              </h1>

              {/* Value Proposition Body in Simple Indian English */}
              <p className="text-base sm:text-lg text-[#4A4A4A] leading-relaxed max-w-2xl font-light mt-4">
                From grand destination wedding makeovers at Rambagh and Fairmont to smooth hair botox, 
                24K gold facials, and certified makeup courses. Enjoy five-star salon care at our 3 luxury 
                salons or right at your doorstep anywhere in Jaipur.
              </p>

              {/* Action buttons */}
              <div className="pt-6 flex flex-wrap items-center gap-3.5">
                <button
                  onClick={onBookClick}
                  className="px-6 py-3.5 text-sm font-semibold text-white bg-[#0F172A] hover:bg-[#D09A40] rounded-xl luxe-btn shadow-sm flex items-center gap-2.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Book Appointment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onExploreBridal}
                  className="px-6 py-3.5 text-sm font-semibold text-[#0F172A] bg-white/80 hover:bg-white border border-[#0F172A]/15 hover:border-[#D09A40] rounded-xl luxe-btn flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4 text-[#D09A40]" />
                  <span>View Bridal Photos</span>
                </button>

                {/* Direct WhatsApp Action Button */}
                <a
                  href={SOCIAL_LINKS.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3.5 text-sm font-semibold text-emerald-800 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl luxe-btn flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors"
                  title="Chat with our salon manager on WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Us</span>
                </a>
              </div>

              {/* Social Media Proof & Quick Connect Strip */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-[#4A4A4A]/80 uppercase tracking-wider">
                  Connect With Us:
                </span>

                {/* Instagram Link */}
                <a
                  href={SOCIAL_LINKS.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50/80 hover:bg-pink-100 border border-pink-200/70 text-xs font-medium text-pink-900 transition-all duration-200 group shadow-2xs"
                  aria-label="Follow Beauty Zone Jaipur on Instagram"
                >
                  <InstagramIcon className="w-3.5 h-3.5 text-pink-600 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-pink-950">Instagram</span>
                  <span className="text-[11px] text-pink-700/80 font-mono">52K+</span>
                </a>

                {/* WhatsApp Link */}
                <a
                  href={SOCIAL_LINKS.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/70 text-xs font-medium text-emerald-900 transition-all duration-200 group shadow-2xs"
                  aria-label="Message Beauty Zone Jaipur on WhatsApp"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-emerald-950">WhatsApp</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </a>

                {/* Facebook Link */}
                <a
                  href={SOCIAL_LINKS.facebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/80 hover:bg-blue-100 border border-blue-200/70 text-xs font-medium text-blue-900 transition-all duration-200 group shadow-2xs"
                  aria-label="Visit Beauty Zone Jaipur on Facebook"
                >
                  <FacebookIcon className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-blue-950">Facebook</span>
                  <span className="text-[11px] text-blue-700/80 font-mono">28K+</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 mt-4 border-t border-[#0F172A]/10 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>
                    12,000+
                  </p>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">Happy Brides Styled</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-[#D09A40] tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>
                    4.9 / 5.0
                  </p>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">Google Verified Rating</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] tabular-nums" style={{ fontFamily: "'Playfair Display', serif" }}>
                    100%
                  </p>
                  <p className="text-xs text-[#4A4A4A] mt-0.5">Safe Branded Products</p>
                </div>
              </div>
            </RevealOnScroll>
          </div>

          {/* Right Column: Hero Visual Card */}
          <div className="lg:col-span-5">
            <RevealOnScroll direction="left" delay={0.15} duration={0.7}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/40 bg-white/10 backdrop-blur-xs aspect-[4/3] lg:aspect-[5/4] group transition-all duration-500">
                <img
                  src="/src/assets/images/hero_jaipur_salon_1790671992521.jpg"
                  alt="Beauty Zone Jaipur Salon Interior"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 via-[#0F172A]/20 to-transparent pointer-events-none" />
                
                {/* Floating Social Badge Overlay */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <a
                    href={SOCIAL_LINKS.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-black/40 backdrop-blur-md text-white/90 hover:text-white hover:bg-pink-600/80 transition-all border border-white/20 shadow-lg"
                    title="Watch our bridal transformation reels on Instagram"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>
                  <a
                    href={SOCIAL_LINKS.whatsapp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-black/40 backdrop-blur-md text-white/90 hover:text-white hover:bg-emerald-600/80 transition-all border border-white/20 shadow-lg"
                    title="Chat on WhatsApp"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                  </a>
                  <a
                    href={SOCIAL_LINKS.facebook.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-black/40 backdrop-blur-md text-white/90 hover:text-white hover:bg-blue-600/80 transition-all border border-white/20 shadow-lg"
                    title="Follow our salon on Facebook"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </a>
                </div>

                {/* Floating Card */}
                <div className="absolute bottom-5 left-5 right-5 p-5 rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 text-[#0F172A] shadow-xl luxe-card-hover animate-float-subtle cursor-pointer">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#D09A40]" />
                        <p className="text-xs font-semibold text-[#D09A40] uppercase tracking-wider">C-Scheme Flagship Salon</p>
                      </div>
                      <p className="text-sm sm:text-base font-serif font-bold text-[#0F172A] mt-0.5">Private Bridal Suite & Skin Rooms</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-800 bg-white/80 border border-emerald-200/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                        Open Today
                      </span>
                      <p className="text-[11px] text-[#4A4A4A] mt-1 font-mono">10:00 AM – 8:30 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>

        {/* Popular Services Grid */}
        <div className="mt-16 pt-10 border-t border-[#0F172A]/10">
          <RevealOnScroll duration={0.6}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#D09A40]">
                  Popular Salon & Home Services
                </span>
                <h3 
                  className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-1"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Top Services with Real Customer Results
                </h3>
              </div>
              <a
                href="#services"
                className="text-xs font-bold text-[#0F172A] hover:text-[#D09A40] transition-colors flex items-center gap-1 group"
              >
                <span>View Full Rate Card</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickServices.map((item, idx) => (
              <RevealOnScroll key={idx} delay={idx * 0.08} duration={0.5}>
                <a
                  href={item.category === 'home' ? '#booking' : '#services'}
                  className="group relative rounded-2xl overflow-hidden bg-white/75 backdrop-blur-md border border-white/60 hover:border-[#D09A40] luxe-card-hover shadow-xs flex flex-col cursor-pointer h-full"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover luxe-img-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2 text-white">
                      <span className="text-[10px] font-mono text-[#FAF5E5] bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded">
                        {item.price}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-[#0F172A] group-hover:text-[#D09A40] transition-colors leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#4A4A4A] mt-1 line-clamp-1">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] font-semibold text-[#D09A40]">
                      <span>View Service</span>
                      <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
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
