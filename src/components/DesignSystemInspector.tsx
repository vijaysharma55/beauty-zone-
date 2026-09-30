import React, { useState } from 'react';
import { DESIGN_TOKENS } from '../data/salonData';
import { 
  X, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Play,
  RotateCcw
} from 'lucide-react';

interface DesignSystemInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesignSystemInspector: React.FC<DesignSystemInspectorProps> = ({ isOpen, onClose }) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'colors' | 'typography' | 'spacing' | 'motion' | 'components'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [animatingToken, setAnimatingToken] = useState<string | null>(null);

  // Collapsible section state matching screenshot ▲ / ▼
  const [sectionsOpen, setSectionsOpen] = useState<{ [key: string]: boolean }>({
    colors: true,
    typography: true,
    spacing: true,
    shadows: true,
    motion: true,
    components: true,
    profile: true,
  });

  const toggleSection = (key: string) => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed z-50 transition-all duration-300 ${
        isExpanded 
          ? 'inset-4 md:inset-10 bg-white/98 shadow-2xl rounded-2xl flex flex-col border border-[#0F172A]/20'
          : 'bottom-4 right-4 md:right-8 w-full max-w-md max-h-[85vh] bg-[#F7F7F8] rounded-xl shadow-2xl flex flex-col border border-neutral-300'
      }`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header bar matching AI Studio style */}
      <div className="px-4 py-3 bg-[#EBECEF] rounded-t-xl border-b border-neutral-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D09A40]" />
          <span className="text-xs font-bold text-[#1F1F1F] tracking-tight">
            Design System Token Inspector
          </span>
          <span className="text-[10px] text-neutral-500 bg-neutral-200/80 px-1.5 py-0.5 rounded font-mono">
            Extracted Spec
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-neutral-600 hover:text-black hover:bg-neutral-200 cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand full screen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-600 hover:text-black hover:bg-neutral-200 cursor-pointer"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Category Bar */}
      <div className="px-3 py-1.5 bg-[#F0F1F3] border-b border-neutral-200 flex items-center gap-1 overflow-x-auto text-[11px]">
        {(['all', 'colors', 'typography', 'spacing', 'motion', 'components'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1 rounded capitalize whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === tab
                ? 'bg-white text-black font-semibold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Scrollable Content Container */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1 text-[#1F1F1F]">
        {/* SECTION 1: Colors (Matches Screenshot 1 & 6) */}
        {(activeTab === 'all' || activeTab === 'colors') && (
          <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-xs">
            <div 
              onClick={() => toggleSection('colors')}
              className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-neutral-100"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#1F1F1F]">Colors</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span>{DESIGN_TOKENS.colors.length} tokens</span>
                {sectionsOpen.colors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </div>

            {sectionsOpen.colors && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Beauty Zone Jaipur & Studio Tokens</p>
                {DESIGN_TOKENS.colors.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => copyToClipboard(c.hex)}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-neutral-50 transition-colors cursor-pointer group text-xs"
                    title="Click to copy HEX"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-5 h-5 rounded border border-neutral-300 shadow-2xs shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="font-mono font-medium text-neutral-900">{c.hex}</span>
                    </div>

                    <div className="flex items-center gap-2 text-neutral-500 text-[11px]">
                      <span>{c.role}</span>
                      {copiedHex === c.hex ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-neutral-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: Typography (Matches Screenshot 2) */}
        {(activeTab === 'all' || activeTab === 'typography') && (
          <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-xs">
            <div 
              onClick={() => toggleSection('typography')}
              className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-neutral-100"
            >
              <span className="font-bold text-sm text-[#1F1F1F]">Typography</span>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span>3 fonts, 5 sizes</span>
                {sectionsOpen.typography ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </div>

            {sectionsOpen.typography && (
              <div className="mt-3 space-y-4">
                {/* Font Families */}
                <div className="space-y-3">
                  {DESIGN_TOKENS.typography.fonts.map((f, i) => (
                    <div key={i} className="border-b border-neutral-100 pb-2">
                      <div className="text-2xl font-normal leading-none mb-1">Aa</div>
                      <div className="text-xs font-medium text-neutral-800">{f.name}</div>
                      <div className="text-[10px] text-neutral-400">{f.role} ({f.weights})</div>
                    </div>
                  ))}
                </div>

                {/* Size Scale Badges */}
                <div>
                  <div className="text-[11px] font-bold text-neutral-700 mb-2">Size Scale</div>
                  <div className="flex flex-wrap gap-1.5">
                    {DESIGN_TOKENS.typography.sizes.map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-neutral-100 border border-neutral-200 rounded text-[11px] font-mono text-neutral-700"
                      >
                        {s.token} ({s.sizePx})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Weight Scale */}
                <div>
                  <div className="text-[11px] font-bold text-neutral-700 mb-2">Weight Scale</div>
                  <div className="flex items-center gap-1.5">
                    {['300', '400', '500', '600', '700'].map((w) => (
                      <span
                        key={w}
                        className="px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded text-[11px] font-mono text-neutral-800"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: Spacing & Shadows (Matches Screenshot 3) */}
        {(activeTab === 'all' || activeTab === 'spacing') && (
          <>
            <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-xs">
              <div 
                onClick={() => toggleSection('spacing')}
                className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-neutral-100"
              >
                <span className="font-bold text-sm text-[#1F1F1F]">Spacing</span>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span>base: 4px, 10 tokens</span>
                  {sectionsOpen.spacing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              {sectionsOpen.spacing && (
                <div className="mt-3 space-y-2">
                  {DESIGN_TOKENS.spacing.tokens.map((sp, i) => (
                    <div key={i} className="flex items-center text-xs">
                      <span className="w-16 font-mono text-neutral-600 text-[11px]">{sp.token}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div
                          className="h-2 bg-[#1F1F1F] rounded-xs"
                          style={{ width: `${Math.max(sp.widthPercent, 4)}%` }}
                        />
                        <span className="text-[11px] text-neutral-400 font-mono">{sp.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-xs">
              <div 
                onClick={() => toggleSection('shadows')}
                className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-neutral-100"
              >
                <span className="font-bold text-sm text-[#1F1F1F]">Shadows</span>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span>2 tokens</span>
                  {sectionsOpen.shadows ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              {sectionsOpen.shadows && (
                <div className="mt-3 space-y-3">
                  {DESIGN_TOKENS.shadows.map((sh, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded bg-white shrink-0 border border-neutral-200"
                        style={{ boxShadow: sh.value }}
                      />
                      <div className="text-[11px] text-neutral-600 overflow-hidden">
                        <div className="font-semibold text-neutral-900">{sh.name}</div>
                        <div className="font-mono text-[10px] text-neutral-400 break-all">{sh.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* SECTION 4: Motion (Matches Screenshot 4 & 5) */}
        {(activeTab === 'all' || activeTab === 'motion') && (
          <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-xs">
            <div 
              onClick={() => toggleSection('motion')}
              className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-neutral-100"
            >
              <span className="font-bold text-sm text-[#1F1F1F]">Motion</span>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span>19 tokens</span>
                {sectionsOpen.motion ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </div>

            {sectionsOpen.motion && (
              <div className="mt-3 space-y-2 text-xs">
                {DESIGN_TOKENS.motionTokens.map((m, i) => (
                  <div key={i} className="flex items-baseline justify-between p-1.5 hover:bg-neutral-50 rounded">
                    <span className="font-mono font-medium text-neutral-900 w-24 shrink-0 text-[11px]">
                      {m.token}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-500 flex-1 truncate px-2">
                      {m.rule}
                    </span>
                    <button
                      onClick={() => {
                        setAnimatingToken(m.token + i);
                        setTimeout(() => setAnimatingToken(null), 800);
                      }}
                      className={`p-1 rounded text-neutral-400 hover:text-black hover:bg-neutral-200 cursor-pointer ${
                        animatingToken === m.token + i ? 'animate-bounce text-[#D09A40]' : ''
                      }`}
                      title="Test Animation"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: Components Inventory & Website Profile (Matches Screenshot 5 & 6) */}
        {(activeTab === 'all' || activeTab === 'components') && (
          <>
            <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-xs">
              <div 
                onClick={() => toggleSection('components')}
                className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-neutral-100"
              >
                <span className="font-bold text-sm text-[#1F1F1F]">Components</span>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span>{DESIGN_TOKENS.componentsInventory.totalDetected} detected</span>
                  {sectionsOpen.components ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              {sectionsOpen.components && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {DESIGN_TOKENS.componentsInventory.items.map((item, i) => (
                    <div key={i} className="p-2 bg-neutral-50 rounded border border-neutral-100">
                      <div className="text-neutral-500 text-[10px]">{item.name}</div>
                      <div className="font-bold text-neutral-800 text-xs mt-0.5">{item.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-xs">
              <div 
                onClick={() => toggleSection('profile')}
                className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-neutral-100"
              >
                <span className="font-bold text-sm text-[#1F1F1F]">Website Profile</span>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">high confidence</span>
                  {sectionsOpen.profile ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              {sectionsOpen.profile && (
                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <span className="text-neutral-400 text-[10px] block">Surface:</span>
                    <span className="font-semibold text-neutral-800">{DESIGN_TOKENS.websiteProfile.surface}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] block">Audience:</span>
                    <span className="text-neutral-700">{DESIGN_TOKENS.websiteProfile.audience}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 text-[10px] block">Brand Character:</span>
                    <p className="text-neutral-600 text-[11px] leading-relaxed mt-0.5">
                      {DESIGN_TOKENS.websiteProfile.brandCharacter}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-[#EBECEF] rounded-b-xl border-t border-neutral-300 flex items-center justify-between text-[11px] text-neutral-600">
        <span>Google AI Studio Design Tokens</span>
        <button
          onClick={() => copyToClipboard(JSON.stringify(DESIGN_TOKENS, null, 2))}
          className="text-xs text-[#0F172A] font-semibold hover:text-[#D09A40] cursor-pointer flex items-center gap-1"
        >
          <Copy className="w-3 h-3" />
          <span>Copy Raw JSON</span>
        </button>
      </div>
    </div>
  );
};
