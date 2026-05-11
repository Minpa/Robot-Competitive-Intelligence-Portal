'use client';

import { useState } from 'react';
import { Hand as HandIcon } from 'lucide-react';

// Manufacturer-specific gradient for visually distinctive fallbacks
const MFG_GRADIENTS: Record<string, { from: string; to: string; accent: string }> = {
  'Shadow Robot Company': { from: 'from-cyan-50', to: 'to-cyan-100', accent: 'text-cyan-600' },
  'Wonik Robotics':       { from: 'from-rose-50', to: 'to-rose-100', accent: 'text-rose-600' },
  'Tesollo':              { from: 'from-orange-50', to: 'to-orange-100', accent: 'text-orange-600' },
  'Inspire Robotics':     { from: 'from-violet-50', to: 'to-violet-100', accent: 'text-violet-600' },
  'Inspire Robotics (因时机器人)': { from: 'from-violet-50', to: 'to-violet-100', accent: 'text-violet-600' },
  'PaXini Tech':          { from: 'from-emerald-50', to: 'to-emerald-100', accent: 'text-emerald-600' },
  'LinkerHand':           { from: 'from-amber-50', to: 'to-amber-100', accent: 'text-amber-600' },
  'Sanctuary AI':         { from: 'from-pink-50', to: 'to-pink-100', accent: 'text-pink-600' },
  'Schunk':               { from: 'from-slate-50', to: 'to-slate-100', accent: 'text-slate-600' },
};

const DEFAULT_GRADIENT = { from: 'from-slate-50', to: 'to-slate-100', accent: 'text-ink-500' };

interface HandImageProps {
  imageUrl?: string | null;
  handName: string;
  manufacturer: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HandImage({ imageUrl, handName, manufacturer, size = 'md', className = '' }: HandImageProps) {
  const [imgError, setImgError] = useState(false);
  const gradient = MFG_GRADIENTS[manufacturer] || DEFAULT_GRADIENT;

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'h-40',
    lg: 'min-h-[300px]',
  };
  const iconSizes = { sm: 'w-8 h-8', md: 'w-14 h-14', lg: 'w-20 h-20' };
  const textSizes = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' };

  const initials = handName
    .replace(/Hand|hand/g, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  if (imageUrl && !imgError) {
    return (
      <div className={`${sizeClasses[size]} overflow-hidden flex items-center justify-center bg-ink-100 ${className}`}>
        <img
          src={imageUrl}
          alt={handName}
          className="w-full h-full object-contain p-3"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br ${gradient.from} ${gradient.to} flex flex-col items-center justify-center gap-2 ${className}`}>
      <HandIcon className={`${iconSizes[size]} ${gradient.accent} opacity-60`} />
      <span className={`${textSizes[size]} font-bold ${gradient.accent} opacity-80 tracking-wider`}>
        {initials}
      </span>
    </div>
  );
}
