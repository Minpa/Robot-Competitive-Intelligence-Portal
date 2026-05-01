'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ROBOT_INFO } from './data';

interface Props {
  code: string;
  onClose: () => void;
}

export default function RobotInfoModal({ code, onClose }: Props) {
  const info = ROBOT_INFO[code];
  const [imgFailed, setImgFailed] = useState(false);

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
        className="relative bg-white w-full max-w-[720px] max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: 12,
          animation: 'em-slide-up 280ms ease-out',
          border: info.isLgLineup ? '2px solid #8B1538' : '1px solid #E8E6DD',
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
          <div className="flex items-center gap-2 mb-2">
            <span
              className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] px-2 py-0.5"
              style={{
                backgroundColor: info.isLgLineup ? '#FAEAE7' : '#E6F1FB',
                color: info.isLgLineup ? '#8B1538' : '#0C447C',
              }}
            >
              {info.code}
            </span>
            {info.isLgLineup && (
              <span className="font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] text-[#8B1538]">
                ⭐ LG 자사 라인업
              </span>
            )}
          </div>
          <h3 className="font-medium text-[24px] text-[#2C2C2A] tracking-tight leading-tight">
            {info.nameKr}
          </h3>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.18em] mt-1.5">
            {info.nameEn}
          </p>
          <p className="text-[14px] text-[#5F5E5A] mt-3 leading-snug">
            {info.tagline}
          </p>
        </div>

        {/* Image area */}
        <div className="px-7 pt-5">
          <div
            className="relative w-full bg-[#FAFAF8] border border-[#E8E6DD] flex items-center justify-center overflow-hidden"
            style={{ borderRadius: 8, aspectRatio: '16 / 9' }}
          >
            {info.imagePath && !imgFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={info.imagePath}
                alt={info.nameKr}
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <RobotIllustration code={info.code} />
            )}
          </div>
          <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.18em] mt-2 text-center">
            {info.imagePath && !imgFailed
              ? '실제 제품 이미지'
              : '이미지 추가 예정 — public/images/robots/' + info.code.toLowerCase() + '.jpg'}
          </p>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-5">
          <Section title="개요">
            <p className="text-[13.5px] text-[#2C2C2A] leading-[1.65]">
              {info.description}
            </p>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SpecCard label="페이로드" value={info.payload} />
            <SpecCard label="작업 범위" value={info.reach} />
            <SpecCard label="단가" value={info.pricing} accent />
          </div>

          <Section title="대표 작업">
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
          </Section>

          <Section title="대표 제품 / 회사">
            <ul className="space-y-1.5">
              {info.examples.map((e, i) => {
                const isLgItem = e.includes('LG') || e.includes('베어로보틱스') || e.includes('CLOiD');
                return (
                  <li key={i} className="flex items-center gap-2.5 text-[13px] text-[#2C2C2A]">
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: isLgItem ? '#8B1538' : '#5F5E5A' }}
                    />
                    <span className={isLgItem ? 'text-[#8B1538] font-medium' : ''}>{e}</span>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <div className="border-t border-[#E8E6DD] px-7 py-4 bg-[#FAFAF8] flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.18em]">
            {info.isLgLineup ? 'LG 자사 라인업' : '시장 표준 카테고리'}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.2em] mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function SpecCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`p-3 border ${accent ? 'border-[#FAEAE7] bg-[#FAEAE7]/40' : 'border-[#E8E6DD] bg-white'}`}
      style={{ borderRadius: 6 }}
    >
      <p className="font-mono text-[9px] text-[#888780] uppercase tracking-[0.18em]">{label}</p>
      <p
        className={`font-medium text-[13.5px] mt-1 leading-snug ${accent ? 'text-[#8B1538]' : 'text-[#2C2C2A]'}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
    </div>
  );
}

// SVG illustration fallback (no real photo provided)
function RobotIllustration({ code }: { code: string }) {
  const ILLUSTRATIONS: Record<string, JSX.Element> = {
    IR: (
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
        <rect x="60" y="100" width="40" height="12" fill="#5F5E5A" />
        <rect x="68" y="60" width="24" height="40" fill="#888780" />
        <rect x="72" y="20" width="16" height="40" fill="#888780" />
        <circle cx="80" cy="20" r="8" fill="#8B1538" />
        <rect x="76" y="14" width="20" height="4" fill="#8B1538" />
      </svg>
    ),
    CR: (
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
        <rect x="65" y="100" width="30" height="12" fill="#5F5E5A" />
        <circle cx="80" cy="92" r="8" fill="#888780" />
        <rect x="76" y="60" width="8" height="32" fill="#B8B6AE" />
        <circle cx="80" cy="60" r="6" fill="#888780" />
        <rect x="78" y="32" width="4" height="28" fill="#B8B6AE" />
        <circle cx="80" cy="32" r="5" fill="#888780" />
        <rect x="78" y="20" width="14" height="12" rx="2" fill="#0C447C" />
      </svg>
    ),
    MoMa: (
      <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
        <rect x="40" y="80" width="100" height="28" rx="3" fill="#5F5E5A" />
        <circle cx="55" cy="108" r="6" fill="#2C2C2A" />
        <circle cx="125" cy="108" r="6" fill="#2C2C2A" />
        <rect x="85" y="50" width="6" height="30" fill="#888780" />
        <rect x="83" y="30" width="20" height="20" fill="#888780" />
        <circle cx="103" cy="40" r="6" fill="#8B1538" />
      </svg>
    ),
    Hum: (
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
        <circle cx="80" cy="22" r="10" fill="#888780" />
        <rect x="72" y="32" width="16" height="34" rx="3" fill="#888780" />
        <rect x="58" y="34" width="14" height="4" rx="2" fill="#B8B6AE" />
        <rect x="88" y="34" width="14" height="4" rx="2" fill="#B8B6AE" />
        <rect x="72" y="66" width="6" height="30" fill="#B8B6AE" />
        <rect x="82" y="66" width="6" height="30" fill="#B8B6AE" />
        <rect x="68" y="96" width="14" height="6" fill="#5F5E5A" />
        <rect x="78" y="96" width="14" height="6" fill="#5F5E5A" />
      </svg>
    ),
    AMR: (
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
        <rect x="30" y="60" width="100" height="40" rx="6" fill="#5F5E5A" />
        <rect x="50" y="70" width="60" height="20" rx="3" fill="#888780" />
        <circle cx="50" cy="100" r="8" fill="#2C2C2A" />
        <circle cx="110" cy="100" r="8" fill="#2C2C2A" />
        <rect x="35" y="65" width="6" height="3" fill="#8B1538" />
        <rect x="119" y="65" width="6" height="3" fill="#8B1538" />
      </svg>
    ),
    CLOiD: (
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
        <circle cx="80" cy="22" r="11" fill="#FAEAE7" stroke="#8B1538" strokeWidth="1.5" />
        <circle cx="76" cy="20" r="1.5" fill="#8B1538" />
        <circle cx="84" cy="20" r="1.5" fill="#8B1538" />
        <rect x="71" y="33" width="18" height="34" rx="3" fill="#8B1538" />
        <rect x="56" y="36" width="15" height="4" rx="2" fill="#FAEAE7" stroke="#8B1538" strokeWidth="1" />
        <rect x="89" y="36" width="15" height="4" rx="2" fill="#FAEAE7" stroke="#8B1538" strokeWidth="1" />
        <rect x="72" y="67" width="7" height="30" fill="#FAEAE7" stroke="#8B1538" strokeWidth="1" />
        <rect x="81" y="67" width="7" height="30" fill="#FAEAE7" stroke="#8B1538" strokeWidth="1" />
        <rect x="68" y="97" width="14" height="6" fill="#8B1538" />
        <rect x="78" y="97" width="14" height="6" fill="#8B1538" />
      </svg>
    ),
  };
  return ILLUSTRATIONS[code] || (
    <span className="font-mono text-[14px] text-[#B8B6AE]">{code}</span>
  );
}
