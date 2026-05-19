// ARGOS Projects — 단일 슬라이드 LG 포맷 PPTX Export (spec v2.1 §11).
// 원칙: 항상 1장(16:9). 모든 그룹·아이템·기간을 누락 없이 표시.
// 분량 증가 시 행 높이·폰트 자동 축소(Auto-Fit). 페이지 분할 없음.
import PptxGenJS from 'pptxgenjs';

type Cell = { itemId: number; columnId: number; value: any };
type Col = { id: number; name: string; type: string; settings?: any };
type Group = { id: number; name: string; color?: string | null };
type Item = { id: number; groupId: number; name: string };
type BoardData = {
  board: { id: number; name: string; reportCycle?: string | null };
  groups: Group[]; columns: Col[]; items: Item[]; cells: Cell[]; views: any[];
};

export interface PmExportOptions {
  view?: 'timeline' | 'table';
  axis_unit?: 'week' | 'month' | 'quarter';
  focus_period?: string;
  conclusion?: string;
  confidentiality?: 'internal' | 'confidential' | 'strict';
  title?: string; org?: string; date?: string;
}

// ── LG 포맷 토큰 (§11.6) ──
const LG_RED = 'A50034';
const INK = '2C2C2A';
const SUBINK = '5F5E5A';
const GRID = 'D9D5CD';
const FONT = 'Calibri';
const BAR = {
  prep_offsite: { fill: 'FFFFFF', line: '3F8C6E', text: '1F5C42' },
  pre_response: { fill: 'D9D5CD', line: 'B8B4AA', text: '4A483F' },
  core:         { fill: '4A4A48', line: '2C2C2A', text: 'FFFFFF' },
  onsite:       { fill: 'FFFFFF', line: 'A0A0A0', text: '5F5E5A' },
};

// 슬라이드 13.333 × 7.5 in. 영역 분할 §11.2
const SLIDE_W = 13.333, SLIDE_H = 7.5;
const M = 0.16;                    // 상/하 여백
const TITLE_H = 0.50, AXIS_H = 0.52, LEGEND_H = 0.24, FOOTER_H = 0.22;
const GROUP_LABEL_W = 1.7;         // 좌측 그룹 라벨 컬럼
const TRACK_X = M + GROUP_LABEL_W;
const TRACK_W = SLIDE_W - TRACK_X - M; // ≈ 11.0"
const CONTENT_TOP = M + TITLE_H + AXIS_H;
const CONTENT_H = SLIDE_H - CONTENT_TOP - LEGEND_H - FOOTER_H - M; // ≈ 5.66"

function cellMap(cells: Cell[]) {
  const m = new Map<string, any>();
  for (const c of cells) m.set(`${c.itemId}:${c.columnId}`, c.value);
  return m;
}
function pad(n: number) { return String(n).padStart(2, '0'); }
function toDate(s?: string | null): Date | null {
  if (!s || typeof s !== 'string') return null;
  const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d;
}
function fmtPeriod(d: Date, unit: string): string {
  const y = d.getFullYear();
  if (unit === 'quarter') return `${y} Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (unit === 'week') {
    const jan1 = new Date(y, 0, 1);
    const w = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} (W${w})`;
  }
  return `${y}.${pad(d.getMonth() + 1)}`; // month
}
function periodKey(d: Date, unit: string): string {
  const y = d.getFullYear();
  if (unit === 'quarter') return `${y}Q${Math.floor(d.getMonth() / 3) + 1}`;
  if (unit === 'week') {
    const jan1 = new Date(y, 0, 1);
    const w = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${y}W${pad(w)}`;
  }
  return `${y}M${pad(d.getMonth() + 1)}`;
}
function stepDate(d: Date, unit: string): Date {
  const n = new Date(d);
  if (unit === 'quarter') n.setMonth(n.getMonth() + 3);
  else if (unit === 'week') n.setDate(n.getDate() + 7);
  else n.setMonth(n.getMonth() + 1);
  return n;
}

function fontForLaneH(h: number): number {
  if (h >= 0.34) return 9;
  if (h >= 0.26) return 8;
  if (h >= 0.20) return 7;
  if (h >= 0.16) return 6;
  return 5.5;
}
function densityGrade(L: number): string {
  if (L <= 14) return '쾌적';
  if (L <= 22) return '조밀';
  if (L <= 32) return '한계';
  return '경고';
}

export async function exportBoardPptx(
  data: BoardData, projectName: string, opts: PmExportOptions,
): Promise<{ buffer: Buffer; filename: string; meta: any }> {
  const pptx = new PptxGenJS();
  (pptx as any).defineLayout({ name: 'PM16x9', width: SLIDE_W, height: SLIDE_H });
  (pptx as any).layout = 'PM16x9';
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };

  const view = opts.view === 'table' ? 'table' : 'timeline';
  const unit = opts.axis_unit || (data.board.reportCycle && data.board.reportCycle !== 'none'
    ? data.board.reportCycle : 'month') as string;
  const cmap = cellMap(data.cells);
  const timelineCol = data.columns.find((c) => c.type === 'timeline');

  // ── 제목 영역 ──
  slide.addShape('rect', { x: M, y: M, w: 0.10, h: TITLE_H, fill: { color: LG_RED } });
  slide.addText(
    [
      { text: `${projectName}  `, options: { bold: true, fontSize: 17, color: INK } },
      { text: `▸ ${data.board.name}`, options: { fontSize: 13, color: SUBINK } },
    ],
    { x: M + 0.18, y: M, w: SLIDE_W - 2 * M - 1.2, h: TITLE_H, fontFace: FONT, valign: 'middle' },
  );
  slide.addText('1 / 1', {
    x: SLIDE_W - M - 1.0, y: M, w: 1.0, h: TITLE_H, align: 'right', valign: 'middle',
    fontFace: FONT, fontSize: 10, color: SUBINK,
  });

  let warning: string | undefined;
  let laneTotal = 0;

  if (view === 'timeline' && timelineCol) {
    // 날짜 범위 산출
    let minD: Date | null = null, maxD: Date | null = null;
    for (const it of data.items) {
      const v = cmap.get(`${it.id}:${timelineCol.id}`);
      const s = toDate(v?.start), e = toDate(v?.end);
      if (s && (!minD || s < minD)) minD = s;
      if (e && (!maxD || e > maxD)) maxD = e;
    }
    if (!minD || !maxD) { minD = new Date(); maxD = stepDate(new Date(), unit); }

    // 기간 컬럼 생성
    const periods: { key: string; label: string }[] = [];
    let cur = new Date(minD);
    for (let g = 0; g < 200 && cur <= maxD!; g++) {
      periods.push({ key: periodKey(cur, unit), label: fmtPeriod(cur, unit) });
      cur = stepDate(cur, unit);
    }
    if (periods.length === 0) periods.push({ key: periodKey(minD, unit), label: fmtPeriod(minD, unit) });
    const colW = TRACK_W / periods.length;
    const idxOf = (d: Date) => {
      const k = periodKey(d, unit);
      const i = periods.findIndex((p) => p.key === k);
      return i < 0 ? 0 : i;
    };

    // 시간축 헤더
    periods.forEach((p, i) => {
      slide.addShape('rect', {
        x: TRACK_X + i * colW, y: M + TITLE_H, w: colW, h: AXIS_H,
        fill: { color: i % 2 ? 'F4F2EC' : 'FAFAF7' }, line: { color: GRID, width: 0.5 },
      });
      slide.addText(p.label, {
        x: TRACK_X + i * colW, y: M + TITLE_H, w: colW, h: AXIS_H,
        align: 'center', valign: 'middle', fontFace: FONT, fontSize: 7.5, color: SUBINK,
      });
    });

    // lane-packing — 그룹별
    type Lane = { item: Item; s: number; e: number; lane: number };
    const groupLanes: { group: Group; lanes: Lane[]; laneCount: number }[] = [];
    for (const g of data.groups) {
      const gItems = data.items.filter((it) => it.groupId === g.id);
      const placed: Lane[] = [];
      const laneEnd: number[] = [];
      for (const it of gItems.sort((a, b) => {
        const va = cmap.get(`${a.id}:${timelineCol.id}`); const vb = cmap.get(`${b.id}:${timelineCol.id}`);
        return (toDate(va?.start)?.getTime() ?? 0) - (toDate(vb?.start)?.getTime() ?? 0);
      })) {
        const v = cmap.get(`${it.id}:${timelineCol.id}`);
        const sd = toDate(v?.start), ed = toDate(v?.end);
        const s = sd ? idxOf(sd) : 0;
        const e = ed ? idxOf(ed) : s;
        let lane = 0;
        while (lane < laneEnd.length && (laneEnd[lane] ?? -1) >= s) lane++;
        laneEnd[lane] = e;
        placed.push({ item: it, s, e, lane });
      }
      groupLanes.push({ group: g, lanes: placed, laneCount: Math.max(1, laneEnd.length) });
    }
    laneTotal = groupLanes.reduce((a, x) => a + x.laneCount, 0) || 1;
    const laneH = CONTENT_H / laneTotal;
    const fpt = fontForLaneH(laneH);
    if (laneH < 0.16) warning = '내용 과다 — 보드 분할 또는 포커스 기간 권장';

    // 렌더
    let y = CONTENT_TOP;
    for (const gl of groupLanes) {
      const gH = gl.laneCount * laneH;
      slide.addShape('rect', { x: M, y, w: GROUP_LABEL_W, h: gH,
        fill: { color: gl.group.color ? gl.group.color.replace('#', '') : 'F0EEE8' }, line: { color: GRID, width: 0.5 } });
      slide.addText(gl.group.name, {
        x: M + 0.04, y, w: GROUP_LABEL_W - 0.08, h: gH, valign: 'middle',
        fontFace: FONT, fontSize: Math.min(8.5, fpt + 1), color: INK, bold: true,
      });
      // period grid
      periods.forEach((_, i) => {
        slide.addShape('rect', { x: TRACK_X + i * colW, y, w: colW, h: gH,
          fill: { color: 'FFFFFF' }, line: { color: GRID, width: 0.25 } });
      });
      for (const ln of gl.lanes) {
        const v = cmap.get(`${ln.item.id}:${timelineCol.id}`);
        const isMilestone = !v?.start || !v?.end || ln.s === ln.e;
        const bx = TRACK_X + ln.s * colW;
        const bw = Math.max(colW * 0.6, (ln.e - ln.s + 1) * colW);
        const by = y + ln.lane * laneH + laneH * 0.12;
        const bh = laneH * 0.76;
        const style = isMilestone ? BAR.onsite : BAR.core;
        slide.addShape('rect', {
          x: bx, y: by, w: Math.min(bw, SLIDE_W - M - bx), h: bh,
          fill: { color: style.fill }, line: { color: style.line, width: 0.75 }, rectRadius: 0.02,
        });
        slide.addText(ln.item.name, {
          x: bx + 0.03, y: by, w: Math.min(bw, SLIDE_W - M - bx) - 0.06, h: bh,
          valign: 'middle', fontFace: FONT, fontSize: fpt, color: style.text,
          wrap: true, shrinkText: true,
        });
      }
      y += gH;
    }
  } else {
    // ── Table 뷰 1장 (Auto-Fit 행 높이/폰트) ──
    const cols = data.columns.slice(0, 8);
    const rowsTotal = data.items.length || 1;
    laneTotal = rowsTotal;
    const headerH = 0.30;
    const rowH = Math.max(0.12, (CONTENT_H + AXIS_H - headerH) / rowsTotal);
    const fpt = fontForLaneH(rowH);
    if (rowH < 0.16) warning = '내용 과다 — 보드 분할 권장';
    const nameW = 2.6;
    const colW = (SLIDE_W - 2 * M - nameW) / Math.max(1, cols.length);
    let ty = M + TITLE_H;
    // header
    slide.addShape('rect', { x: M, y: ty, w: nameW, h: headerH, fill: { color: '2C2C2A' } });
    slide.addText('아이템', { x: M, y: ty, w: nameW, h: headerH, valign: 'middle', align: 'center', fontFace: FONT, fontSize: 8, color: 'FFFFFF', bold: true });
    cols.forEach((c, i) => {
      slide.addShape('rect', { x: M + nameW + i * colW, y: ty, w: colW, h: headerH, fill: { color: '2C2C2A' } });
      slide.addText(c.name, { x: M + nameW + i * colW, y: ty, w: colW, h: headerH, valign: 'middle', align: 'center', fontFace: FONT, fontSize: 8, color: 'FFFFFF', bold: true });
    });
    ty += headerH;
    const groupName = new Map(data.groups.map((g) => [g.id, g.name]));
    data.items.forEach((it, ri) => {
      const bg = ri % 2 ? 'FAFAF7' : 'FFFFFF';
      slide.addShape('rect', { x: M, y: ty, w: nameW, h: rowH, fill: { color: bg }, line: { color: GRID, width: 0.25 } });
      slide.addText(`${groupName.get(it.groupId) ? `[${groupName.get(it.groupId)}] ` : ''}${it.name}`, {
        x: M + 0.03, y: ty, w: nameW - 0.06, h: rowH, valign: 'middle', fontFace: FONT, fontSize: fpt, color: INK, wrap: true, shrinkText: true,
      });
      cols.forEach((c, ci) => {
        const v = cmap.get(`${it.id}:${c.id}`);
        slide.addShape('rect', { x: M + nameW + ci * colW, y: ty, w: colW, h: rowH, fill: { color: bg }, line: { color: GRID, width: 0.25 } });
        slide.addText(renderCellText(c, v), {
          x: M + nameW + ci * colW + 0.02, y: ty, w: colW - 0.04, h: rowH,
          valign: 'middle', align: 'center', fontFace: FONT, fontSize: fpt, color: SUBINK, wrap: true, shrinkText: true,
        });
      });
      ty += rowH;
    });
  }

  // ── 범례 + 각주 ──
  const legendY = SLIDE_H - M - FOOTER_H - LEGEND_H;
  slide.addText(
    view === 'timeline'
      ? '범례: (진행) 진회색 바 · (마일스톤) 흰 테두리 마커  ·  축 단위: ' + unit
      : '범례: status/우선순위는 라벨 텍스트로 표기',
    { x: M, y: legendY, w: SLIDE_W - 2 * M, h: LEGEND_H, fontFace: FONT, fontSize: 7, color: SUBINK, valign: 'middle' },
  );
  if (opts.conclusion) {
    slide.addText(opts.conclusion, {
      x: M, y: M + TITLE_H, w: SLIDE_W - 2 * M, h: 0.30,
      fill: { color: 'F0EEE8' }, fontFace: FONT, fontSize: 8.5, color: INK, italic: true, valign: 'middle',
    });
  }

  // ── 푸터 ──
  const conf = opts.confidentiality || 'internal';
  slide.addText(
    `${opts.org || 'LG · 로보틱스연구기획팀'}    ·    기밀등급: ${conf === 'strict' ? '대외비(엄격)' : conf === 'confidential' ? '대외비' : '내부'}`,
    { x: M, y: SLIDE_H - M - FOOTER_H, w: SLIDE_W - 2 * M, h: FOOTER_H, fontFace: FONT, fontSize: 7, color: SUBINK, align: 'center', valign: 'middle' },
  );

  const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  const ymd = (opts.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const safe = (s: string) => s.replace(/[^\w가-힣]+/g, '_').slice(0, 40);
  const filename = `${safe(projectName)}_${safe(data.board.name)}_${ymd}.pptx`;
  const meta = { density_grade: densityGrade(laneTotal), lane_total: laneTotal, ...(warning ? { warning } : {}) };
  return { buffer, filename, meta };
}

function renderCellText(col: Col, value: any): string {
  if (value == null) return '';
  switch (col.type) {
    case 'text': case 'long_text': return String(value.text ?? '');
    case 'status': case 'priority': {
      const labels = col.settings?.labels || [];
      const l = labels.find((x: any) => x.id === value.label_id);
      return l?.name ?? '';
    }
    case 'dropdown': {
      const opts = col.settings?.options || [];
      return (value.option_ids || []).map((id: number) => opts.find((o: any) => o.id === id)?.name).filter(Boolean).join(', ');
    }
    case 'date': return String(value.date ?? '');
    case 'timeline': return value.start && value.end ? `${value.start} ~ ${value.end}` : '';
    case 'number': {
      const u = col.settings?.unit ? ` ${col.settings.unit}` : '';
      return value.number != null ? `${value.number}${u}` : '';
    }
    case 'checkbox': return value.checked ? '✔' : '';
    case 'progress': return value.percent != null ? `${value.percent}%` : '';
    case 'reliability': return value.grade ? `[${value.grade}]` : '';
    case 'person': return (value.user_ids || []).length ? `${value.user_ids.length}명` : '';
    case 'link': return String(value.text || value.url || '');
    default: return '';
  }
}
