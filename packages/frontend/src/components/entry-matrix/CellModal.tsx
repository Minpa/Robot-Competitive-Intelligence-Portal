'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import {
  TASKS, SECTORS, SCORES, LV_DETAILS_BY_KEY,
  scoreToColor, scoreToVerdict, isTop5Cell, getTop5Rank,
  type LvDetail,
} from './data';

interface Props {
  taskIdx: number;
  sectorIdx: number;
  onClose: () => void;
}

export default function CellModal({ taskIdx, sectorIdx, onClose }: Props) {
  const router = useRouter();
  const score = SCORES[taskIdx][sectorIdx];
  const task = TASKS[taskIdx];
  const sector = SECTORS[sectorIdx];
  const isTop = isTop5Cell(taskIdx, sectorIdx);
  const rank = getTop5Rank(taskIdx, sectorIdx);
  const lvDetails = LV_DETAILS_BY_KEY[`${taskIdx}-${sectorIdx}`];
  const proc = task && getProc(taskIdx);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleDeepDive = () => {
    if (!rank) return;
    onClose();
    router.push(`/business-strategy/matrix/deepdive/${rank - 1}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      style={{ animation: 'em-fade-in 200ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-[1100px] max-h-[90vh] overflow-y-auto"
        style={{
          borderRadius: 12,
          animation: 'em-slide-up 280ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-stretch border-b border-[#E8E6DD]">
          <div
            className="flex flex-col items-center justify-center px-5 py-4 shrink-0"
            style={{
              width: 100,
              backgroundColor: scoreToColor(score),
            }}
          >
            <span
              className="font-medium text-[36px] text-[#2C2C2A] leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {score.toFixed(1)}
            </span>
            <span className="font-mono text-[10px] text-[#5F5E5A] uppercase tracking-[0.18em] mt-1.5">
              / 10
            </span>
          </div>
          <div className="flex-1 px-6 py-5 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              {isTop && (
                <span
                  className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#8B1538]"
                >
                  ⭐ TOP {rank}
                </span>
              )}
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#5F5E5A]">
                · {scoreToVerdict(score)}
              </span>
            </div>
            <h2 className="font-medium text-[24px] text-[#2C2C2A] tracking-tight leading-tight">
              <span className="font-mono text-[#8B1538] mr-1.5">{task.num}</span>
              {task.name}
              <span className="text-[#B8B6AE] mx-2">×</span>
              {sector}
            </h2>
            <p className="text-[13.5px] text-[#5F5E5A] mt-1.5 leading-snug">
              {proc}
            </p>
          </div>
          <button
            onClick={onClose}
            className="self-start m-3 w-8 h-8 flex items-center justify-center text-[#888780] hover:bg-[#FAEAE7] hover:text-[#8B1538] transition-colors"
            aria-label="닫기"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {lvDetails ? (
            <Lv4Table details={lvDetails} />
          ) : (
            <Lv4Placeholder />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E8E6DD] px-6 py-4 bg-[#FAFAF8]">
          <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em]">
            등급 = ★★★ / ★★ / ★ / ✗ · 점유 = 산업로봇 점유율
          </span>
          <div className="flex items-center gap-2">
            {isTop && (
              <button
                onClick={handleDeepDive}
                className="px-4 py-2 bg-[#8B1538] text-white font-medium text-[13px] hover:bg-[#751029] transition-colors"
                style={{ borderRadius: 4 }}
              >
                Deep Dive 보기 →
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#D3D1C7] text-[#2C2C2A] font-medium text-[13px] hover:bg-[#F1EFE8] transition-colors"
              style={{ borderRadius: 4 }}
            >
              닫기
            </button>
          </div>
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

// ─────────────────────────────────────────────────────────────────
function Lv4Table({ details }: { details: LvDetail[] }) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#FAFAF8]">
              {['Lv', '등급', '작업', '산업R', '그립', '점유', '라인업', '사례', '장벽'].map((h) => (
                <th
                  key={h}
                  className="font-mono text-[10px] font-medium text-[#5F5E5A] uppercase tracking-[0.16em] text-left px-3 py-2.5 border-b border-[#E8E6DD]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.map((lv, i) => (
              <Lv4Row key={i} lvNum={i + 1} lv={lv} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-3">
        {details.map((lv, i) => (
          <Lv4Card key={i} lvNum={i + 1} lv={lv} />
        ))}
      </div>
    </>
  );
}

function Lv4Row({ lvNum, lv }: { lvNum: number; lv: LvDetail }) {
  const failed = lv.grade === 0;
  return (
    <>
      <tr className={failed ? 'bg-[#F0EEE8]/60' : ''}>
        <td className="px-3 py-2.5 border-b border-[#E8E6DD] align-top">
          <span className="font-mono text-[11px] font-medium text-[#2C2C2A] tracking-wide">
            Lv{lvNum}
          </span>
        </td>
        <td className="px-3 py-2.5 border-b border-[#E8E6DD] align-top w-24">
          <GradeBar grade={lv.grade} />
        </td>
        <td className="px-3 py-2.5 border-b border-[#E8E6DD] align-top text-[12.5px] text-[#2C2C2A]">
          {lv.task}
        </td>
        <td className="px-3 py-2.5 border-b border-[#E8E6DD] align-top">
          <ChipRow items={lv.robots} kind="robot" />
        </td>
        <td className="px-3 py-2.5 border-b border-[#E8E6DD] align-top">
          {lv.grippers.length > 0 ? <ChipRow items={lv.grippers} kind="gripper" /> : <span className="text-[#B8B6AE]">—</span>}
        </td>
        <td className="px-3 py-2.5 border-b border-[#E8E6DD] align-top">
          <ShareDots filled={lv.share} />
        </td>
        <td className="px-3 py-2.5 border-b border-[#E8E6DD] align-top">
          <ChipRow items={lv.lineup} kind="lineup" />
        </td>
        <td className="px-3 py-2.5 border-b border-[#E8E6DD] align-top">
          {lv.tags.length > 0 ? <ChipRow items={lv.tags} kind="tag" /> : <span className="text-[#B8B6AE]">—</span>}
        </td>
        <td className="px-3 py-2.5 border-b border-[#E8E6DD] align-top text-[11.5px] text-[#5F5E5A]">
          {failed ? <span className="text-[#8B1538] font-medium">{lv.barriers || '—'}</span> : (lv.barriers || '—')}
        </td>
      </tr>
    </>
  );
}

function Lv4Card({ lvNum, lv }: { lvNum: number; lv: LvDetail }) {
  const failed = lv.grade === 0;
  return (
    <div
      className={`border ${failed ? 'border-[#FBEAF0] bg-[#FBEAF0]/30' : 'border-[#E8E6DD] bg-white'} p-4`}
      style={{ borderRadius: 8 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[12px] font-medium text-[#2C2C2A] tracking-wide">Lv{lvNum}</span>
        <GradeBar grade={lv.grade} />
      </div>
      <p className="font-medium text-[14px] text-[#2C2C2A] mb-3">{lv.task}</p>
      <div className="grid grid-cols-2 gap-3 text-[11.5px]">
        <Field label="산업R">  <ChipRow items={lv.robots} kind="robot" /></Field>
        <Field label="그립">    {lv.grippers.length ? <ChipRow items={lv.grippers} kind="gripper" /> : <span className="text-[#B8B6AE]">—</span>}</Field>
        <Field label="점유율">  <ShareDots filled={lv.share} /></Field>
        <Field label="라인업">  <ChipRow items={lv.lineup} kind="lineup" /></Field>
        <Field label="사례">    {lv.tags.length ? <ChipRow items={lv.tags} kind="tag" /> : <span className="text-[#B8B6AE]">—</span>}</Field>
      </div>
      {lv.barriers && (
        <div
          className={`mt-3 p-2.5 text-[11.5px] ${failed ? 'bg-white border-l-2 border-[#8B1538] text-[#8B1538] font-medium' : 'text-[#5F5E5A]'}`}
        >
          {lv.barriers}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[9px] text-[#888780] uppercase tracking-[0.16em] mb-1">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function GradeBar({ grade }: { grade: 0 | 1 | 2 | 3 }) {
  const labels = ['✗', '★', '★★', '★★★'];
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`block h-1.5 w-4 ${i <= grade ? 'bg-[#8B1538]' : 'bg-[#E8E6DD]'}`}
          />
        ))}
      </div>
      <span className={`font-mono text-[11px] font-medium ${grade === 0 ? 'text-[#888780]' : 'text-[#8B1538]'} tracking-wide`}>
        {labels[grade]}
      </span>
    </div>
  );
}

function ShareDots({ filled }: { filled: 0 | 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i <= filled ? 'bg-[#2C2C2A]' : 'bg-[#E8E6DD]'}`}
        />
      ))}
    </div>
  );
}

const CHIP_STYLES: Record<string, { bg: string; fg: string }> = {
  robot:    { bg: '#E6F1FB', fg: '#0C447C' },
  gripper:  { bg: '#EAF3DE', fg: '#3B6D11' },
  lineup:   { bg: '#E6F1FB', fg: '#0C447C' },
  tag:      { bg: '#FAEAE7', fg: '#8B1538' },
};

function ChipRow({ items, kind }: { items: string[]; kind: 'robot' | 'gripper' | 'lineup' | 'tag' }) {
  const s = CHIP_STYLES[kind];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it) => {
        const isHalt = kind === 'tag' && it.endsWith('-X');
        return (
          <span
            key={it}
            className="font-mono text-[9.5px] font-medium px-1.5 py-0.5"
            style={{
              backgroundColor: isHalt ? '#F0EEE8' : s.bg,
              color: isHalt ? '#888780' : s.fg,
              letterSpacing: '0.04em',
            }}
          >
            {it}
          </span>
        );
      })}
    </div>
  );
}

function Lv4Placeholder() {
  return (
    <div className="border border-dashed border-[#D3D1C7] bg-[#FAFAF8] p-8 text-center">
      <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.18em] mb-2">
        Lv 상세 미입력
      </p>
      <p className="text-[12.5px] text-[#5F5E5A] leading-relaxed">
        4Lv 상세 데이터는 Top 5 진입 적합 셀을 우선 입력 중입니다.<br />
        Phase 1.5 Deep Dive 세션에서 전체 144셀로 확장합니다.
      </p>
    </div>
  );
}

function getProc(taskIdx: number): string {
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
