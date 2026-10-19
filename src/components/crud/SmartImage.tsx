import React, { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

/**
 * An <img> that always fills its parent and gracefully swaps to a neutral
 * placeholder when a URL breaks. Parents are expected to own the fixed
 * height / aspect ratio so a broken image can never shift the layout.
 */
export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = 'h-full w-full object-cover',
  fallbackClassName = '',
  referrerPolicy = 'no-referrer',
}) => {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#FAF5E5] to-neutral-200 text-[#D09A40] ${fallbackClassName}`}
      >
        <ImageIcon className="h-6 w-6 opacity-70" aria-hidden="true" />
        <span className="px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Image unavailable
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy={referrerPolicy}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
