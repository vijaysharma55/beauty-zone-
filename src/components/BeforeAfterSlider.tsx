import React, { useState, useRef, useCallback } from 'react';
import { SlidersHorizontal, Sparkles } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  aspectRatio?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After (Beauty Zone)',
  aspectRatio = 'aspect-[4/3]',
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 to 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const percentage = (clampedX / rect.width) * 100;
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className={`relative select-none overflow-hidden rounded-2xl bg-neutral-900 group cursor-ew-resize ${aspectRatio} ${className}`}
    >
      {/* Background Layer: AFTER Image (Revealed on Right) */}
      <img
        src={afterImage}
        alt={afterLabel}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Foreground Layer: BEFORE Image (Clipped by slider position on Left) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
        />
        {/* Scrim Overlay on Before Image */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      </div>

      {/* Floating Labels */}
      <div className="absolute top-3 left-3 pointer-events-none z-10">
        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-black/70 text-white/90 backdrop-blur-xs shadow-sm border border-white/10">
          {beforeLabel}
        </span>
      </div>

      <div className="absolute top-3 right-3 pointer-events-none z-10">
        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-[#D09A40] text-[#0F172A] backdrop-blur-xs shadow-md border border-white/20 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#0F172A]" />
          <span>{afterLabel}</span>
        </span>
      </div>

      {/* Slider Divider Line */}
      <div
        className="absolute top-0 bottom-0 z-20 pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute inset-y-0 -left-[1.5px] w-[3px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
        
        {/* Center Drag Handle */}
        <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-[#D09A40] pointer-events-auto cursor-ew-resize transform transition-transform group-hover:scale-110">
          <SlidersHorizontal className="w-4 h-4 text-[#0F172A] rotate-90" />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-2.5 inset-x-0 text-center pointer-events-none z-10 opacity-70 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-medium text-white bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-full">
          Drag slider or tap to compare transformation
        </span>
      </div>
    </div>
  );
};
