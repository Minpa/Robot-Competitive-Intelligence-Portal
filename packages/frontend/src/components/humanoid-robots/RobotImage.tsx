'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';

// Company-specific gradient colors for visually distinctive fallbacks
const COMPANY_GRADIENTS: Record<string, { from: string; to: string; accent: string }> = {
  'Tesla':              { from: 'from-red-50',    to: 'to-red-100',    accent: 'text-red-500' },
  'Boston Dynamics':    { from: 'from-yellow-50', to: 'to-yellow-100', accent: 'text-yellow-600' },
  'Agility Robotics':  { from: 'from-teal-50',   to: 'to-teal-100',   accent: 'text-teal-600' },
  'Figure AI':         { from: 'from-blue-50',    to: 'to-blue-100',   accent: 'text-blue-600' },
  '1X Technologies':   { from: 'from-violet-50',  to: 'to-violet-100', accent: 'text-violet-600' },
  'Unitree Robotics':  { from: 'from-emerald-50', to: 'to-emerald-100',accent: 'text-emerald-600' },
  'UBTECH':            { from: 'from-sky-50',     to: 'to-sky-100',    accent: 'text-sky-600' },
  'Xiaomi':            { from: 'from-orange-50',  to: 'to-orange-100', accent: 'text-orange-600' },
  'Fourier Intelligence':{ from: 'from-cyan-50',  to: 'to-cyan-100',   accent: 'text-cyan-600' },
  'Sanctuary AI':      { from: 'from-purple-50',  to: 'to-purple-100', accent: 'text-purple-600' },
  'Toyota':            { from: 'from-rose-50',    to: 'to-rose-100',   accent: 'text-rose-500' },
  'Honda':             { from: 'from-red-50',     to: 'to-slate-100',  accent: 'text-red-500' },
  'SoftBank Robotics': { from: 'from-pink-50',    to: 'to-pink-100',   accent: 'text-pink-500' },
  'Aeolus Robotics':   { from: 'from-indigo-50',  to: 'to-indigo-100', accent: 'text-indigo-600' },
  'Diligent Robotics':{ from: 'from-lime-50',    to: 'to-lime-100',   accent: 'text-lime-600' },
  'PAL Robotics':      { from: 'from-amber-50',   to: 'to-amber-100',  accent: 'text-amber-600' },
  'Savioke':           { from: 'from-fuchsia-50', to: 'to-fuchsia-100',accent: 'text-fuchsia-500' },
  'Rainbow Robotics':  { from: 'from-blue-50',    to: 'to-purple-100', accent: 'text-blue-500' },
  'Agibot':            { from: 'from-green-50',   to: 'to-green-100',  accent: 'text-green-600' },
  'Apptronik':         { from: 'from-slate-50',   to: 'to-blue-100',   accent: 'text-blue-500' },
};

const DEFAULT_GRADIENT = { from: 'from-slate-50', to: 'to-slate-100', accent: 'text-ink-500' };

function getCompanyGradient(companyName: string) {
  return COMPANY_GRADIENTS[companyName] || DEFAULT_GRADIENT;
}

interface RobotImageProps {
  imageUrl?: string | null;
  robotName: string;
  companyName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RobotImage({ imageUrl, robotName, companyName, size = 'md', className = '' }: RobotImageProps) {
  const [imgError, setImgError] = useState(false);
  const gradient = getCompanyGradient(companyName);

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'h-40',
    lg: 'min-h-[300px]',
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const initials = robotName
    .split(/[\s-]+/)
    .map(w => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  if (imageUrl && !imgError) {
    return (
      <div className={`${sizeClasses[size]} overflow-hidden flex items-center justify-center bg-ink-100 ${className}`}>
        <img
          src={imageUrl}
          alt={robotName}
          className="w-full h-full object-contain p-3"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br ${gradient.from} ${gradient.to} flex flex-col items-center justify-center gap-2 ${className}`}>
      <Bot className={`${iconSizes[size]} ${gradient.accent} opacity-60`} />
      <span className={`${textSizes[size]} font-bold ${gradient.accent} opacity-80 tracking-wider`}>
        {initials}
      </span>
    </div>
  );
}
