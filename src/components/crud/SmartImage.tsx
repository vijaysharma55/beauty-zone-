import React, { useEffect, useState } from 'react';

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

const DEFAULT_SALON_IMAGE = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80';

/**
 * An <img> that always fills its parent and gracefully swaps to a professional
 * default salon photo when a URL breaks or is missing.
 */
export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = 'h-full w-full object-cover',
  fallbackClassName = '',
  referrerPolicy = 'no-referrer',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const imageSrc = !failed && src && src.trim() !== '' ? src : DEFAULT_SALON_IMAGE;

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy={referrerPolicy}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
