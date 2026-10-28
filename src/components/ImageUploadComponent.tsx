import React, { useState, useRef } from 'react';
import { ImagePlus, Loader2, Trash2, Link2, AlertCircle, Camera } from 'lucide-react';
import { SmartImage } from './crud/SmartImage';
import { optimizeImageFile } from '../lib/imageUtils';

interface ImageUploadComponentProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  help?: string;
  aspect?: string;
  className?: string;
}

export const ImageUploadComponent: React.FC<ImageUploadComponentProps> = ({
  value = '',
  onChange,
  label = 'Salon Photo',
  help = 'Upload an image from your device or paste a public URL. Uses FileReader for local preview and optimization.',
  aspect = 'aspect-video',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      // FileReader + optimization via optimizeImageFile
      const optimizedUrl = await optimizeImageFile(file);
      onChange(optimizedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read image file.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`space-y-3 rounded-2xl border border-[#0F172A]/10 bg-[#FAF5E5]/60 p-4 ${className}`}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A]">
          {label}
        </label>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Preview Container */}
        <div
          className={`relative w-full sm:w-44 shrink-0 overflow-hidden rounded-xl border border-[#0F172A]/15 bg-white shadow-2xs ${aspect}`}
        >
          <SmartImage src={value || undefined} alt={label} />
        </div>

        {/* Upload Controls & URL input */}
        <div className="flex-1 min-w-0 space-y-2.5 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F172A] hover:bg-[#D09A40] text-white hover:text-[#0F172A] px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-[#D09A40]" />
              )}
              <span>{loading ? 'Processing FileReader...' : 'Upload Local Image'}</span>
            </button>

            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Link2 className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Or paste image URL (https://...)"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#0F172A]/15 text-xs text-[#0F172A] focus:outline-none focus:border-[#D09A40]"
            />
          </div>

          {help && <p className="text-[11px] text-[#4A4A4A] leading-relaxed">{help}</p>}

          {error && (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
