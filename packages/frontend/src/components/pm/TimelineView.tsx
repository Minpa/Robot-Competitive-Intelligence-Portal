'use client';
// Timeline/Gantt 뷰 — timeline 막대 + 주/월/분기 축 + 마일스톤·오늘선 + 의존선(FS/SS/FF/SF).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { pmApi, type BoardData, type DependencyType } from '@/lib/pm-api';

type Unit = 'day' | 'week' | 'month' | 'quarter';

function toDate(s?: string | null): Date | null {
  if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d;
}
function pad(n: number) { return String(n).padStart(2, '0'); }
// 막대 배경색 대비 텍스트 색 자동 선택 (밝으면 진한 글자, 어두우면 흰 글자)
function pickText(hex?: string | null): { color: string; shadow: string } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
  const n = m ? parseInt(m[1], 16) : 0x4a4a48;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.6
    ? { color: '#1A1A1A', shadow: '0 1px 1px rgba(255,255,255,.6)' }
    : { color: '#FFFFFF', shadow: '0 1px 1px rgba(0,0,0,.55)' };
}
function periodKey(d: Date, u: Unit): string {
  const y = d.getFullYear();
  if (u === 'day') return `${y}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (u === 'quarter') return `${y}Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (u === 'week') { const j = new Date(y, 0, 1); const w = Math.ceil(((d.getTime() - j.getTime()) / 864e5 + j.getDay() + 1) / 7); return `${y}W${pad(w)}`; }
  return `${y}M${pad(d.getMonth() + 1)}`;
}
function label(d: Date, u: Unit): string {
  const y = d.getFullYear();
  if (u === 'day') return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  if (u === 'quarter') return `${y} Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (u === 'week') { const j = new Date(y, 0, 1); const w = Math.ceil(((d.getTime() - j.getTime()) / 864e5 + j.getDay() + 1) / 7); return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`; }
  return `${y}.${pad(d.getMonth() + 1)}`;
}
function step(d: Date, u: Unit): Date {
  const n = new Date(d);
  if (u === 'quarter') n.setMonth(n.getMonth() + 3);
  else if (u === 'week') n.setDate(n.getDate() + 7);
  else if (u === 'day') n.setDate(n.getDate() + 1);
  else n.setMonth(n.getMonth() + 1);
  return n;
}
// 축에서 굵게 강조할 주요 눈금 (일=월초/월요일, 그 외=분기 시작)
function isMajor(d: Date, u: Unit): boolean {
  if (u === 'day') return d.getDate() === 1 || d.getDay() === 1;
  return d.getMonth() % 3 === 0;
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d: Date, n: number): Date { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function fmtDate(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
// 날짜 문자열을 축 단위 N칸만큼 이동
function shiftStr(s: string, periods: number, u: Unit): string {
  const d = toDate(s); if (!d) return s;
  if (u === 'day') return fmtDate(addDays(d, periods));
  if (u === 'week') return fmtDate(addDays(d, periods * 7));
  if (u === 'month') return fmtDate(addMonths(d, periods));
  return fmtDate(addMonths(d, periods * 3)); // quarter
}
function diffDays(a: string, b: string): number {
  const da = toDate(a), db = toDate(b);
  if (!da || !db) return 0;
  return Math.round((da.getTime() - db.getTime()) / 864e5);
}

const DEP_TYPES: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];
// 한글 설명 (선행 = 앞 작업, 후행 = 뒤 작업)
const DEP_LABEL: Record<DependencyType, string> = {
  FS: '선행이 끝나야 후행 시작',
  SS: '선행이 시작해야 후행 시작',
  FF: '선행이 끝나야 후행도 종료',
  SF: '선행이 시작해야 후행 종료',
};

interface Props { data: BoardData; canEdit?: boolean; onChanged?: () => void; onOpenItem?: (id: number) => void; }

export default function TimelineView({ data, canEdit = false, onChanged, onOpenItem }: Props) {
  const board = data.board;
  const [unit, setUnit] = useState<Unit>(
    (board.reportCycle && board.reportCycle !== 'none' ? board.reportCycle : 'month') as Unit);
  const [showDeps, setShowDeps] = useState(true);
  const [draft, setDraft] = useState<{ pred: string; succ: string; type: DependencyType }>({ pred: '', succ: '', type: 'FS' });
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<{ itemId: number; startX: number; startY: number; periods: number; laneDelta: number; mode: 'move' | 'start' | 'end' } | null>(null);
  const [hoverItemId, setHoverItemId] = useState<number | null>(null);
  // 의존선 drag-to-create / click-to-create-next:
  // sx,sy = svg 기준 좌표(고스트 라인 시작점). sx0,sy0 = 마우스 시작 좌표(클릭/드래그 판정용).
  const [linkDrag, setLinkDrag] = useState<{ sourceId: number; sx: number; sy: number; sx0: number; sy0: number; mx: number; my: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // '+' 버튼으로 기본 종료(2027-01) 이후 추가 연장한 개월 수
  const [extendMonths, setExtendMonths] = useState(0);

  // linkDrag 진행 중 — 전역 mousemove/up 으로 끝점 추적 + drop 처리.
  // 클릭(이동 < 5px) → 다음 아이템 자동 생성 + FS 의존 자동 연결.
  // 드래그(이동 >= 5px) → ghost 라인 후 다른 막대에 드롭 → FS 의존 생성.
  useEffect(() => {
    if (!linkDrag) return;
    const onMove = (e: MouseEvent) => {
      setLinkDrag((cur) => cur ? { ...cur, mx: e.clientX, my: e.clientY } : null);
    };
    const onUp = async (e: MouseEvent) => {
      const moved = Math.hypot(e.clientX - linkDrag.sx0, e.clientY - linkDrag.sy0);
      const isClick = moved < 5;
      setLinkDrag(null);
      if (isClick) {
        await createNextItemAfter(linkDrag.sourceId);
      } else {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const barEl = el?.closest('[data-pm-bar-itemid]') as HTMLElement | null;
        const targetId = barEl ? Number(barEl.getAttribute('data-pm-bar-itemid')) : NaN;
        if (Number.isFinite(targetId) && targetId !== linkDrag.sourceId) {
          try {
            await pmApi.createDependency(board.id, { predecessorItemId: linkDrag.sourceId, successorItemId: targetId, type: 'FS' });
            onChanged?.();
          } catch (err: any) { alert(`의존선 생성 실패: ${err?.message ?? ''}`); }
        }
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [linkDrag, board.id, onChanged]);

  // 다음 아이템 자동 생성 — 선행의 그룹/타임라인을 기준으로 +1일~+8일로 시작, FS 의존 자동 연결.
  const createNextItemAfter = async (sourceId: number) => {
    if (!tCol) { alert('timeline 컬럼이 필요합니다.'); return; }
    const src = data.items.find((i) => i.id === sourceId);
    if (!src) return;
    const srcV = cv(sourceId, tCol.id);
    const endStr = srcV?.end || srcV?.start;
    let nextStart = new Date(); let nextEnd = new Date();
    if (endStr) {
      const d = toDate(endStr);
      if (d) { nextStart = addDays(d, 1); nextEnd = addDays(d, 8); }
    } else { nextEnd = addDays(nextStart, 7); }
    try {
      const { item: newItem } = await pmApi.createItem(src.groupId, { name: '새 아이템' });
      await pmApi.setCell(newItem.id, tCol.id, { start: fmtDate(nextStart), end: fmtDate(nextEnd) });
      await pmApi.createDependency(board.id, { predecessorItemId: sourceId, successorItemId: newItem.id, type: 'FS' });
      onChanged?.();
    } catch (e: any) { alert(`다음 아이템 생성 실패: ${e?.message ?? ''}`); }
  };
  const tCol = useMemo(() => data.columns.find((c) => c.type === 'timeline'), [data.columns]);
  const dCol = useMemo(() => data.columns.find((c) => c.type === 'date'), [data.columns]);
  const cv = (itemId: number, colId: number) => data.cells.find((x) => x.itemId === itemId && x.columnId === colId)?.value;

  const colW = unit === 'day' ? 38 : 92;
  const laneH = 30, labelW = 200;

  // 작업 번호(Predecessors 표기용) — 보드 순서 1-based
  const numOf = useMemo(() => {
    const m = new Map<number, number>();
    data.items.forEach((it, i) => m.set(it.id, i + 1));
    return m;
  }, [data.items]);

  const model = useMemo(() => {
    let min: Date | null = null, max: Date | null = null;
    for (const it of data.items) {
      const tv = tCol ? cv(it.id, tCol.id) : null;
      const dv = dCol ? cv(it.id, dCol.id) : null;
      const s = toDate(tv?.start) || toDate(dv?.date);
      const e = toDate(tv?.end) || toDate(dv?.date);
      if (s && (!min || s < min)) min = s;
      if (e && (!max || e > max)) max = e;
    }
    if (!min) min = new Date();
    // 기본 종료선: 2027-01 까지 보장 + '+' 버튼으로 연장한 개월 수
    const floorEnd = addMonths(new Date(2027, 0, 31), extendMonths);
    if (!max || max < floorEnd) max = floorEnd;
    const periods: { key: string; label: string; date: Date }[] = [];
    let cur = new Date(min);
    const cap = unit === 'day' ? 800 : 480;
    for (let g = 0; g < cap && cur <= max!; g++) { periods.push({ key: periodKey(cur, unit), label: label(cur, unit), date: new Date(cur) }); cur = step(cur, unit); }
    if (!periods.length) periods.push({ key: periodKey(min, unit), label: label(min, unit), date: min });
    const idx = (d: Date) => Math.max(0, periods.findIndex((p) => p.key === periodKey(d, unit)));

    // 전역 좌표 맵 (의존선 SVG 오버레이용) — 타임라인 영역 기준 (x: 0 = labelW 우측, y: 0 = groups 영역 상단)
    const pos = new Map<number, { x0: number; x1: number; yc: number; milestone: boolean }>();
    let yCursor = 0;
    // 부모ID → 서브아이템 (timeline/date 있는 것만, orderIndex 순)
    const subitemsByParent = new Map<number, typeof data.items>();
    for (const it of data.items) {
      if (it.parentItemId == null) continue;
      const arr = subitemsByParent.get(it.parentItemId) ?? [];
      arr.push(it);
      subitemsByParent.set(it.parentItemId, arr);
    }
    const groups = [...data.groups].sort((a, b) => a.orderIndex - b.orderIndex).map((g) => {
      // 부모 아이템 + 그 아래 서브아이템을 평탄화 (서브는 isSub:true 마킹, 라벨에 ↳ 표기)
      const parents = data.items.filter((i) => i.groupId === g.id && !i.parentItemId);
      const gItems = parents.flatMap((p) => {
        const subs = (subitemsByParent.get(p.id) ?? []).sort((a, b) => a.orderIndex - b.orderIndex);
        return [{ it: p, isSub: false }, ...subs.map((s) => ({ it: s, isSub: true }))];
      });
      // 1) 좌표 산출 + null/지정 lane 분리. 2) 명시 lane은 고정 배치 후, null만 빈 차선으로 packing.
      const raw = gItems
        .map(({ it, isSub }) => {
          const tv = tCol ? cv(it.id, tCol.id) : null;
          const dv = dCol ? cv(it.id, dCol.id) : null;
          const sd = toDate(tv?.start) || toDate(dv?.date);
          const ed = toDate(tv?.end) || toDate(dv?.date);
          if (!sd) return null;
          const s = idx(sd), e = ed ? idx(ed) : s;
          const milestone = !ed || sd.getTime() === ed.getTime();
          const fixedLane = typeof it.lane === 'number' ? it.lane : null;
          return { it, s, e, milestone, isSub, fixedLane };
        })
        .filter(Boolean) as Array<{ it: typeof data.items[number]; s: number; e: number; milestone: boolean; isSub: boolean; fixedLane: number | null }>;
      // 명시 lane 우선 배치 — 같은 lane에 겹쳐도 사용자 의도이므로 허용.
      const fixed = raw.filter((b) => b.fixedLane !== null);
      const auto = raw.filter((b) => b.fixedLane === null).sort((a, b) => a.s - b.s);
      const laneOccupancy = new Map<number, number>(); // lane -> 마지막 end (auto packing 용)
      for (const b of fixed) laneOccupancy.set(b.fixedLane!, Math.max(laneOccupancy.get(b.fixedLane!) ?? -1, b.e));
      const bars: Array<typeof raw[number] & { lane: number; autoAssigned: boolean }> = [];
      for (const b of fixed) bars.push({ ...b, lane: b.fixedLane!, autoAssigned: false });
      for (const b of auto) {
        let lane = 0;
        while ((laneOccupancy.get(lane) ?? -1) >= b.s) lane++;
        laneOccupancy.set(lane, b.e);
        bars.push({ ...b, lane, autoAssigned: true });
      }
      const laneCount = Math.max(1, (laneOccupancy.size ? Math.max(...laneOccupancy.keys()) : 0) + 1);
      // 전역 위치 등록
      for (const b of bars) {
        const left = b.s * colW + 4;
        const w = Math.max(colW - 8, (b.e - b.s + 1) * colW - 8);
        const yc = yCursor + b.lane * laneH + laneH / 2;
        if (b.milestone) {
          const mx = b.s * colW + 4 + 4 + 6;
          pos.set(b.it.id, { x0: mx, x1: mx, yc, milestone: true });
        } else {
          pos.set(b.it.id, { x0: left, x1: left + w, yc, milestone: false });
        }
      }
      const groupTop = yCursor;
      yCursor += laneCount * laneH + 1; // +1 = border-b
      return { group: g, bars, laneCount, groupTop };
    });

    // 의존선 경로 — 직교 엘보, auto-orient 화살표
    const STUB = 14;
    const links = (data.dependencies || []).map((dep) => {
      const P = pos.get(dep.predecessorItemId);
      const S = pos.get(dep.successorItemId);
      if (!P || !S) return null;
      // 앵커: type 별 시작/끝 지점 + 진출/진입 방향
      const fromEnd = dep.type === 'FS' || dep.type === 'FF';   // 선행 끝에서 출발
      const toStart = dep.type === 'FS' || dep.type === 'SS';   // 후행 시작으로 도착
      const sx = fromEnd ? P.x1 : P.x0;
      const ex = toStart ? S.x0 : S.x1;
      const sDir = fromEnd ? 1 : -1;   // 끝→오른쪽, 시작→왼쪽
      const eDir = toStart ? 1 : -1;   // 시작에 진입 → 오른쪽 이동, 끝에 진입 → 왼쪽 이동
      const sy = P.yc, ey = S.yc;
      const p1x = sx + sDir * STUB;
      const p3x = ex - eDir * STUB;
      const mx = (p1x + p3x) / 2;
      const pts = [
        [sx, sy], [p1x, sy], [mx, sy], [mx, ey], [p3x, ey], [ex, ey],
      ];
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
      const code = `${numOf.get(dep.predecessorItemId) ?? '?'}${dep.type}`;
      return { id: dep.id, d, code, mx, my: (sy + ey) / 2 };
    }).filter(Boolean) as { id: number; d: string; code: string; mx: number; my: number }[];

    // 부모-서브아이템 family 매핑 (hover 시 family 만 강조)
    const familyMap = new Map<number, Set<number>>();
    for (const [parentId, subs] of subitemsByParent.entries()) {
      const fam = new Set<number>([parentId, ...subs.map((s) => s.id)]);
      familyMap.set(parentId, fam);
      for (const s of subs) familyMap.set(s.id, fam);
    }

    // 부모 → 서브아이템 연결선: 부모의 끝점에서 서브아이템 시작점으로 직교 L 경로.
    // 둘 다 pos 에 등록돼 있어야 (timeline/date 보유) 연결선 생김.
    const familyLinks: Array<{ id: string; d: string; parentId: number }> = [];
    for (const [parentId, subs] of subitemsByParent.entries()) {
      const P = pos.get(parentId);
      if (!P) continue;
      for (const s of subs) {
        const S = pos.get(s.id);
        if (!S) continue;
        // 부모의 우측 하단 → 서브아이템의 좌측 (다른 lane). 짧은 L 경로.
        const sx = P.x1, sy = P.yc;
        const ex = S.x0, ey = S.yc;
        const midY = (sy + ey) / 2;
        const d = `M${sx.toFixed(1)},${sy.toFixed(1)} L${sx.toFixed(1)},${midY.toFixed(1)} L${ex.toFixed(1)},${midY.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`;
        familyLinks.push({ id: `fam-${parentId}-${s.id}`, d, parentId });
      }
    }

    return { periods, groups, idx, totalH: yCursor, links, familyMap, familyLinks, pos };
  }, [data, unit, tCol, dCol, numOf, extendMonths]);

  // 자동 배정된 lane을 한 번에 백엔드 영속화 — 이후 사용자가 명시 변경하기 전까지 자동 packing 영향 없음.
  const laneSyncSigRef = useRef<string>('');
  useEffect(() => {
    if (!canEdit) return;
    const pending: Array<{ id: number; lane: number }> = [];
    for (const gl of model.groups) {
      for (const b of gl.bars) {
        if ((b as any).autoAssigned) pending.push({ id: b.it.id, lane: b.lane });
      }
    }
    if (pending.length === 0) return;
    const sig = `${board.id}:` + pending.map((p) => `${p.id}=${p.lane}`).join(',');
    if (laneSyncSigRef.current === sig) return;
    laneSyncSigRef.current = sig;
    pmApi.setItemLanes(board.id, pending).then(() => onChanged?.()).catch(() => { /* noop */ });
  }, [model, canEdit, board.id, onChanged]);

  // 작업별 predecessor 코드 (막대 tooltip)
  const predsOf = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const dep of data.dependencies || []) {
      const arr = m.get(dep.successorItemId) ?? [];
      arr.push(`${numOf.get(dep.predecessorItemId) ?? '?'}${dep.type}`);
      m.set(dep.successorItemId, arr);
    }
    return m;
  }, [data.dependencies, numOf]);

  if (!tCol && !dCol) {
    return <div className="bg-white border border-[#E2DED4] rounded-lg p-8 text-center text-[13px] text-[#888780]">
      Timeline 뷰는 <b>timeline</b> 또는 <b>date</b> 타입 컬럼이 필요합니다. Table 뷰에서 컬럼을 추가하세요.
    </div>;
  }

  const todayKey = periodKey(new Date(), unit);
  const todayIdx = model.periods.findIndex((p) => p.key === todayKey);

  const addDep = async () => {
    const pred = Number(draft.pred), succ = Number(draft.succ);
    if (!pred || !succ || pred === succ || busy) return;
    setBusy(true);
    try {
      await pmApi.createDependency(board.id, { predecessorItemId: pred, successorItemId: succ, type: draft.type });
      setDraft({ pred: '', succ: '', type: 'FS' });
      onChanged?.();
    } catch { /* noop */ } finally { setBusy(false); }
  };
  const delDep = async (id: number) => {
    if (busy) return;
    setBusy(true);
    try { await pmApi.deleteDependency(id); onChanged?.(); } catch { /* noop */ } finally { setBusy(false); }
  };

  // 드래그로 일정 이동 — 가로(periods) = 시작/끝 날짜 평행 이동(기간 보존), 세로(laneDelta) = lane 변경.
  // lane은 사용자가 명시 변경 전까지 유지 — 가로만 이동 시 lane 자동 재배치 없음.
  const applyDrag = async (itemId: number, periods: number, laneDelta: number, currentLane: number) => {
    if (!canEdit || (periods === 0 && laneDelta === 0) || busy) return;
    setBusy(true);
    try {
      if (periods !== 0) {
        const tv = tCol ? cv(itemId, tCol.id) : null;
        const dv = dCol ? cv(itemId, dCol.id) : null;
        if (tv?.start && tCol) {
          const newStart = shiftStr(tv.start, periods, unit);
          const dd = diffDays(newStart, tv.start);
          const next: any = { start: newStart };
          if (tv.end) next.end = fmtDate(addDays(toDate(tv.end)!, dd));
          await pmApi.setCell(itemId, tCol.id, next);
        } else if (dv?.date && dCol) {
          await pmApi.setCell(itemId, dCol.id, { date: shiftStr(dv.date, periods, unit) });
        }
      }
      if (laneDelta !== 0) {
        const newLane = Math.max(0, currentLane + laneDelta);
        await pmApi.updateItem(itemId, { lane: newLane });
      }
      // load() 완료까지 await — 미완료 시 preview 가 사라지면서 snap-back 발생
      const r = onChanged?.() as any;
      if (r && typeof r.then === 'function') await r;
    } catch { /* noop */ } finally { setBusy(false); }
  };

  // 화살표 핸들로 길이 조절 — 시작 또는 끝 한쪽만 N칸 이동 (timeline 컬럼 전용)
  const applyResize = async (itemId: number, periods: number, mode: 'start' | 'end') => {
    if (!canEdit || periods === 0 || busy || !tCol) return;
    const tv = cv(itemId, tCol.id);
    if (!tv?.start || !tv?.end) return; // 마일스톤/단일 날짜는 리사이즈 불가
    setBusy(true);
    try {
      let newStart = tv.start as string;
      let newEnd = tv.end as string;
      if (mode === 'start') {
        newStart = shiftStr(tv.start, periods, unit);
        if (toDate(newStart)! > toDate(newEnd)!) newStart = newEnd; // end 추월 금지
      } else {
        newEnd = shiftStr(tv.end, periods, unit);
        if (toDate(newEnd)! < toDate(newStart)!) newEnd = newStart; // start 역전 금지
      }
      await pmApi.setCell(itemId, tCol.id, { start: newStart, end: newEnd });
      const r = onChanged?.() as any;
      if (r && typeof r.then === 'function') await r;
    } catch { /* noop */ } finally { setBusy(false); }
  };

  const itemOpts = data.items.filter((i) => !i.parentItemId);

  return (
    <div className="bg-white border border-[#E2DED4] rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-[#E2DED4]">
        <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em]">축 단위</span>
        {(['day', 'week', 'month', 'quarter'] as Unit[]).map((u) => (
          <button key={u} onClick={() => setUnit(u)}
            className={`px-2.5 py-1 text-[11.5px] rounded border ${unit === u ? 'bg-[#A50034] text-white border-[#A50034]' : 'bg-white text-[#5F5E5A] border-[#D3D1C7]'}`}>
            {u === 'day' ? '일' : u === 'week' ? '주' : u === 'month' ? '월' : '분기'}
          </button>
        ))}
        <label className="ml-3 flex items-center gap-1.5 text-[11.5px] text-[#5F5E5A] cursor-pointer">
          <input type="checkbox" checked={showDeps} onChange={(e) => setShowDeps(e.target.checked)} />
          의존선 ({(data.dependencies || []).length})
        </label>
        {canEdit && (
          <div className="ml-auto flex items-center gap-1.5">
            <select value={draft.pred} onChange={(e) => setDraft((d) => ({ ...d, pred: e.target.value }))}
              className="text-[11.5px] border border-[#D3D1C7] rounded px-1.5 py-1 max-w-[150px]">
              <option value="">선행 작업…</option>
              {itemOpts.map((i) => <option key={i.id} value={i.id}>{numOf.get(i.id)}. {i.name}</option>)}
            </select>
            <span className="text-[#888780] text-[11px]">→</span>
            <select value={draft.succ} onChange={(e) => setDraft((d) => ({ ...d, succ: e.target.value }))}
              className="text-[11.5px] border border-[#D3D1C7] rounded px-1.5 py-1 max-w-[150px]">
              <option value="">후행 작업…</option>
              {itemOpts.map((i) => <option key={i.id} value={i.id}>{numOf.get(i.id)}. {i.name}</option>)}
            </select>
            <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as DependencyType }))}
              title={DEP_LABEL[draft.type]}
              className="text-[11.5px] border border-[#D3D1C7] rounded px-1.5 py-1">
              {DEP_TYPES.map((t) => <option key={t} value={t}>{t} · {DEP_LABEL[t]}</option>)}
            </select>
            <button onClick={addDep} disabled={busy || !draft.pred || !draft.succ}
              title={`${draft.type} · ${DEP_LABEL[draft.type]}`}
              className="px-2.5 py-1 text-[11.5px] rounded bg-[#A50034] text-white disabled:opacity-40">의존 추가</button>
          </div>
        )}
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-1.5 bg-[#FAFAF7] border-b border-[#EFEDE6] text-[10.5px] text-[#888780]">
          <span className="font-medium text-[#5F5E5A]">의존관계:</span>
          {DEP_TYPES.map((t) => (
            <span key={t}><b className="text-[#5F5E5A]">{t}</b> {DEP_LABEL[t]}</span>
          ))}
        </div>
      )}
      <div className="overflow-auto">
        <div style={{ minWidth: labelW + model.periods.length * colW }}>
          {/* axis */}
          <div className="flex sticky top-0 bg-[#FAFAF7] border-b border-[#E2DED4] z-10">
            <div style={{ width: labelW }} className="shrink-0 border-r border-[#E2DED4]" />
            {model.periods.map((p) => (
              <div key={p.key} style={{ width: colW }}
                className={`shrink-0 text-center py-2 text-[10.5px] text-[#5F5E5A] border-r border-[#EFEDE6] ${isMajor(p.date, unit) ? 'font-semibold' : ''}`}>
                {p.label}
              </div>
            ))}
            {/* 타임라인 연장 — 연/월 추가 */}
            <div className="shrink-0 flex flex-col justify-center gap-1 px-2 py-1 border-l border-[#E2DED4]">
              <button onClick={() => setExtendMonths((m) => m + 1)} title="1개월 연장"
                className="px-2 py-0.5 text-[10.5px] leading-none rounded bg-white border border-[#D3D1C7] text-[#5F5E5A] hover:border-[#A50034] hover:text-[#A50034] whitespace-nowrap">＋ 1개월</button>
              <button onClick={() => setExtendMonths((m) => m + 12)} title="1년 연장"
                className="px-2 py-0.5 text-[10.5px] leading-none rounded bg-white border border-[#D3D1C7] text-[#5F5E5A] hover:border-[#A50034] hover:text-[#A50034] whitespace-nowrap">＋ 1년</button>
              {extendMonths > 0 && (
                <button onClick={() => setExtendMonths(0)} title="연장 초기화"
                  className="px-2 py-0.5 text-[10px] leading-none rounded text-[#888780] hover:text-[#A50034] whitespace-nowrap">초기화</button>
              )}
            </div>
          </div>
          {/* groups + 의존선 오버레이 */}
          <div className="relative">
            {model.groups.map((gl) => (
              <div key={gl.group.id} className="flex border-b border-[#E2DED4]">
                <div style={{ width: labelW, minHeight: gl.laneCount * laneH }}
                  className="shrink-0 border-r border-[#E2DED4] px-3 py-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gl.group.color || '#888780' }} />
                  <span className="font-medium text-[12px] text-[#1A1A1A]">{gl.group.name}</span>
                </div>
                <div className="relative" style={{ width: model.periods.length * colW, height: gl.laneCount * laneH }}>
                  {model.periods.map((p, i) => (
                    <div key={p.key} className={`absolute top-0 bottom-0 border-r ${isMajor(p.date, unit) ? 'border-[#D3D1C7]' : 'border-[#F2F0EA]'}`} style={{ left: i * colW, width: colW }} />
                  ))}
                  {todayIdx >= 0 && <div className="absolute top-0 bottom-0 w-px bg-[#A50034] z-10" style={{ left: todayIdx * colW + colW / 2 }} />}
                  {gl.bars.map((b) => {
                    const baseLeft = b.s * colW + 4;
                    const baseW = Math.max(colW - 8, (b.e - b.s + 1) * colW - 8);
                    const top = b.lane * laneH + 5;
                    const preds = predsOf.get(b.it.id);
                    const isDragging = drag?.itemId === b.it.id;
                    const mode = isDragging ? drag!.mode : null;
                    const unitLabel = unit === 'day' ? '일' : unit === 'week' ? '주' : unit === 'month' ? '개월' : '분기';

                    // 미리보기 위치/크기 — 모드별 클램프. lane은 move 모드에서만 변경 가능.
                    let left = baseLeft, w = baseW, dx = 0, dy = 0;
                    let previewPeriods = isDragging ? drag!.periods : 0;
                    let previewLaneDelta = isDragging && mode === 'move' ? drag!.laneDelta : 0;
                    // lane은 0 미만으로 못 내려감 (음수 lane 의미 없음)
                    if (previewLaneDelta !== 0) previewLaneDelta = Math.max(-b.lane, previewLaneDelta);
                    if (mode === 'move') {
                      dx = previewPeriods * colW;
                      dy = previewLaneDelta * laneH;
                    } else if (mode === 'start') {
                      const span = b.e - b.s; // 보존되는 칸 수 (양쪽 포함이면 span+1칸)
                      const p = Math.max(-b.s, Math.min(previewPeriods, span));
                      previewPeriods = p;
                      left = baseLeft + p * colW;
                      w = Math.max(colW - 8, baseW - p * colW);
                    } else if (mode === 'end') {
                      const span = b.e - b.s;
                      const p = Math.max(-span, previewPeriods);
                      previewPeriods = p;
                      w = Math.max(colW - 8, baseW + p * colW);
                    }

                    const sign = previewPeriods > 0 ? '+' : '';
                    const laneSign = previewLaneDelta > 0 ? '+' : '';
                    const shiftHint = isDragging && (previewPeriods !== 0 || previewLaneDelta !== 0)
                      ? (mode === 'start' ? ` (시작 ${sign}${previewPeriods}${unitLabel})`
                        : mode === 'end' ? ` (종료 ${sign}${previewPeriods}${unitLabel})`
                        : ` (${previewPeriods !== 0 ? `${sign}${previewPeriods}${unitLabel}` : ''}${previewPeriods !== 0 && previewLaneDelta !== 0 ? ', ' : ''}${previewLaneDelta !== 0 ? `차선 ${laneSign}${previewLaneDelta}` : ''})`)
                      : '';
                    const tip = `${b.it.name}${preds ? ` · 선행 ${preds.join(', ')}` : ''}${canEdit ? ' · 가로 드래그=일정 이동, 세로 드래그=차선 변경, 양 끝 화살표=길이 조절' : ''}`;

                    const startDrag = (e: React.PointerEvent, m: 'move' | 'start' | 'end') => {
                      e.preventDefault();
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      setDrag({ itemId: b.it.id, startX: e.clientX, startY: e.clientY, periods: 0, laneDelta: 0, mode: m });
                    };
                    const moveDrag = (e: React.PointerEvent) => {
                      if (drag?.itemId !== b.it.id) return;
                      const p = Math.round((e.clientX - drag.startX) / colW);
                      // 세로 드래그 deadzone — 손떨림으로 의도치 않은 lane 변경 방지
                      const dyRaw = e.clientY - drag.startY;
                      const ld = drag.mode === 'move' && Math.abs(dyRaw) >= laneH * 0.7
                        ? Math.round(dyRaw / laneH) : 0;
                      if (p !== drag.periods || ld !== drag.laneDelta) setDrag({ ...drag, periods: p, laneDelta: ld });
                    };
                    const endDrag = async () => {
                      if (drag?.itemId !== b.it.id) return;
                      const p = drag.periods, m = drag.mode;
                      const ld = m === 'move' ? Math.max(-b.lane, drag.laneDelta) : 0;
                      // 이동 0 인 단순 클릭(move 모드) → 상세 패널 열기 (드래그 진입점과 분리)
                      if (p === 0 && ld === 0 && m === 'move') {
                        setDrag(null);
                        onOpenItem?.(b.it.id);
                        return;
                      }
                      // setDrag(null) 즉시 호출 시 preview transform 0 으로 돌아가 'snap-back → 새 위치'
                      // 시각 글리치 발생. applyDrag/Resize 가 load() 완료까지 await 하므로 그 후에
                      // setDrag(null) 하면 새 위치와 자연스럽게 이어짐.
                      if (m === 'move') await applyDrag(b.it.id, p, ld, b.lane);
                      else await applyResize(b.it.id, p, m);
                      setDrag(null);
                    };

                    const moveProps = canEdit ? {
                      onPointerDown: (e: React.PointerEvent) => startDrag(e, 'move'),
                      onPointerMove: moveDrag,
                      onPointerUp: endDrag,
                    } : {};
                    const dragCls = canEdit ? 'cursor-grab active:cursor-grabbing select-none touch-none' : '';

                    const isSub = (b as any).isSub === true;
                    const labelPrefix = isSub ? '↳ ' : '';
                    // hover: family 가 있으면 family 전체, 없으면 자기 자신만. 다른 아이템은 fade out.
                    const activeFamily = hoverItemId != null
                      ? (model.familyMap.get(hoverItemId) ?? new Set<number>([hoverItemId]))
                      : null;
                    const inFamily = !!activeFamily && activeFamily.has(b.it.id);
                    const dimmed = !!activeFamily && !inFamily;
                    // 모든 아이템에 hover 핸들러 부착 — 단일 아이템도 자기 자신을 강조
                    const familyHoverHandlers = {
                      onMouseEnter: () => setHoverItemId(b.it.id),
                      onMouseLeave: () => setHoverItemId((cur) => cur === b.it.id ? null : cur),
                    };
                    if (b.milestone) {
                      // 마일스톤은 길이 조절 불가 — 이동만 허용
                      const msTransform = `translate(${dx}px, ${dy}px)${inFamily ? ' scale(1.25)' : ''}`;
                      return <div key={b.it.id} data-pm-bar-itemid={b.it.id} title={tip} {...moveProps} {...familyHoverHandlers}
                        className={`absolute transition-all duration-150 ${dragCls} ${inFamily ? 'drop-shadow-[0_0_4px_rgba(165,0,52,0.6)]' : ''}`}
                        style={{ left: baseLeft + 4, top: top + 2, transform: msTransform, zIndex: isDragging || inFamily ? 20 : undefined, opacity: dimmed ? 0.18 : 1 }}>
                        <div className={`${isSub ? 'w-2 h-2' : 'w-3 h-3'} bg-[#A50034] rotate-45 ${isSub ? 'opacity-70' : ''} ${isDragging ? 'ring-2 ring-[#A50034]/40' : ''}`} />
                        <span className={`absolute ${isSub ? 'left-4' : 'left-5'} top-0 whitespace-nowrap text-[10.5px] font-medium ${isSub ? 'text-[#5F5E5A]' : 'text-[#1A1A1A]'}`}
                          style={{ textShadow: '0 1px 2px rgba(255,255,255,.85)' }}>{labelPrefix}{b.it.name}{shiftHint}</span>
                      </div>;
                    }
                    // 서브아이템은 더 옅게(opacity) + 가는 막대로 시각 구분
                    const barColor = gl.group.color || '#4A4A48';
                    const txt = pickText(barColor);
                    const tvCheck = tCol ? cv(b.it.id, tCol.id) : null;
                    const canResize = canEdit && !!tvCheck?.start && !!tvCheck?.end;

                    const subBarH = laneH - 16;
                    const baseOpacity = dimmed ? 0.18 : (isSub ? 0.85 : 1);
                    const ringCls = inFamily
                      ? 'ring-2 ring-[#A50034] shadow-[0_2px_8px_rgba(165,0,52,0.45)]'
                      : (isDragging ? 'ring-2 ring-[#A50034]/50' : '');
                    return (
                      <div key={b.it.id} data-pm-bar-itemid={b.it.id} title={tip} {...moveProps} {...familyHoverHandlers}
                        className={`absolute rounded text-[10.5px] font-medium flex items-center overflow-hidden transition-all duration-150 ${dragCls} ${ringCls}`}
                        style={{ left, width: w, top: isSub ? top + 3 : top, height: isSub ? subBarH : laneH - 10, backgroundColor: barColor, color: txt.color, transform: `translate(${dx}px, ${dy}px)`, zIndex: isDragging || inFamily ? 20 : undefined, opacity: baseOpacity }}>
                        {canResize && (
                          <button
                            type="button"
                            title="시작 일정 조절"
                            onPointerDown={(e) => startDrag(e, 'start')}
                            onPointerMove={moveDrag}
                            onPointerUp={endDrag}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize hover:bg-black/15"
                            style={{ color: txt.color, textShadow: txt.shadow }}
                          >◀</button>
                        )}
                        <span className="truncate px-2" style={{ textShadow: txt.shadow, marginLeft: canResize ? 10 : 0, marginRight: canResize ? 10 : 0 }}>{labelPrefix}{b.it.name}{shiftHint}</span>
                        {canResize && (
                          <button
                            type="button"
                            title="종료 일정 조절"
                            onPointerDown={(e) => startDrag(e, 'end')}
                            onPointerMove={moveDrag}
                            onPointerUp={endDrag}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize hover:bg-black/15"
                            style={{ color: txt.color, textShadow: txt.shadow }}
                          >▶</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {showDeps && model.links.length > 0 && (
              <svg
                className="absolute top-0 pointer-events-none"
                style={{ left: labelW, width: model.periods.length * colW, height: model.totalH }}
                width={model.periods.length * colW} height={model.totalH}>
                <defs>
                  <marker id="pm-dep-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,0 L8,4 L0,8 z" fill="#9A6FB0" />
                  </marker>
                </defs>
                {model.links.map((ln) => (
                  <g key={ln.id} className={canEdit ? 'pointer-events-auto cursor-pointer group' : ''}
                    onClick={canEdit ? () => { if (confirm(`의존관계 ${ln.code} 를 삭제할까요?`)) delDep(ln.id); } : undefined}>
                    {canEdit && <path d={ln.d} fill="none" stroke="transparent" strokeWidth={10} />}
                    <path d={ln.d} fill="none" stroke="#9A6FB0" strokeWidth={1.5}
                      markerEnd="url(#pm-dep-arrow)" className={canEdit ? 'group-hover:stroke-[#A50034]' : ''} />
                  </g>
                ))}
              </svg>
            )}
            {model.familyLinks.length > 0 && (() => {
              const activeFamily = hoverItemId != null ? model.familyMap.get(hoverItemId) ?? null : null;
              return (
                <svg
                  className="absolute top-0 pointer-events-none"
                  style={{ left: labelW, width: model.periods.length * colW, height: model.totalH }}
                  width={model.periods.length * colW} height={model.totalH}>
                  {model.familyLinks.map((fl) => {
                    const inFamily = activeFamily?.has(fl.parentId);
                    const dim = activeFamily && !inFamily;
                    return (
                      <path key={fl.id} d={fl.d} fill="none"
                        stroke={inFamily ? '#A50034' : '#888780'}
                        strokeWidth={inFamily ? 1.6 : 1}
                        strokeDasharray="3,3"
                        opacity={dim ? 0.12 : (inFamily ? 0.95 : 0.55)}
                        style={{ transition: 'opacity .15s, stroke .15s, stroke-width .15s' }} />
                    );
                  })}
                </svg>
              );
            })()}
            {/* 의존선 drag-to-create (REQ-14): 막대 우측 끝의 작은 핸들. 드래그하면 다른 막대에 떨어뜨려 FS 의존 생성 */}
            {canEdit && (
              <div ref={trackRef} className="absolute top-0 pointer-events-none"
                style={{ left: labelW, width: model.periods.length * colW, height: model.totalH }}>
                {Array.from(model.pos.entries()).map(([itemId, p]) => {
                  // 호버 중인 막대 또는 linkDrag 진행 중이면 노출 (다른 막대 위에 떨어뜨릴 위치 표시 위해)
                  const visible = hoverItemId === itemId || linkDrag !== null;
                  return (
                    <button
                      key={`link-${itemId}`}
                      title="클릭: 다음 아이템 추가 · 드래그: 의존선 생성 (다른 막대에 놓기)"
                      onMouseEnter={() => setHoverItemId(itemId)}
                      onMouseDown={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        setLinkDrag({ sourceId: itemId, sx: p.x1, sy: p.yc, sx0: e.clientX, sy0: e.clientY, mx: e.clientX, my: e.clientY });
                      }}
                      className="absolute pointer-events-auto w-3 h-3 rounded-full bg-[#9A6FB0] hover:bg-[#A50034] hover:scale-125 ring-2 ring-white transition-all cursor-crosshair"
                      style={{ left: p.x1 - 6, top: p.yc - 6, zIndex: 25, opacity: visible ? 1 : 0 }}
                    />
                  );
                })}
              </div>
            )}
            {/* 호버 시 편집/삭제 팝업 — 막대 바로 아래 위치, 호버 유지 위해 pointer-events-auto */}
            {hoverItemId != null && !linkDrag && (() => {
              const p = model.pos.get(hoverItemId);
              const it = data.items.find((i) => i.id === hoverItemId);
              if (!p || !it) return null;
              const cx = (p.x0 + p.x1) / 2;
              const cy = p.yc + 16; // 막대 아래
              return (
                <div className="absolute pointer-events-auto bg-white border border-[#E2DED4] rounded-md shadow-lg flex items-center gap-0.5 px-1 py-0.5 z-40"
                  style={{ left: labelW + cx - 60, top: cy }}
                  onMouseEnter={() => setHoverItemId(hoverItemId)}
                  onMouseLeave={() => setHoverItemId(null)}>
                  <span className="px-1.5 text-[10.5px] text-[#888780] truncate max-w-[140px]" title={it.name}>{it.name}</span>
                  <button onClick={() => { onOpenItem?.(it.id); setHoverItemId(null); }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[#5F5E5A] hover:text-[#A50034] hover:bg-[#FAFAF7] rounded">
                    <Pencil size={11} /> 편집
                  </button>
                  {canEdit && (
                    <button onClick={async () => {
                      if (!confirm(`'${it.name}' 을(를) 삭제할까요?`)) return;
                      try { await pmApi.deleteItem(it.id); const r = onChanged?.() as any; if (r && typeof r.then === 'function') await r; } catch {}
                      setHoverItemId(null);
                    }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[#888780] hover:text-[#A50034] hover:bg-[#FAEAE7] rounded">
                      <Trash2 size={11} /> 삭제
                    </button>
                  )}
                </div>
              );
            })()}
            {/* drag ghost line — linkDrag 진행 중에만 */}
            {linkDrag && trackRef.current && (() => {
              const rect = trackRef.current.getBoundingClientRect();
              const ex = linkDrag.mx - rect.left;
              const ey = linkDrag.my - rect.top;
              return (
                <svg className="absolute top-0 pointer-events-none z-30"
                  style={{ left: labelW, width: model.periods.length * colW, height: model.totalH }}>
                  <line x1={linkDrag.sx} y1={linkDrag.sy} x2={ex} y2={ey}
                    stroke="#A50034" strokeWidth={1.8} strokeDasharray="5,4" />
                  <circle cx={ex} cy={ey} r={4} fill="#A50034" />
                </svg>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
