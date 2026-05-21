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
        onChange={(e) => {
          const s = e.target.value;
          setStart(s);
          // timeline & 종료일 비어 있을 때 → 기본 7일 뒤로 자동 채움
          if (isTimeline && s && !end) {
            const d = new Date(s);
            d.setDate(d.getDate() + 7);
            const auto = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            setEnd(auto);
            emit(s, auto);
          } else {
            emit(s, end);
          }
        }}
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

// status/priority/dropdown 공용 선택 편집기.
// - status/priority: settings.labels[{id,name,color}], 값 { label_id } (단일)
// - dropdown: settings.options[{id,name}], 값 { option_ids:[] } (다중)
// onAddOption: 새 항목을 컬럼 settings 에 추가하고 새 id 를 반환(리스트로 관리·재사용).
export function ChoiceCellEditor({
  col, value, onSave, onClose, onAddOption,
}: {
  col: PmColumn;
  value: any;
  onSave: (v: any) => void;
  onClose?: () => void;
  onAddOption?: (name: string) => Promise<number | null>;
}) {
  const isDropdown = col.type === 'dropdown';
  const list: { id: number; name: string; color?: string }[] =
    isDropdown ? (col.settings?.options || []) : (col.settings?.labels || []);
  const selectedIds: number[] = isDropdown
    ? (value?.option_ids || [])
    : (value?.label_id != null ? [value.label_id] : []);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const choose = (id: number) => {
    if (isDropdown) {
      const set = new Set<number>(selectedIds);
      set.has(id) ? set.delete(id) : set.add(id);
      onSave({ option_ids: [...set] });
    } else {
      onSave({ label_id: id });
      onClose?.();
    }
  };
  const clear = () => { onSave(isDropdown ? { option_ids: [] } : {}); if (!isDropdown) onClose?.(); };
  const add = async () => {
    const name = draft.trim();
    if (!name || !onAddOption || busy) return;
    setBusy(true);
    try {
      const id = await onAddOption(name);
      setDraft('');
      if (id != null) {
        if (isDropdown) onSave({ option_ids: [...selectedIds, id] });
        else { onSave({ label_id: id }); onClose?.(); }
      }
    } finally { setBusy(false); }
  };

  return (
    <div
      className="flex flex-col gap-1.5 min-w-[150px] py-0.5"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose?.(); } }}>
      <div className="flex flex-wrap gap-1">
        {list.length === 0 && <span className="text-[11px] text-[#B8B6AE]">아직 항목이 없습니다 — 아래에서 추가</span>}
        {list.map((o) => {
          const on = selectedIds.includes(o.id);
          return (
            <button key={o.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(o.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${on ? 'text-white border-transparent' : 'text-[#5F5E5A] bg-white border-[#D3D1C7] hover:border-[#A50034]'}`}
              style={on ? { backgroundColor: o.color || '#3C6FA5' } : undefined}>
              {o.name}{on && isDropdown ? ' ✕' : ''}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1">
        {onAddOption && (
          <>
            <input value={draft} autoFocus placeholder="새 항목 추가"
              onChange={(e) => setDraft(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add(); } }}
              className="flex-1 text-[12px] px-1.5 py-0.5 border border-[#E2DED4] rounded outline-none focus:border-[#A50034]" />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void add()} disabled={busy || !draft.trim()}
              className="text-[11px] px-1.5 py-0.5 rounded bg-[#A50034] text-white disabled:opacity-40">추가</button>
          </>
        )}
        {selectedIds.length > 0 && (
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clear}
            className="text-[11px] px-1.5 py-0.5 text-[#888780] hover:text-[#A50034]">지우기</button>
        )}
      </div>
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
