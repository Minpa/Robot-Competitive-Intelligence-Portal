'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';

// Company-specific gradient colors for visually distinctive fallbacks
const COMPANY_GRADIENTS: Record<string, { from: string; to: string; accent: string }> = {
  'Tesla':              { from: 'from-red-900/60',    to: 'to-red-950/80',    accent: 'text-red-400' },
  'Boston Dynamics':    { from: 'from-yellow-900/60', to: 'to-yellow-950/80', accent: 'text-yellow-400' },
  'Agility Robotics':  { from: 'from-teal-900/60',   to: 'to-teal-950/80',   accent: 'text-teal-400' },
  'Figure AI':         { from: 'from-blue-900/60',    to: 'to-blue-950/80',   accent: 'text-blue-400' },
  '1X Technologies':   { from: 'from-violet-900/60',  to: 'to-violet-950/80', accent: 'text-violet-400' },
  'Unitree Robotics':  { from: 'from-emerald-900/60', to: 'to-emerald-950/80',accent: 'text-emerald-400' },
  'UBTECH':            { from: 'from-sky-900/60',     to: 'to-sky-950/80',    accent: 'text-sky-400' },
  'Xiaomi':            { from: 'from-orange-900/60',  to: 'to-orange-950/80', accent: 'text-orange-400' },
  'Fourier Intelligence':{ from: 'from-cyan-900/60',  to: 'to-cyan-950/80',   accent: 'text-cyan-400' },
  'Sanctuary AI':      { from: 'from-purple-900/60',  to: 'to-purple-950/80', accent: 'text-purple-400' },
  'Toyota':            { from: 'from-rose-900/60',    to: 'to-rose-950/80',   accent: 'text-rose-400' },
  'Honda':             { from: 'from-red-900/60',     to: 'to-slate-950/80',  accent: 'text-red-300' },
  'SoftBank Robotics': { from: 'from-pink-900/60',    to: 'to-pink-950/80',   accent: 'text-pink-400' },
  'Aeolus Robotics':   { from: 'from-indigo-900/60',  to: 'to-indigo-950/80', accent: 'text-indigo-400' },
  'Diligent Robotics':{ from: 'from-lime-900/60',    to: 'to-lime-950/80',   accent: 'text-lime-400' },
  'PAL Robotics':      { from: 'from-amber-900/60',   to: 'to-amber-950/80',  accent: 'text-amber-400' },
  'Savioke':           { from: 'from-fuchsia-900/60', to: 'to-fuchsia-950/80',accent: 'text-fuchsia-400' },
  'Rainbow Robotics':  { from: 'from-blue-900/60',    to: 'to-purple-950/80', accent: 'text-blue-300' },
  'Agibot':            { from: 'from-green-900/60',   to: 'to-green-950/80',  accent: 'text-green-400' },
  'Apptronik':         { from: 'from-slate-800/60',   to: 'to-blue-950/80',   accent: 'text-blue-300' },
};

const DEFAULT_GRADIENT = { from: 'from-slate-800/60', to: 'to-slate-900/80', accent: 'text-slate-400' };

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
      <div className={`${sizeClasses[size]} overflow-hidden flex items-center justify-center bg-slate-800/80 ${className}`}>
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
