'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { CASE_INFO, type CaseStatus } from './data';

interface Props {
  tag: string;
  onClose: () => void;
}

const STATUS_COLORS: Record<CaseStatus, { bg: string; fg: string; dot: string }> = {
  D: { bg: '#E6F9E8', fg: '#1A7A2E', dot: '#22C55E' },
  A: { bg: '#FFF7E6', fg: '#92600A', dot: '#F59E0B' },
  P: { bg: '#E6F1FB', fg: '#0C447C', dot: '#3B82F6' },
  X: { bg: '#F0EEE8', fg: '#888780', dot: '#9CA3AF' },
};

export default function CaseInfoModal({ tag, onClose }: Props) {
  const info = CASE_INFO[tag];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!info) return null;

  const sc = STATUS_COLORS[info.status];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      style={{ animation: 'em-fade-in 200ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-[640px] max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: 12,
          animation: 'em-slide-up 280ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#888780] hover:bg-[#FAEAE7] hover:text-[#8B1538] transition-colors z-10"
          aria-label="닫기"
        >
          <X size={18} strokeWidth={1.75} />
        </button>

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-[#E8E6DD]">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] px-2 py-0.5"
              style={{ backgroundColor: '#FAEAE7', color: '#8B1538' }}
            >
              {info.tag}
            </span>
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] px-2 py-0.5"
              style={{ backgroundColor: sc.bg, color: sc.fg }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: sc.dot }}
              />
              {info.statusLabel}
            </span>
          </div>
          <h3 className="font-medium text-[22px] text-[#2C2C2A] tracking-tight leading-tight">
            {info.description}
          </h3>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.18em] mt-2">
            {info.company} · {info.robot}
          </p>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">
          {/* Key fields */}
          <div className="grid grid-cols-2 gap-3">
            <FieldCard label="산업" value={info.sector} />
            <FieldCard label="작업" value={info.task} />
            <FieldCard label="기업" value={info.company} />
            <FieldCard label="로봇" value={info.robot} />
          </div>

          {/* Detail */}
          <div>
            <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.2em] mb-2">
              상세 내용
            </p>
            <p className="text-[13.5px] text-[#2C2C2A] leading-[1.7]">
              {info.detail}
            </p>
          </div>

          {/* Source */}
          {info.source && (
            <div>
              <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.2em] mb-2">
                출처
              </p>
              <p className="text-[12.5px] text-[#5F5E5A] italic">
                {info.source}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E8E6DD] px-7 py-4 bg-[#FAFAF8] flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.18em]">
            사례 상세 · {info.statusLabel}
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

function FieldCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 border border-[#E8E6DD] bg-white"
      style={{ borderRadius: 6 }}
    >
      <p className="font-mono text-[9px] text-[#888780] uppercase tracking-[0.18em]">{label}</p>
      <p className="font-medium text-[13px] text-[#2C2C2A] mt-1 leading-snug">{value}</p>
    </div>
  );
}
