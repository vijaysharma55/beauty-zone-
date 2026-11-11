import React, { useRef, useState } from 'react';
import { AlertCircle, ImagePlus, Link2, Loader2, Trash2 } from 'lucide-react';
import { Button, Input } from '../ui';
import { uploadServiceImage } from '../../lib/serviceImages';

/**
 * Catalogue cover-image picker.
 *
 * Uploads are compressed in the browser, then stored in the Supabase
 * `beautyzone-assets` bucket. When Storage is unavailable the optimised image
 * is embedded as a data URL so the owner never loses their edit. Pasting an
 * external https URL is always available too.
 */
export const ServiceImageField: React.FC<{
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  onWarning?: (message: string) => void;
}> = ({
  value,
  onChange,
  label = 'Service image',
  hint = 'Square photos look best on the website (JPG, PNG or WEBP, up to 8 MB).',
  disabled = false,
  onWarning,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [source, setSource] = useState<'storage' | 'inline' | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const result = await uploadServiceImage(file);
      onChange(result.url);
      setSource(result.source);
      if (result.warning) onWarning?.(result.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that image.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
          {value ? (
            <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-7 w-7 text-slate-300" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              disabled={disabled || uploading}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={uploading}
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              {!uploading && <ImagePlus className="h-3.5 w-3.5" />}
              {value ? 'Replace image' : 'Upload image'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => setShowUrl((open) => !open)}
            >
              <Link2 className="h-3.5 w-3.5" /> Use URL
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  onChange('');
                  setSource(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>

          {showUrl && (
            <div className="flex gap-2">
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://images.example.com/gel-nails.jpg"
                aria-label={`${label} URL`}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  const next = urlDraft.trim();
                  if (!next) return;
                  onChange(next);
                  setSource(null);
                  setUrlDraft('');
                  setShowUrl(false);
                }}
              >
                Apply
              </Button>
            </div>
          )}

          {hint && <p className="text-xs text-slate-500">{hint}</p>}
          {value && source === 'storage' && (
            <p className="text-xs font-medium text-emerald-700">Stored in Supabase Storage.</p>
          )}
          {value && source === 'inline' && (
            <p className="text-xs font-medium text-amber-700">Using the embedded image fallback.</p>
          )}
          {error && (
            <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
        </div>
      </div>
      {uploading && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Optimising and uploading…
        </p>
      )}
    </div>
  );
};
