import React from 'react';
import { Crown, Flower2, Gem, Heart, Scissors, Sparkles, Star } from 'lucide-react';
import type { BrandLogoIcon } from '../types';

export const BrandEmblemIcon: React.FC<{
  icon: BrandLogoIcon;
  className?: string;
}> = ({ icon, className = 'w-5 h-5' }) => {
  switch (icon) {
    case 'crown':
      return <Crown className={className} />;
    case 'gem':
      return <Gem className={className} />;
    case 'scissors':
      return <Scissors className={className} />;
    case 'flower':
      return <Flower2 className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'sparkles':
    default:
      return <Sparkles className={className} />;
  }
};
