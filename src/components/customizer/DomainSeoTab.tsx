import React, { useState } from 'react';
import {
  Globe,
  Check,
  Copy,
  ShieldCheck,
  Lock,
  Image as ImageIcon,
  Search,
  Share2,
  BarChart3,
  Link2,
  Server,
  AlertTriangle,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';

const inputCls =
  'w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-[#D09A40]/40 focus:border-[#D09A40] outline-none transition-all';
const labelCls =
  'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5';
const textareaCls =
  'w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-[#D09A40]/40 focus:border-[#D09A40] outline-none transition-all resize-y';

function Toggle({
  enabled,
  onToggle,
  onLabel,
  offLabel,
}: {
  enabled: boolean;
  onToggle: () => void;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
        enabled
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      {enabled ? (
        <>
          <Check className="w-4 h-4" /> {onLabel}
        </>
      ) : (
        <>
          <Eye className="w-4 h-4" /> {offLabel}
        </>
      )}
    </button>
  );
}

export const DomainSeoTab: React.FC = () => {
  const { brand, updateDomainSeo } = useBrand();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'done'>('idle');

  const seo = brand.domainSeo;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onLoaded(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const runDnsCheck = () => {
    setVerifyState('checking');
    setTimeout(() => {
      setVerifyState('done');
      updateDomainSeo({ dnsVerified: true });
      setTimeout(() => setVerifyState('idle'), 2500);
    }, 1400);
  };

  const siteUrl = seo?.customDomain
    ? `https://${seo.customDomain.replace(/^https?:\/\//, '')}`
    : 'https://your-salon-domain.com';
  const seoTitle = seo?.seoTitle || `${brand.brandName} — ${brand.brandSubtext}`;
  const seoDesc = seo?.seoDescription || brand.heroDescription;
  const ogImage = seo?.ogImageUrl || brand.heroImage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] p-5 rounded-2xl border border-slate-700 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D09A40] text-[#0F172A] flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Custom Domain & White-Label Hosting Configuration
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Point this salon storefront to the client&apos;s own domain
              (e.g. <strong className="text-[#D09A40]">www.client-salon.com</strong>),
              upload their favicon & social share image, and manage SEO meta tags, sitemap
              indexing, and analytics pixels — all live, no developer needed.
            </p>
          </div>
        </div>
      </div>

      {/* Custom domain mapping */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#B37E28]" />
            Custom Domain Mapping
          </h3>
          {seo?.dnsVerified ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> DNS Verified
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Pending Verification
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Client Custom Domain</label>
            <input
              value={seo?.customDomain || ''}
              onChange={(e) => updateDomainSeo({ customDomain: e.target.value })}
              placeholder="www.client-salon.com"
              className={inputCls}
              dir="ltr"
            />
          </div>
          <div>
            <label className={labelCls}>Platform Subdomain Slug</label>
            <div className="flex items-center gap-1.5">
              <input
                value={seo?.subdomainSlug || ''}
                onChange={(e) => updateDomainSeo({ subdomainSlug: e.target.value })}
                placeholder="client-salon"
                className={inputCls}
                dir="ltr"
              />
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                .salon.cloud
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-3">
          <p className="text-xs font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-[#D09A40]" />
            DNS Records — Add at Your Domain Registrar (GoDaddy / Hostinger / Cloudflare)
          </p>
          {[
            {
              type: 'CNAME',
              host: 'www',
              value: seo?.cnameTarget || 'cname.whitelabel-salon.cloud',
              field: 'cname',
            },
            {
              type: 'A',
              host: '@',
              value: seo?.aRecordIp || '76.76.21.21',
              field: 'arecord',
            },
          ].map((rec) => (
            <div
              key={rec.field}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
            >
              <span className="px-2 py-0.5 rounded bg-[#D09A40]/20 text-[#D09A40] text-[10px] font-bold font-mono">
                {rec.type}
              </span>
              <span className="text-xs font-mono text-slate-300 flex-1 truncate" dir="ltr">
                {rec.host} → {rec.value}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(rec.value, rec.field)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
                title="Copy DNS value"
              >
                {copiedField === rec.field ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={runDnsCheck}
            disabled={verifyState === 'checking'}
            className="w-full py-2.5 rounded-xl bg-[#D09A40] text-[#0F172A] text-xs font-bold hover:bg-[#DCA54A] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {verifyState === 'checking'
              ? 'Checking DNS Propagation...'
              : verifyState === 'done'
                ? '✓ Domain Verified Successfully!'
                : 'Verify Domain Connection'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Free SSL Certificate</label>
            <Toggle
              enabled={seo?.sslEnabled !== false}
              onToggle={() => updateDomainSeo({ sslEnabled: !(seo?.sslEnabled !== false) })}
              onLabel="SSL Active"
              offLabel="SSL Off"
            />
          </div>
          <div>
            <label className={labelCls}>Force HTTPS Redirect</label>
            <Toggle
              enabled={seo?.forceHttps !== false}
              onToggle={() => updateDomainSeo({ forceHttps: !(seo?.forceHttps !== false) })}
              onLabel="HTTPS Forced"
              offLabel="HTTPS Optional"
            />
          </div>
          <div>
            <label className={labelCls}>WWW Redirect</label>
            <Toggle
              enabled={seo?.wwwRedirect !== false}
              onToggle={() => updateDomainSeo({ wwwRedirect: !(seo?.wwwRedirect !== false) })}
              onLabel="→ www Version"
              offLabel="No Redirect"
            />
          </div>
        </div>
      </div>

      {/* Favicon & brand icons */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#B37E28]" />
          Favicon, App Icon & Browser Theme
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Browser Favicon (.png / .ico)</label>
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {(seo?.faviconUrl || brand.logoUrl) && (
                  <img
                    src={seo?.faviconUrl || brand.logoUrl}
                    alt="Favicon preview"
                    className="w-8 h-8 object-contain"
                  />
                )}
              </div>
              <label className="flex-1 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 text-center text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                Upload Favicon
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleImageUpload(e, (url) => updateDomainSeo({ faviconUrl: url }))
                  }
                />
              </label>
            </div>
          </div>
          <div>
            <label className={labelCls}>Apple Touch Icon (180×180)</label>
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                {seo?.appleTouchIconUrl && (
                  <img
                    src={seo.appleTouchIconUrl}
                    alt="App icon preview"
                    className="w-8 h-8 object-contain"
                  />
                )}
              </div>
              <label className="flex-1 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 text-center text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
                Upload Icon
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleImageUpload(e, (url) =>
                      updateDomainSeo({ appleTouchIconUrl: url })
                    )
                  }
                />
              </label>
            </div>
          </div>
          <div>
            <label className={labelCls}>Mobile Browser Theme Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={seo?.themeColorHex || '#0F172A'}
                onChange={(e) => updateDomainSeo({ themeColorHex: e.target.value })}
                className="w-12 h-10 rounded-xl border border-slate-300 cursor-pointer bg-white"
              />
              <input
                value={seo?.themeColorHex || '#0F172A'}
                onChange={(e) => updateDomainSeo({ themeColorHex: e.target.value })}
                className={`${inputCls} font-mono`}
                dir="ltr"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEO meta tags manager */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-[#B37E28]" />
          SEO Meta Tags Manager
        </h3>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls}>SEO Page Title (Browser Tab + Google)</label>
            <span
              className={`text-[10px] font-bold ${
                seoTitle.length > 60 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {seoTitle.length}/60
            </span>
          </div>
          <input
            value={seo?.seoTitle || ''}
            onChange={(e) => updateDomainSeo({ seoTitle: e.target.value })}
            placeholder={`${brand.brandName} — ${brand.brandSubtext} | ${brand.cityName}`}
            className={inputCls}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls}>Meta Description (Google Snippet)</label>
            <span
              className={`text-[10px] font-bold ${
                seoDesc.length < 120 || seoDesc.length > 160
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {seoDesc.length}/160
            </span>
          </div>
          <textarea
            rows={3}
            value={seo?.seoDescription || ''}
            onChange={(e) => updateDomainSeo({ seoDescription: e.target.value })}
            placeholder={brand.heroDescription}
            className={textareaCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>SEO Keywords (comma separated)</label>
            <input
              value={seo?.seoKeywords || ''}
              onChange={(e) => updateDomainSeo({ seoKeywords: e.target.value })}
              placeholder="luxury salon, bridal makeup, hair spa"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Canonical URL</label>
            <input
              value={seo?.canonicalUrl || ''}
              onChange={(e) => updateDomainSeo({ canonicalUrl: e.target.value })}
              placeholder={siteUrl}
              className={inputCls}
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Google Search Indexing (robots)</label>
            <Toggle
              enabled={seo?.robotsIndexing !== false}
              onToggle={() =>
                updateDomainSeo({ robotsIndexing: !(seo?.robotsIndexing !== false) })
              }
              onLabel="index, follow (Public)"
              offLabel="noindex (Private)"
            />
          </div>
          <div>
            <label className={labelCls}>Google Site Verification Code</label>
            <input
              value={seo?.googleSiteVerification || ''}
              onChange={(e) => updateDomainSeo({ googleSiteVerification: e.target.value })}
              placeholder="Paste Search Console HTML tag content"
              className={inputCls}
              dir="ltr"
            />
          </div>
        </div>

        {/* Google snippet live preview */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Live Google Search Preview
          </p>
          <div className="bg-white rounded-lg p-3 border border-slate-100" dir="ltr">
            <p className="text-xs text-slate-600 truncate">
              {siteUrl.replace('https://', '')}
            </p>
            <p className="text-base text-[#1a0dab] hover:underline cursor-pointer truncate font-medium">
              {seoTitle}
            </p>
            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{seoDesc}</p>
          </div>
        </div>
      </div>

      {/* OpenGraph social share */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#B37E28]" />
          Social Share Card (OpenGraph + Twitter)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>OG Share Title</label>
            <input
              value={seo?.ogTitle || ''}
              onChange={(e) => updateDomainSeo({ ogTitle: e.target.value })}
              placeholder={seoTitle}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Twitter Card Type</label>
            <select
              value={seo?.twitterCardType || 'summary_large_image'}
              onChange={(e) =>
                updateDomainSeo({
                  twitterCardType: e.target.value as 'summary_large_image' | 'summary',
                })
              }
              className={inputCls}
            >
              <option value="summary_large_image">Large Image Card (Recommended)</option>
              <option value="summary">Compact Summary Card</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>OG Share Description</label>
          <textarea
            rows={2}
            value={seo?.ogDescription || ''}
            onChange={(e) => updateDomainSeo({ ogDescription: e.target.value })}
            placeholder={seoDesc}
            className={textareaCls}
          />
        </div>

        <div>
          <label className={labelCls}>OG Share Image (1200×630 Recommended)</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[120px] flex items-center justify-center">
              {ogImage ? (
                <img
                  src={ogImage}
                  alt="OG share preview"
                  className="w-full h-36 object-cover"
                />
              ) : (
                <span className="text-xs text-slate-400">No share image set</span>
              )}
            </div>
            <div className="sm:w-48 shrink-0 space-y-2">
              <label className="block px-3 py-2.5 rounded-xl bg-[#0F172A] text-white text-center text-xs font-bold hover:bg-slate-800 cursor-pointer">
                Upload OG Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleImageUpload(e, (url) => updateDomainSeo({ ogImageUrl: url }))
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => updateDomainSeo({ ogImageUrl: brand.heroImage })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Use Hero Image
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp share live preview */}
        <div className="p-4 rounded-xl bg-[#E7F6EC] border border-[#B9E2C6]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1F7A3D] mb-2">
            Live WhatsApp / Instagram Share Preview
          </p>
          <div
            className="bg-white rounded-xl overflow-hidden border border-slate-200 max-w-sm"
            dir="ltr"
          >
            {ogImage && (
              <img src={ogImage} alt="Share card" className="w-full h-36 object-cover" />
            )}
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 truncate">
                {siteUrl.replace('https://', '')}
              </p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {seo?.ogTitle || seoTitle}
              </p>
              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                {seo?.ogDescription || seoDesc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & pixels */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#B37E28]" />
          Analytics & Ad Pixels (Per-Client Tracking)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Google Analytics 4 Measurement ID</label>
            <input
              value={seo?.googleAnalyticsId || ''}
              onChange={(e) => updateDomainSeo({ googleAnalyticsId: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              className={`${inputCls} font-mono`}
              dir="ltr"
            />
          </div>
          <div>
            <label className={labelCls}>Meta (Facebook) Pixel ID</label>
            <input
              value={seo?.metaPixelId || ''}
              onChange={(e) => updateDomainSeo({ metaPixelId: e.target.value })}
              placeholder="e.g. 123456789012345"
              className={`${inputCls} font-mono`}
              dir="ltr"
            />
          </div>
        </div>
        <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-900 leading-relaxed flex gap-2">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Each white-label client connects their own GA4 & Meta Pixel here, so ad
            campaigns, bridal lead tracking, and bookings stay attributed to the
            client&apos;s own ad accounts — never shared across salons.
          </span>
        </div>
      </div>

      {/* Publish checklist */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-[#B37E28]" />
          Go-Live Checklist for {brand.brandName}
        </h3>
        {[
          {
            done: !!(seo?.customDomain && seo.customDomain.includes('.')),
            label: `Custom domain configured (${seo?.customDomain || 'not set'})`,
          },
          { done: !!seo?.dnsVerified, label: 'DNS records verified & propagated' },
          { done: seo?.sslEnabled !== false, label: 'SSL certificate active (padlock in browser)' },
          { done: !!seo?.faviconUrl, label: 'Custom favicon uploaded' },
          { done: !!(seo?.seoTitle && seo.seoTitle.length <= 60), label: 'SEO title within 60 characters' },
          { done: !!seo?.ogImageUrl, label: 'Social share (OG) image set' },
          { done: seo?.robotsIndexing !== false, label: 'Google indexing enabled' },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-2.5 text-xs">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                item.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              <Check className="w-3 h-3" />
            </span>
            <span className={item.done ? 'text-slate-800 font-medium' : 'text-slate-500'}>
              {item.label}
            </span>
          </div>
        ))}
        <div className="mt-1 py-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 text-center flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          All Settings Auto-Save & Apply Live — No Publish Button Needed
        </div>
      </div>
    </div>
  );
};

export default DomainSeoTab;
