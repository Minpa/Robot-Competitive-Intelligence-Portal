'use client';
// 컬럼 타입별 셀 값 표시·편집 공용 로직.
import { useState } from 'react';
import type { PmColumn } from '@/lib/pm-api';

export const STATUS_PALETTE = ['#3C6FA5', '#3F8C6E', '#D4A22F', '#C8366E', '#7E5BB5', '#888780'];

export function cellToText(col: PmColumn, value: any): string {
  if (value == null) return '';
  switch (col.type) {
    case 'text': case 'long_text': return String(value.text ?? '');
    case 'status': case 'priority': {
      const l = (col.settings?.labels || []).find((x: any) => x.id === value.label_id);
      return l?.name ?? '';
    }
    case 'dropdown': {
      const opts = col.settings?.options || [];
      return (value.option_ids || []).map((id: number) => opts.find((o: any) => o.id === id)?.name).filter(Boolean).join(', ');
    }
    case 'date': return String(value.date ?? '');
    case 'timeline': return value.start && value.end ? `${value.start} ~ ${value.end}` : '';
    case 'number': { const u = col.settings?.unit ? ` ${col.settings.unit}` : ''; return value.number != null ? `${value.number}${u}` : ''; }
    case 'checkbox': return value.checked ? '✔' : '';
    case 'progress': return value.percent != null ? `${value.percent}%` : '';
    case 'reliability': return value.grade ? value.grade : '';
    case 'person': return (value.user_ids || []).join(', ');
    case 'link': return String(value.text || value.url || '');
    default: return '';
  }
}

// 자유 텍스트 입력 → 타입별 value JSONB 로 파싱 (붙여넣기·키 입력 공용)
export function textToCellValue(col: PmColumn, raw: string): any {
  const s = raw.trim();
  switch (col.type) {
    case 'text': case 'long_text': return { text: s };
    case 'number': { const n = parseFloat(s.replace(/[^\d.-]/g, '')); return Number.isNaN(n) ? {} : { number: n }; }
    case 'checkbox': return { checked: /^(1|true|y|✔|o|예)$/i.test(s) };
    case 'progress': { const n = parseFloat(s); return Number.isNaN(n) ? {} : { percent: Math.max(0, Math.min(100, n)) }; }
    case 'date': return s ? { date: s } : {};
    case 'reliability': return s ? { grade: s.toUpperCase().slice(0, 1) } : {};
    case 'timeline': {
      const m = s.split(/\s*~\s*|\s*,\s*/);
      return m.length === 2 ? { start: m[0], end: m[1] } : {};
    }
    case 'status': case 'priority': {
      const l = (col.settings?.labels || []).find((x: any) => x.name === s);
      return l ? { label_id: l.id } : {};
    }
    default: return { text: s };
  }
}

// 날짜/기간 전용 입력기 — free-text 파싱 대신 native date picker.
// timeline = 시작·끝 2개(한쪽만 입력 시 단일일로 처리), date = 1개.
// onSave 는 값이 바뀔 때마다 즉시 호출(value JSONB), onClose 는 외부 클릭/ESC.
export function DateCellEditor({
  col, value, onSave, onClose, compact = false, autoFocus = true,
}: {
  col: PmColumn;
  value: any;
  onSave: (v: any) => void;
  onClose?: () => void;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const v = value || {};
  const isTimeline = col.type === 'timeline';
  const [start, setStart] = useState<string>(isTimeline ? (v.start ?? '') : (v.date ?? ''));
  const [end, setEnd] = useState<string>(isTimeline ? (v.end ?? '') : '');

  const inputCls = `${compact ? 'text-[12px] px-1 py-0.5' : 'text-[13px] px-2 py-1.5'} border border-[#E2DED4] rounded outline-none focus:border-[#A50034]`;

  const emit = (s: string, e: string) => {
    if (!isTimeline) { onSave(s ? { date: s } : {}); return; }
    if (s && e) onSave({ start: s, end: e });
    else if (s || e) { const d = s || e; onSave({ start: d, end: d }); } // 한쪽만 → 단일일
    else onSave({});
  };

  const onContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!onClose) return;
    const cur = e.currentTarget;
    // 네이티브 date picker 팝업 조작 중에는 닫지 않음 — 다음 틱에 실제 포커스 위치 확인
    setTimeout(() => { if (!cur.contains(document.activeElement)) onClose(); }, 0);
  };

  return (
    <div
      className="flex items-center gap-1.5 flex-wrap"
      onBlur={onContainerBlur}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose?.(); } }}>
      <input
        type="date" value={start} autoFocus={autoFocus}
        onChange={(e) => { setStart(e.target.value); emit(e.target.value, end); }}
        className={inputCls} />
      {isTimeline && (
        <>
          <span className="text-[#888780] text-[11px]">~</span>
          <input
            type="date" value={end}
            onChange={(e) => { setEnd(e.target.value); emit(start, e.target.value); }}
            className={inputCls} />
        </>
      )}
      {(start || end) && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setStart(''); setEnd(''); emit('', ''); }}
          className="text-[#B8B6AE] hover:text-[#A50034] text-[12px] px-1"
          title="비우기">✕</button>
      )}
    </div>
  );
}

export function CellDisplay({ col, value }: { col: PmColumn; value: any }) {
  if (col.type === 'status' || col.type === 'priority') {
    const labels = col.settings?.labels || [];
    const l = labels.find((x: any) => x.id === value?.label_id);
    if (!l) return <span className="text-[#B8B6AE]">—</span>;
    return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-white" style={{ backgroundColor: l.color || '#888780' }}>{l.name}</span>;
  }
  if (col.type === 'checkbox') return <span className={value?.checked ? 'text-[#3F8C6E]' : 'text-[#D3D1C7]'}>{value?.checked ? '☑' : '☐'}</span>;
  if (col.type === 'progress') {
    const p = value?.percent ?? 0;
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-[#EFEDE6] rounded-full overflow-hidden"><div className="h-full bg-[#3F8C6E]" style={{ width: `${p}%` }} /></div>
        <span className="font-mono text-[10.5px] text-[#5F5E5A] w-8 text-right">{p}%</span>
      </div>
    );
  }
  if (col.type === 'reliability' && value?.grade) {
    const g = String(value.grade);
    const c = g <= 'B' ? '#3F8C6E' : g <= 'D' ? '#D4A22F' : '#C8366E';
    return <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ color: c, backgroundColor: `${c}1A` }}>{g}</span>;
  }
  const t = cellToText(col, value);
  return t ? <span className="text-[#1A1A1A]">{t}</span> : <span className="text-[#B8B6AE]">—</span>;
}
