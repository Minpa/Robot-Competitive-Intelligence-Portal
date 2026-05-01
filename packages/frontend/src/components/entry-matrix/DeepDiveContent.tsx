'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import {
  DEEP_DIVES, TASKS, SECTORS, scoreToColor,
} from './data';

interface Props {
  rank: number; // 0-based index
}

export default function DeepDiveContent({ rank }: Props) {
  const router = useRouter();
  const dive = DEEP_DIVES[rank];

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/business-strategy/matrix');
        return;
      }
      if (e.key === 'ArrowLeft' && rank > 0) {
        router.push(`/business-strategy/matrix/deepdive/${rank - 1}`);
        return;
      }
      if (e.key === 'ArrowRight' && rank < DEEP_DIVES.length - 1) {
        router.push(`/business-strategy/matrix/deepdive/${rank + 1}`);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rank, router]);

  if (!dive) return null;

  const task = TASKS[dive.taskIdx];
  const sector = SECTORS[dive.sectorIdx];

  return (
    <div className="bg-white pb-28" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10 space-y-10">
        {/* Top nav */}
        <div className="flex items-center justify-between">
          <Link
            href="/business-strategy/matrix"
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#D3D1C7] text-[#2C2C2A] hover:border-[#8B1538] hover:text-[#8B1538] text-[12px] font-medium transition-colors"
            style={{ borderRadius: 4 }}
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            매트릭스로
          </Link>
          <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.2em] hidden md:inline">
            ← / → 키보드 네비게이션 / ESC 매트릭스로
          </span>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-9">
            <p
              className="font-mono text-[14px] font-medium text-[#8B1538] uppercase tracking-[0.16em]"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              Top {dive.rank.toString().padStart(2, '0')}
            </p>
            <h1
              className="font-medium text-[36px] md:text-[52px] text-[#2C2C2A] tracking-tight leading-[1.05] mt-2"
            >
              <span className="font-mono text-[#8B1538] mr-2">{task.num}</span>
              {task.name}
              <span className="text-[#B8B6AE] mx-3">×</span>
              {sector}
            </h1>
            <p className="text-[16px] md:text-[20px] text-[#5F5E5A] mt-3 leading-snug">
              {getProcByTaskIdx(dive.taskIdx)}
            </p>
          </div>
          <div className="md:col-span-3">
            <div
              className="flex flex-col items-center justify-center py-6 px-4"
              style={{ backgroundColor: scoreToColor(dive.score), borderRadius: 12 }}
            >
              <span
                className="font-medium text-[64px] md:text-[88px] text-[#2C2C2A] leading-none"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {dive.score.toFixed(1)}
              </span>
              <span className="font-mono text-[11px] text-[#5F5E5A] uppercase tracking-[0.18em] mt-2">
                / 10
              </span>
              <span
                className="font-mono text-[12px] md:text-[14px] font-medium text-[#8B1538] uppercase tracking-[0.18em] mt-3 text-center leading-snug"
              >
                {dive.verdict}
              </span>
            </div>
          </div>
        </header>

        {/* Headline + story / deployed + lineup */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-5">
            <div
              className="bg-[#8B1538] text-white px-6 py-7"
              style={{ borderRadius: 12 }}
            >
              <p className="font-mono text-[10.5px] text-white/70 uppercase tracking-[0.2em] mb-3">
                핵심 메시지
              </p>
              <p className="font-medium text-[18px] md:text-[22px] leading-[1.5] tracking-tight">
                {dive.headline}
              </p>
            </div>
            <div
              className="bg-[#FAEAE7]/40 border border-[#FAEAE7] px-6 py-6"
              style={{ borderRadius: 12 }}
            >
              <p className="font-mono text-[10.5px] text-[#8B1538] uppercase tracking-[0.2em] mb-3 font-medium">
                진입 시나리오
              </p>
              <p className="text-[15px] md:text-[16px] text-[#2C2C2A] leading-[1.6]">
                {dive.story}
              </p>
            </div>
          </div>

          <div className="md:col-span-5 space-y-5">
            <div className="border border-[#E8E6DD] bg-white p-5" style={{ borderRadius: 12 }}>
              <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.2em] mb-3">
                실배치 사례
              </p>
              <ul className="space-y-2.5">
                {dive.deployed.map((d, i) => (
                  <li key={i} className="flex items-baseline gap-3 pb-2.5 border-b border-[#E8E6DD] last:border-0 last:pb-0">
                    <span className="w-1 h-1 rounded-full bg-[#8B1538] mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[14px] text-[#2C2C2A]">{d.name}</p>
                      {d.tag && (
                        <p className="font-mono text-[10.5px] text-[#5F5E5A] mt-0.5 tracking-wide">
                          {d.tag}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-[#E8E6DD] bg-white p-5" style={{ borderRadius: 12 }}>
              <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.2em] mb-3">
                LG 적합 라인업
              </p>
              <ul className="space-y-2.5">
                {dive.lineup.map((d, i) => (
                  <li key={i} className="flex items-baseline gap-3 pb-2.5 border-b border-[#E8E6DD] last:border-0 last:pb-0">
                    <span className="w-1 h-1 rounded-full bg-[#0C447C] mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[14px] text-[#2C2C2A]">{d.name}</p>
                      {d.tag && (
                        <p className="font-mono text-[10.5px] text-[#5F5E5A] mt-0.5 tracking-wide">
                          {d.tag}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Market */}
        <section
          className="bg-[#FAFAF8] border border-[#E8E6DD] grid grid-cols-1 md:grid-cols-3"
          style={{ borderRadius: 12 }}
        >
          <MarketCell label="글로벌 시장" value={dive.market.global} note={dive.market.globalNote} />
          <MarketCell label="한국 시장"   value={dive.market.korea}  note={dive.market.koreaNote}  divider />
          <MarketCell label="성장률"      value={dive.market.growth} note={dive.market.growthNote} divider />
        </section>

        {/* Risks */}
        <section
          className="border-l-[3px] border-[#8B1538] bg-[#FAEAE7]/30 px-6 py-6"
          style={{ borderRadius: 8 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} strokeWidth={2} className="text-[#8B1538]" />
            <p className="font-mono text-[11px] font-medium text-[#8B1538] uppercase tracking-[0.2em]">
              리스크 · 진입 장벽
            </p>
          </div>
          <ul className="space-y-3">
            {dive.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-[14px] md:text-[15px] text-[#2C2C2A] leading-[1.55]">
                <span className="font-mono text-[#8B1538] mt-0.5">⚠</span>
                <span className="flex-1">{r}</span>
              </li>
            ))}
          </ul>
          <p
            className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.18em] mt-5 pt-4 border-t border-[#FAEAE7]"
          >
            ⚠ 시장 규모 수치는 예시 데이터. 실제 보고 전 시장조사 보고서로 교체
          </p>
        </section>
      </div>
    </div>
  );
}

function MarketCell({ label, value, note, divider }: { label: string; value: string; note: string; divider?: boolean }) {
  return (
    <div
      className={`p-6 md:p-8 ${divider ? 'md:border-l border-t md:border-t-0 border-[#E8E6DD]' : ''}`}
    >
      <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.2em]">{label}</p>
      <p
        className="font-medium text-[44px] md:text-[56px] text-[#2C2C2A] leading-none mt-3"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
      <p className="font-mono text-[11px] text-[#5F5E5A] uppercase tracking-[0.16em] mt-3">
        {note}
      </p>
    </div>
  );
}

function getProcByTaskIdx(taskIdx: number): string {
  const m: Record<number, string> = {
    0:  '정형 부품 → 비정형 SKU → 협소 공간',
    1:  'Mixed-SKU 분류 → 다 SKU → 동선 변동',
    2:  '단일 머신 → 다중 라인 → 라인 변경',
    3:  '평면 검사 → 3D 검사 → 미세 결함',
    4:  '동일 위치 → 다종 위치 → 협소 공간',
    5:  '표준 커넥터 → 다 모델 → Pack 다종',
    6:  '직선 → 굴곡 → 협소 진입',
    7:  'AMR Tote 정형 → 계단·다층 → 협소 랙',
    8:  '단일 단 → 다단 → 적재 패턴 변경',
    9:  '테이프 → 다 SKU 박스 → 비표준 포장',
    10: '개방 위치 → 다 위치 → 협소 블록',
    11: '평면 측정 → 3D 점검 → 시설 진단',
  };
  return m[taskIdx] || '';
}
