'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { GRIPPER_INFO } from './data';

interface Props {
  code: string;
  onClose: () => void;
}

export default function GripperInfoModal({ code, onClose }: Props) {
  const info = GRIPPER_INFO[code];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!info) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      style={{ animation: 'em-fade-in 200ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-[480px] max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: 12,
          animation: 'em-slide-up 280ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#888780] hover:bg-[#EAF3DE] hover:text-[#3B6D11] transition-colors z-10"
          aria-label="닫기"
        >
          <X size={18} strokeWidth={1.75} />
        </button>

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-[#E8E6DD]">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] px-2 py-0.5"
              style={{ backgroundColor: '#EAF3DE', color: '#3B6D11' }}
            >
              {info.code}
            </span>
          </div>
          <h3 className="font-medium text-[22px] text-[#2C2C2A] tracking-tight leading-tight">
            {info.nameKr}
          </h3>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.18em] mt-1.5">
            {info.nameEn}
          </p>
          <p className="text-[14px] text-[#5F5E5A] mt-3 leading-snug">
            {info.tagline}
          </p>
        </div>

        {/* Illustration */}
        <div className="px-7 pt-5">
          <div
            className="relative w-full bg-[#FAFAF8] border border-[#E8E6DD] flex items-center justify-center overflow-hidden"
            style={{ borderRadius: 8, aspectRatio: '16 / 9' }}
          >
            <GripperIllustration code={info.code} />
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">
          <div>
            <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.2em] mb-2">
              개요
            </p>
            <p className="text-[13.5px] text-[#2C2C2A] leading-[1.65]">
              {info.description}
            </p>
          </div>

          <div>
            <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.2em] mb-2">
              대표 작업
            </p>
            <div className="flex flex-wrap gap-1.5">
              {info.useCases.map((u) => (
                <span
                  key={u}
                  className="inline-flex items-center px-2.5 py-1 border border-[#E8E6DD] bg-white text-[12px] text-[#2C2C2A]"
                >
                  {u}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.2em] mb-2">
              대표 제품
            </p>
            <ul className="space-y-1.5">
              {info.examples.map((e, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[13px] text-[#2C2C2A]">
                  <span className="w-1 h-1 rounded-full bg-[#3B6D11]" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#E8E6DD] px-7 py-4 bg-[#FAFAF8] flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.18em]">
            그리퍼 상세
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-[#D3D1C7] text-[#2C2C2A] font-medium text-[12.5px] hover:bg-[#F1EFE8] transition-colors"
            style={{ borderRadius: 4 }}
          >
            닫기
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes em-fade-in {
          from { background-color: rgba(0,0,0,0); }
          to   { background-color: rgba(0,0,0,0.4); }
        }
        @keyframes em-slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function GripperIllustration({ code }: { code: string }) {
  const ILLUSTRATIONS: Record<string, JSX.Element> = {
    Vac: (
      <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
        {/* Arm shaft */}
        <rect x="82" y="10" width="16" height="40" rx="2" fill="#888780" />
        {/* Adapter plate */}
        <rect x="65" y="50" width="50" height="8" rx="2" fill="#5F5E5A" />
        {/* Suction cups */}
        <path d="M72 58 L72 75 Q72 82 78 82 L78 75" stroke="#3B6D11" strokeWidth="2.5" fill="none" />
        <ellipse cx="75" cy="82" rx="6" ry="3" fill="#3B6D11" opacity="0.6" />
        <path d="M98 58 L98 75 Q98 82 104 82 L104 75" stroke="#3B6D11" strokeWidth="2.5" fill="none" />
        <ellipse cx="101" cy="82" rx="6" ry="3" fill="#3B6D11" opacity="0.6" />
        {/* Vacuum lines */}
        <line x1="75" y1="58" x2="75" y2="50" stroke="#B8B6AE" strokeWidth="1" strokeDasharray="2 2" />
        <line x1="101" y1="58" x2="101" y2="50" stroke="#B8B6AE" strokeWidth="1" strokeDasharray="2 2" />
        {/* Object being gripped */}
        <rect x="60" y="86" width="60" height="20" rx="2" fill="#EAF3DE" stroke="#3B6D11" strokeWidth="1" />
      </svg>
    ),
    Jaw: (
      <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
        {/* Arm shaft */}
        <rect x="82" y="10" width="16" height="30" rx="2" fill="#888780" />
        {/* Body */}
        <rect x="65" y="40" width="50" height="16" rx="3" fill="#5F5E5A" />
        {/* Left finger */}
        <rect x="68" y="56" width="10" height="36" rx="1" fill="#3B6D11" />
        <rect x="68" y="86" width="14" height="8" rx="1" fill="#3B6D11" opacity="0.8" />
        {/* Right finger */}
        <rect x="102" y="56" width="10" height="36" rx="1" fill="#3B6D11" />
        <rect x="98" y="86" width="14" height="8" rx="1" fill="#3B6D11" opacity="0.8" />
        {/* Arrows showing motion */}
        <path d="M84 68 L78 68" stroke="#B8B6AE" strokeWidth="1.5" markerEnd="url(#arrowL)" />
        <path d="M96 68 L102 68" stroke="#B8B6AE" strokeWidth="1.5" />
        {/* Object being gripped */}
        <rect x="82" y="62" width="16" height="28" rx="2" fill="#EAF3DE" stroke="#3B6D11" strokeWidth="1" />
      </svg>
    ),
    Multi: (
      <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
        {/* Arm shaft */}
        <rect x="82" y="6" width="16" height="24" rx="2" fill="#888780" />
        {/* Palm */}
        <circle cx="90" cy="42" r="14" fill="#5F5E5A" />
        {/* Finger 1 - left */}
        <rect x="62" y="48" width="7" height="28" rx="2" fill="#3B6D11" transform="rotate(-15 65 48)" />
        <rect x="58" y="72" width="7" height="14" rx="2" fill="#3B6D11" opacity="0.8" transform="rotate(-15 61 72)" />
        {/* Finger 2 - center-left */}
        <rect x="76" y="54" width="7" height="28" rx="2" fill="#3B6D11" />
        <rect x="76" y="78" width="7" height="14" rx="2" fill="#3B6D11" opacity="0.8" />
        {/* Finger 3 - center-right */}
        <rect x="97" y="54" width="7" height="28" rx="2" fill="#3B6D11" />
        <rect x="97" y="78" width="7" height="14" rx="2" fill="#3B6D11" opacity="0.8" />
        {/* Finger 4 - right */}
        <rect x="111" y="48" width="7" height="28" rx="2" fill="#3B6D11" transform="rotate(15 114 48)" />
        <rect x="115" y="72" width="7" height="14" rx="2" fill="#3B6D11" opacity="0.8" transform="rotate(15 118 72)" />
        {/* Object */}
        <circle cx="90" cy="80" r="10" fill="#EAF3DE" stroke="#3B6D11" strokeWidth="1" />
      </svg>
    ),
    Soft: (
      <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
        {/* Arm shaft */}
        <rect x="82" y="10" width="16" height="28" rx="2" fill="#888780" />
        {/* Base plate */}
        <rect x="68" y="38" width="44" height="10" rx="3" fill="#5F5E5A" />
        {/* Soft fingers - curved, organic shapes */}
        <path d="M72 48 Q68 62 72 78 Q74 86 80 88" stroke="#3B6D11" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M84 48 Q82 64 84 80 Q85 86 88 88" stroke="#3B6D11" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M96 48 Q98 64 96 80 Q95 86 92 88" stroke="#3B6D11" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M108 48 Q112 62 108 78 Q106 86 100 88" stroke="#3B6D11" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* Object - rounded / organic */}
        <ellipse cx="90" cy="92" rx="14" ry="10" fill="#EAF3DE" stroke="#3B6D11" strokeWidth="1" />
      </svg>
    ),
    Mag: (
      <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
        {/* Arm shaft */}
        <rect x="82" y="10" width="16" height="30" rx="2" fill="#888780" />
        {/* Electromagnet body */}
        <rect x="62" y="40" width="56" height="22" rx="4" fill="#5F5E5A" />
        {/* Coil lines */}
        <rect x="68" y="44" width="44" height="14" rx="2" fill="none" stroke="#3B6D11" strokeWidth="1.5" />
        <line x1="76" y1="44" x2="76" y2="58" stroke="#3B6D11" strokeWidth="1" />
        <line x1="84" y1="44" x2="84" y2="58" stroke="#3B6D11" strokeWidth="1" />
        <line x1="92" y1="44" x2="92" y2="58" stroke="#3B6D11" strokeWidth="1" />
        <line x1="100" y1="44" x2="100" y2="58" stroke="#3B6D11" strokeWidth="1" />
        {/* Magnetic field lines */}
        <path d="M72 62 Q72 70 80 70" stroke="#3B6D11" strokeWidth="1" fill="none" strokeDasharray="2 2" opacity="0.5" />
        <path d="M90 62 Q90 74 90 74" stroke="#3B6D11" strokeWidth="1" fill="none" strokeDasharray="2 2" opacity="0.5" />
        <path d="M108 62 Q108 70 100 70" stroke="#3B6D11" strokeWidth="1" fill="none" strokeDasharray="2 2" opacity="0.5" />
        {/* Metal plate being attracted */}
        <rect x="60" y="76" width="60" height="12" rx="1" fill="#EAF3DE" stroke="#3B6D11" strokeWidth="1" />
        <text x="90" y="85" textAnchor="middle" fontSize="7" fill="#3B6D11" fontFamily="monospace">STEEL</text>
      </svg>
    ),
  };

  return ILLUSTRATIONS[code] || (
    <span className="font-mono text-[14px] text-[#B8B6AE]">{code}</span>
  );
}
