import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Link2, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { Button, Input } from '../ui';

export const ImageUploader: React.FC<{
  label: string;
  value: string;
  kind: 'logo' | 'cover' | 'gallery' | 'staff';
  onChange: (url: string) => void;
  hint?: string;
  previewClassName?: string;
}> = ({ label, value, kind, onChange, hint, previewClassName = 'h-24 w-24 rounded-xl' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const result = await api.upload(file, kind);
      onChange(result.url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 ${previewClassName}`}
        >
          {value ? (
            <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-slate-300" />
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {value ? 'Replace' : 'Upload image'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowUrl((v) => !v)}>
            <Link2 className="h-3.5 w-3.5" /> Use URL
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
      </div>
      {showUrl && (
        <div className="mt-2 flex gap-2">
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/image.jpg"
            aria-label={`${label} image URL`}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              onChange(urlDraft.trim());
              setShowUrl(false);
              setUrlDraft('');
            }}
          >
            Apply
          </Button>
        </div>
      )}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
};
