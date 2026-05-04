'use client';

/**
 * RevisionLog · REQ-9
 *
 * Collapsible side panel showing the last N spec changes. Click an entry
 * to inspect old/new values. Phase 1 stores in localStorage (cap 200).
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useCandidatesStore } from '../../stores/candidates-store';

const VISIBLE_LIMIT_DEFAULT = 20;

const PARAM_LABEL: Record<string, string> = {
  'product.name': '후보 이름',
  'product.armCount': '팔 개수',
  'base.shape': '베이스 폼',
  'base.heightCm': '베이스 높이',
  'base.diameterOrWidthCm': '베이스 폭/직경',
  'base.weightKg': '베이스 무게',
  'base.hasLiftColumn': '리프트 컬럼',
  'base.liftColumnMaxExtensionCm': '리프트 스트로크',
  'payloadKg': '페이로드',
};

const ARM_KEY_LABEL: Record<string, string> = {
  mountPosition: '마운트',
  shoulderHeightAboveBaseCm: '어깨 높이',
  shoulderActuatorSku: '어깨 액추에이터',
  upperArmLengthCm: '상완 L1',
  elbowActuatorSku: '팔꿈치 액추에이터',
  forearmLengthCm: '전완 L2',
  wristDof: '손목 DOF',
  endEffectorSku: '엔드이펙터',
};

const SHAPE_LABEL: Record<string, string> = {
  disc: '디스크',
  square: '사각',
  tall_cylinder: '톨 실린더',
};

const MOUNT_LABEL: Record<string, string> = {
  center: '중앙',
  front: '전면',
  left: '좌측',
  right: '우측',
};

function humanizeParam(name: string): string {
  if (PARAM_LABEL[name]) return PARAM_LABEL[name];
  // arm[0].upperArmLengthCm → "팔 1 · 상완 L1"
  const armMatch = name.match(/^arm\[(\d+)\]\.(.+)$/);
  if (armMatch) {
    const idx = Number(armMatch[1]) + 1;
    const key = armMatch[2];
    return `팔 ${idx} · ${ARM_KEY_LABEL[key] ?? key}`;
  }
  return name;
}

function humanizeValue(name: string, v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'boolean') return v ? '켜짐' : '꺼짐';
  if (typeof v === 'string') {
    if (name === 'base.shape' && SHAPE_LABEL[v]) return SHAPE_LABEL[v];
    if (name.endsWith('.mountPosition') && MOUNT_LABEL[v]) return MOUNT_LABEL[v];
    return v;
  }
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  try {
    const s = JSON.stringify(v);
    return s.length > 30 ? s.slice(0, 27) + '…' : s;
  } catch {
    return '?';
  }
}

export function RevisionLog() {
  const revisions = useCandidatesStore((s) => s.revisions);
  const clear = useCandidatesStore((s) => s.clearRevisions);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? revisions.slice().reverse() : revisions.slice(-VISIBLE_LIMIT_DEFAULT).reverse();

  return (
    <div className="border-t border-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3 w-3 text-white/45" strokeWidth={2.2} />
          ) : (
            <ChevronRight className="h-3 w-3 text-white/45" strokeWidth={2.2} />
          )}
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/70">
            변경 로그 (REQ-9)
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 px-1.5 py-0.5 border border-white/10">
          {revisions.length}건
        </span>
      </button>
      {open ? (
        <div className="pb-4">
          {revisions.length === 0 ? (
            <p className="text-[11px] text-white/50">사양을 변경하면 여기에 기록됩니다.</p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                {!showAll && revisions.length > VISIBLE_LIMIT_DEFAULT ? (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="font-mono text-[10px] uppercase tracking-[0.18em] border border-white/15 px-2 py-0.5 text-white/60 hover:border-white/40 hover:text-white"
                  >
                    전체 표시 ({revisions.length})
                  </button>
                ) : null}
                {showAll ? (
                  <button
                    type="button"
                    onClick={() => setShowAll(false)}
                    className="font-mono text-[10px] uppercase tracking-[0.18em] border border-white/15 px-2 py-0.5 text-white/60 hover:border-white/40 hover:text-white"
                  >
                    최근 {VISIBLE_LIMIT_DEFAULT}건만
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={clear}
                  className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] border border-white/15 p-1 text-white/60 hover:border-[#E63950] hover:text-[#E63950]"
                  title="로그 비우기"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <ul className="space-y-1">
                {visible.map((entry) => (
                  <li key={entry.id} className="border border-white/10 px-2 py-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="text-[11.5px] text-white/80 truncate"
                        title={entry.parameterName}
                      >
                        {humanizeParam(entry.parameterName)}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-white/40 shrink-0">
                        {formatTime(entry.changedAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] tabular-nums text-white/70 truncate">
                      <span className="text-white/45">
                        {humanizeValue(entry.parameterName, entry.oldValue)}
                      </span>
                      <span className="mx-1.5 text-white/35">→</span>
                      <span className="text-white">
                        {humanizeValue(entry.parameterName, entry.newValue)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

