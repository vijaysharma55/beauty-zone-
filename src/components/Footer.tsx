import React from 'react';
import { SALON_BRANCHES } from '../data/salonData';
import { Phone, MapPin, Sparkles, MessageCircle, ArrowUpRight, Heart, Users, MessageSquare } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { InstagramIcon, WhatsAppIcon, FacebookIcon, SOCIAL_LINKS } from './SocialIcons';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenTokens: () => void;
  onOpenManagement?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBooking, onOpenTokens, onOpenManagement }) => {
  return (
    <footer className="bg-[#0F172A] text-white border-t border-[#D09A40]/20 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Dedicated Social Media Highlight Section */}
        <RevealOnScroll duration={0.6}>
          <div className="mb-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 backdrop-blur-md relative overflow-hidden shadow-2xl">
            {/* Subtle decorative gold glow */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#D09A40]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D09A40]/15 border border-[#D09A40]/30 text-[#D09A40] text-xs font-semibold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Join Our Beauty Community</span>
                  </div>
                  <h3 
                    className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Connect With Us Across Social Media
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 max-w-xl mt-1.5 leading-relaxed">
                    Watch real Jaipur bridal transformations, chat directly with our stylists for instant pricing, 
                    and get exclusive festive salon offers.
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2 text-xs text-white/60">
                  <Users className="w-4 h-4 text-[#D09A40]" />
                  <span>80,000+ Happy Social Followers</span>
                </div>
              </div>

              {/* 3 Dedicated Social Cards (Instagram, WhatsApp, Facebook) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6">
                
                {/* 1. Instagram Card */}
                <a
                  href={SOCIAL_LINKS.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow @beautyzonejaipur on Instagram for daily bridal makeover videos and real customer results"
                  aria-label="Follow Beauty Zone Jaipur on Instagram"
                  className="group relative p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-pink-500/50 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-pink-500/10 hover:-translate-y-0.5 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                        <InstagramIcon className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                        {SOCIAL_LINKS.instagram.followers}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base text-white group-hover:text-pink-300 transition-colors">
                      Instagram
                    </h4>
                    <p className="text-xs font-mono text-[#D09A40] mt-0.5">
                      {SOCIAL_LINKS.instagram.handle}
                    </p>
                    <p className="text-xs text-white/70 mt-2 leading-relaxed">
                      Daily Rajasthani bridal makeover reels, client hair transformation videos, and skin care tips.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-pink-300 group-hover:text-pink-200">
                    <span>Watch Makeover Reels</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </a>

                {/* 2. WhatsApp Card */}
                <a
                  href={SOCIAL_LINKS.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Chat directly with our salon team on WhatsApp (+91 98290 12345) for quick appointments and bridal consultations"
                  aria-label="Chat with Beauty Zone Jaipur on WhatsApp"
                  className="group relative p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-emerald-500/10 hover:-translate-y-0.5 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform relative">
                        <WhatsAppIcon className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0F172A] animate-pulse" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Online Now</span>
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                      WhatsApp Quick Chat
                    </h4>
                    <p className="text-xs font-mono text-emerald-400 mt-0.5">
                      {SOCIAL_LINKS.whatsapp.phone}
                    </p>
                    <p className="text-xs text-white/70 mt-2 leading-relaxed">
                      Instant 5-minute reply for salon appointments, home visit requests, customized bridal quotes, and inquiries.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-emerald-300 group-hover:text-emerald-200">
                    <span>Message on WhatsApp</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </a>

                {/* 3. Facebook Card */}
                <a
                  href={SOCIAL_LINKS.facebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Visit the official Beauty Zone Jaipur Facebook Page for community posts, bridal album photos, and salon announcements"
                  aria-label="Visit Beauty Zone Jaipur on Facebook"
                  className="group relative p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-blue-500/10 hover:-translate-y-0.5 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                        <FacebookIcon className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {SOCIAL_LINKS.facebook.followers}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base text-white group-hover:text-blue-300 transition-colors">
                      Facebook Page
                    </h4>
                    <p className="text-xs font-mono text-[#D09A40] mt-0.5">
                      {SOCIAL_LINKS.facebook.handle}
                    </p>
                    <p className="text-xs text-white/70 mt-2 leading-relaxed">
                      Customer reviews, festival discount announcements, and bridal photo albums from Pink City weddings.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-blue-300 group-hover:text-blue-200">
                    <span>Visit Facebook Page</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </a>

              </div>
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll duration={0.65}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
            {/* Brand Manifesto & Quick Social Links */}
            <div className="lg:col-span-2 space-y-4">
              <span
                className="font-serif text-2xl font-bold tracking-tight text-white block"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Beauty Zone Jaipur
              </span>
              <p className="text-xs sm:text-sm text-white/70 max-w-sm leading-relaxed">
                Jaipur's trusted destination for beautiful bridal makeup, smooth hair treatments, 
                glowing facials, and certified makeup courses.
              </p>
              <div className="pt-1 flex items-center gap-3 text-xs text-[#D09A40]">
                <span>C-Scheme</span>
                <span aria-hidden="true">·</span>
                <span>Malviya Nagar</span>
                <span aria-hidden="true">·</span>
                <span>Vaishali Nagar</span>
              </div>

              {/* Social Media Channels Quick Buttons */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-2.5">
                  Follow & Connect with Us:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Instagram */}
                  <a
                    href={SOCIAL_LINKS.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Follow @beautyzonejaipur on Instagram (52K+ Followers)"
                    aria-label="Follow Beauty Zone Jaipur on Instagram"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-pink-600/30 border border-white/10 hover:border-pink-500/50 text-xs text-white transition-all group"
                  >
                    <InstagramIcon className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-xs">Instagram</span>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={SOCIAL_LINKS.whatsapp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Chat on WhatsApp with Beauty Zone Jaipur (+91 98290 12345)"
                    aria-label="Chat with Beauty Zone Jaipur on WhatsApp"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-600/30 border border-white/10 hover:border-emerald-500/50 text-xs text-white transition-all group"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-xs">WhatsApp</span>
                  </a>

                  {/* Facebook */}
                  <a
                    href={SOCIAL_LINKS.facebook.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Visit Beauty Zone Jaipur Facebook Page (28K+ Likes)"
                    aria-label="Follow Beauty Zone Jaipur on Facebook"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-blue-600/30 border border-white/10 hover:border-blue-500/50 text-xs text-white transition-all group"
                  >
                    <FacebookIcon className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-xs">Facebook</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-semibold text-[#D09A40] uppercase tracking-wider mb-4">
                Popular Services & Perks
              </h4>
              <ul className="space-y-2.5 text-xs text-white/70">
                <li><a href="#rewards" className="hover:text-[#D09A40] text-[#D09A40] font-medium transition-colors">★ Beauty Rewards Club</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">HD Bridal Makeup</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Nanoplastia & Hair Botox</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">24K Gold Leaf Facial</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Gel Nail Extensions</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Rose Milk Body Spa</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Makeup Academy Courses</a></li>
              </ul>
            </div>

            {/* Branches Contact */}
            <div>
              <h4 className="text-xs font-semibold text-[#D09A40] uppercase tracking-wider mb-4">
                Main Salon (C-Scheme)
              </h4>
              <div className="space-y-3 text-xs text-white/70">
                <p className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#D09A40] shrink-0 mt-0.5" />
                  <span>Sardar Patel Marg, C-Scheme, Jaipur 302001</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#D09A40] shrink-0" />
                  <a href="tel:+919829012345" className="hover:text-white transition-colors" title="Call Beauty Zone Jaipur">
                    +91 98290 12345
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <a 
                    href={SOCIAL_LINKS.whatsapp.url}
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Send a message on WhatsApp to +91 98290 12345"
                    aria-label="Send a message on WhatsApp to +91 98290 12345"
                    className="hover:text-emerald-400 transition-colors"
                  >
                    WhatsApp: +91 98290 12345
                  </a>
                </p>
                <p className="text-[11px] text-white/50 pt-1">
                  10:00 AM – 8:30 PM (Open All 7 Days)
                </p>
              </div>
            </div>

            {/* Action & Direct Booking */}
            <div>
              <h4 className="text-xs font-semibold text-[#D09A40] uppercase tracking-wider mb-4">
                Bookings & Admin
              </h4>
              <div className="space-y-3">
                <button
                  onClick={onOpenBooking}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#D09A40] hover:bg-[#DCA54A] text-[#0F172A] font-bold text-xs transition-colors cursor-pointer text-center block shadow-sm"
                  title="Open online appointment booking form"
                >
                  Book Appointment Now
                </button>
                <a
                  href={SOCIAL_LINKS.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Chat directly on WhatsApp (+91 98290 12345) for quick booking"
                  aria-label="Chat directly on WhatsApp for quick booking"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-medium text-xs transition-colors cursor-pointer text-center block shadow-sm flex items-center justify-center gap-2"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>Quick WhatsApp Inquiry</span>
                </a>
                {onOpenManagement && (
                  <button
                    onClick={onOpenManagement}
                    className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition-colors cursor-pointer text-center block border border-white/10 flex items-center justify-center gap-1.5"
                    title="Open Salon Administration Panel"
                  >
                    <span>Salon Admin Panel</span>
                  </button>
                )}
                <button
                  onClick={onOpenTokens}
                  className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 text-xs transition-colors cursor-pointer text-center block border border-white/5"
                  title="View Salon design system details"
                >
                  View Design Details
                </button>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Bottom Bar: Quiet Footer Contract */}
        <RevealOnScroll delay={0.15} duration={0.5}>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
            <p>© 2026 Beauty Zone Jaipur. All rights reserved.</p>

            {/* Social Icons Quick Row with Accessible Link Titles */}
            <div className="flex items-center gap-3">
              <a
                href={SOCIAL_LINKS.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-pink-600/30 hover:text-pink-400 text-white/70 transition-all border border-transparent hover:border-pink-500/40"
                title="Follow Beauty Zone Jaipur on Instagram (@beautyzonejaipur)"
                aria-label="Follow Beauty Zone Jaipur on Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href={SOCIAL_LINKS.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-emerald-600/30 hover:text-emerald-400 text-white/70 transition-all border border-transparent hover:border-emerald-500/40"
                title="Chat with Beauty Zone Jaipur on WhatsApp (+91 98290 12345)"
                aria-label="Chat with Beauty Zone Jaipur on WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </a>
              <a
                href={SOCIAL_LINKS.facebook.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-white/5 hover:bg-blue-600/30 hover:text-blue-400 text-white/70 transition-all border border-transparent hover:border-blue-500/40"
                title="Visit Beauty Zone Jaipur on Facebook (Official Page)"
                aria-label="Visit Beauty Zone Jaipur on Facebook"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
            </div>

            <div className="flex items-center gap-6">
              <a href="#founder" className="hover:text-white transition-colors" title="About Founder">About Founder</a>
              <span aria-hidden="true">·</span>
              <a href="#gallery" className="hover:text-white transition-colors" title="Real Customer Photos">Real Photos</a>
              <span aria-hidden="true">·</span>
              <a href="#bundles" className="hover:text-white transition-colors" title="Combo Packages">Combo Packages</a>
              <span aria-hidden="true">·</span>
              <a href="#locations" className="hover:text-white transition-colors" title="Salon Locations in Jaipur">Our Salons</a>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </footer>
  );
};
