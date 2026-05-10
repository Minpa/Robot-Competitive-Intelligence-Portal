'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, X } from 'lucide-react';
import {
  buildTaskMatrixEntries,
  type TaskCategory,
  type ComplexityBucket,
  type TaskMatrixEntry,
} from './data-v13';

const CATEGORIES: TaskCategory[] = ['단순 이재', '정밀 조작', '도구 운용'];
const BUCKETS: ComplexityBucket[] = ['Lv1~2', 'Lv3~4'];

const ROW_NOTE: Record<TaskCategory, { lv12: string; lv34: string }> = {
  '단순 이재':   { lv12: '그리퍼 OK 대부분', lv34: 'Lv3 hook까지 OK, Lv4 일부 협소' },
  '정밀 조작':   { lv12: '핸드 필수',         lv34: '핸드 + 협소' },
  '도구 운용':   { lv12: 'tool',              lv34: 'tool + 인증' },
};

interface FilterKey {
  category?: TaskCategory;
  bucket?: ComplexityBucket;
}

function matches(e: TaskMatrixEntry, k: FilterKey): boolean {
  if (k.category && e.category !== k.category) return false;
  if (k.bucket && e.bucket !== k.bucket) return false;
  return true;
}

function filterLabel(k: FilterKey): string {
  if (k.category && k.bucket) return `${k.category} × ${k.bucket}`;
  if (k.category) return `${k.category} (전체 Lv)`;
  if (k.bucket) return `${k.bucket} (전체 작업 종류)`;
  return '전체 sub-cell';
}

export default function TaskCategoryMatrix() {
  const entries = useMemo(buildTaskMatrixEntries, []);
  const [active, setActive] = useState<FilterKey | null>(null);

  // count by (category, bucket)
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      const k = `${e.category}|${e.bucket}`;
      map[k] = (map[k] || 0) + 1;
    }
    return map;
  }, [entries]);

  const rowSum = (cat: TaskCategory) =>
    BUCKETS.reduce((s, b) => s + (counts[`${cat}|${b}`] || 0), 0);
  const colSum = (b: ComplexityBucket) =>
    CATEGORIES.reduce((s, c) => s + (counts[`${c}|${b}`] || 0), 0);
  const grand = entries.length;

  return (
    <>
      <div className="bg-white border border-[#E8E6DD] p-5" style={{ borderRadius: 8 }}>
        <h3 className="font-medium text-[15px] text-[#2C2C2A] mb-3">
          데이터 검증 ({entries.length} sub-cell)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 border-b border-[#E8E6DD] font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#5F5E5A]">
                  작업 종류 \ 복잡도
                </th>
                {BUCKETS.map((b) => (
                  <th key={b} className="text-left p-2 border-b border-[#E8E6DD] font-medium text-[#1A1A1A]">
                    {b}
                  </th>
                ))}
                <th className="text-left p-2 border-b border-[#E8E6DD] font-medium text-[#1A1A1A] bg-[#FAFAF7]">
                  합
                </th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <tr key={cat} className="hover:bg-[#FAFAF7]/50">
                  <td className="p-2 border-b border-[#E8E6DD] font-medium text-[#1A1A1A] whitespace-nowrap">
                    {cat}
                  </td>
                  {BUCKETS.map((b) => {
                    const n = counts[`${cat}|${b}`] || 0;
                    const note = b === 'Lv1~2' ? ROW_NOTE[cat].lv12 : ROW_NOTE[cat].lv34;
                    return (
                      <td key={b} className="p-2 border-b border-[#E8E6DD] align-top">
                        <CellNum
                          n={n}
                          note={note}
                          onList={() => setActive({ category: cat, bucket: b })}
                        />
                      </td>
                    );
                  })}
                  <td className="p-2 border-b border-[#E8E6DD] align-top bg-[#FAFAF7]/40">
                    <CellNum
                      n={rowSum(cat)}
                      isSum
                      onList={() => setActive({ category: cat })}
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-[#FAFAF7]">
                <td className="p-2 font-medium text-[#1A1A1A]">합</td>
                {BUCKETS.map((b) => (
                  <td key={b} className="p-2 align-top">
                    <CellNum
                      n={colSum(b)}
                      isSum
                      onList={() => setActive({ bucket: b })}
                    />
                  </td>
                ))}
                <td className="p-2 align-top">
                  <CellNum n={grand} isSum onList={() => setActive({})} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="font-mono text-[10.5px] text-[#888780] mt-3 leading-relaxed">
          ⓘ 단순 이재 = Tote · Bin · 박스 · Kitting (픽·이재 위주, 그리퍼 충분) ·
          정밀 조작 = 커넥터 · 케이블 · FPC (다지 핸드 필수) ·
          도구 운용 = 용접 · 도장 · 점검 · 나사 (토치 · 드라이버 등 tool 마운트)
        </p>
      </div>

      {active && (
        <ListModal
          filter={active}
          entries={entries.filter((e) => matches(e, active))}
          onClose={() => setActive(null)}
        />
      )}
    </>
  );
}

function CellNum({
  n,
  note,
  isSum,
  onList,
}: {
  n: number;
  note?: string;
  isSum?: boolean;
  onList: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`font-medium tabular-nums ${isSum ? 'text-[15px] text-[#A50034]' : 'text-[14px] text-[#1A1A1A]'}`}
      >
        {n}
      </span>
      {note && <span className="text-[11px] text-[#5F5E5A]">({note})</span>}
      <button
        type="button"
        onClick={onList}
        className="font-mono text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 border border-[#D3D1C7] text-[#5F5E5A] hover:border-[#8B1538] hover:text-[#8B1538] transition-colors"
        style={{ borderRadius: 3 }}
      >
        List
      </button>
    </div>
  );
}

function ListModal({
  filter,
  entries,
  onClose,
}: {
  filter: FilterKey;
  entries: TaskMatrixEntry[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // group by sector → cellNum
  const grouped: Record<string, TaskMatrixEntry[]> = {};
  for (const e of entries) {
    const key = `${e.cellNum} ${e.taskName} × ${e.sectorName}`;
    grouped[key] = grouped[key] || [];
    grouped[key].push(e);
  }
  // Sort cells: by sector first then cellNum
  const orderedKeys = Object.keys(grouped).sort();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(26,26,26,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[820px] max-h-[90vh] overflow-hidden flex flex-col"
        style={{ borderRadius: 8, border: '1px solid #E2DED4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-4 px-5 py-3 border-b border-[#E2DED4]"
          style={{ backgroundColor: '#FAFAF7' }}
        >
          <div>
            <p className="font-mono text-[10.5px] text-[#6B6B6B] uppercase tracking-[0.14em] font-semibold mb-0.5">
              해당 sub-cell 리스트
            </p>
            <h2 className="text-[16px] font-medium text-[#1A1A1A]">
              {filterLabel(filter)}
              <span className="ml-2 font-mono text-[12px] text-[#6B6B6B]">{entries.length}건</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#F2F0EA] text-[#6B6B6B] hover:text-[#1A1A1A]"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {orderedKeys.length === 0 && (
            <p className="text-center text-[13px] text-[#5F5E5A] py-8">해당 항목이 없습니다.</p>
          )}
          {orderedKeys.map((cellKey) => {
            const items = grouped[cellKey];
            const cellId = items[0].cellId;
            return (
              <div key={cellKey} className="border border-[#E8E6DD]" style={{ borderRadius: 6 }}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8E6DD] bg-[#FAFAF7]">
                  <p className="text-[13px] font-medium text-[#1A1A1A]">{cellKey}</p>
                  <Link
                    href={`/business-strategy/cloid-coverage/v13/${cellId}`}
                    onClick={onClose}
                    className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8B1538] hover:underline"
                  >
                    셀 전체 보기 →
                  </Link>
                </div>
                <ul>
                  {items.map((e) => (
                    <li key={`${e.cellId}-${e.lv}`}>
                      <Link
                        href={`/business-strategy/cloid-coverage/v13/${e.cellId}#lv-${e.lv}`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-[#FAEAE7]/40 group"
                      >
                        <span
                          className="font-mono text-[11px] font-medium px-2 py-0.5 bg-[#F0EEE8] text-[#1A1A1A] tracking-wide shrink-0"
                          style={{ borderRadius: 3 }}
                        >
                          Lv{e.lv}
                        </span>
                        <span className="text-[13px] text-[#1A1A1A] flex-1">
                          {e.fieldVerified && (
                            <span
                              className="text-[#A50034] mr-1 font-semibold"
                              title={e.fieldVerifiedLine || '현장 확인'}
                            >
                              ★
                            </span>
                          )}
                          {e.subTaskName || '(작업명 없음)'}
                        </span>
                        <ChevronRight size={14} className="text-[#888780] group-hover:text-[#8B1538]" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
