import type pptxgen from 'pptxgenjs';
import type {
  DashboardSummary,
  CompetitiveOverlayResult,
  OverlayRobotData,
  CompetitiveAlertRecord,
} from '@/types/war-room';

// ── Color constants (LG executive style) ──
const C = {
  black: '111111',
  darkGray: '333333',
  gray: '64748B',
  lightGray: '94A3B8',
  border: 'E2E8F0',
  bgLight: 'F8FAFC',
  bgLighter: 'F1F5F9',
  white: 'FFFFFF',
  lgRed: 'A50034',
  gapRed: 'FECACA',
  cloidBg: 'FFF5F5',
  headerBg: '1A1A1A',
};

const FONT = 'Calibri';

// ── PoC / RFM factor keys & Korean labels ──
const POC_KEYS = [
  'payloadScore',
  'operationTimeScore',
  'fingerDofScore',
  'formFactorScore',
  'pocDeploymentScore',
  'costEfficiencyScore',
] as const;

const RFM_KEYS = [
  'generalityScore',
  'realWorldDataScore',
  'edgeInferenceScore',
  'multiRobotCollabScore',
  'openSourceScore',
  'commercialMaturityScore',
] as const;

const POC_LABELS: Record<string, string> = {
  payloadScore: '가반하중',
  operationTimeScore: '연속동작',
  fingerDofScore: '손DOF',
  formFactorScore: '폼팩터',
  pocDeploymentScore: '배치실적',
  costEfficiencyScore: '비용효율',
};

const RFM_LABELS: Record<string, string> = {
  generalityScore: '범용성',
  realWorldDataScore: '실데이터',
  edgeInferenceScore: '엣지추론',
  multiRobotCollabScore: '다중협업',
  openSourceScore: '오픈소스',
  commercialMaturityScore: '상용성숙',
};

// ── Helpers ──

function pocTotal(scores: Record<string, number>): number {
  return POC_KEYS.reduce((sum, k) => sum + (scores[k] ?? 0), 0);
}

function rfmTotal(scores: Record<string, number>): number {
  return RFM_KEYS.reduce((sum, k) => sum + (scores[k] ?? 0), 0);
}

function getStrongestAxis(pocScores: Record<string, number>, rfmScores: Record<string, number>): string {
  let best = { key: '', val: 0 };
  for (const k of POC_KEYS) {
    const v = pocScores[k] ?? 0;
    if (v > best.val) best = { key: k, val: v };
  }
  for (const k of RFM_KEYS) {
    const v = rfmScores[k] ?? 0;
    if (v > best.val) best = { key: k, val: v };
  }
  return (POC_LABELS[best.key] || RFM_LABELS[best.key] || '-') + ' ' + best.val;
}

function formatDate(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function truncName(name: string, max = 10): string {
  return name.length > max ? name.slice(0, max) + '..' : name;
}

// ── Main export function ──

export interface PptExportData {
  dashboard: DashboardSummary;
  overlay: CompetitiveOverlayResult;
  alerts: CompetitiveAlertRecord[];
}

export async function generateOneSheet(data: PptExportData): Promise<void> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5

  const slide = pres.addSlide();

  // ── 3.1 Title area ──
  addTitleArea(slide);

  // ── 3.2 KPI bar ──
  addKpiBar(slide, data.dashboard);

  // ── 3.3 12-Factor GAP table ──
  addGapTable(slide, data.overlay);

  // ── 3.4 Recent alerts ──
  addAlerts(slide, data.alerts);

  // ── 3.5 Footer ──
  addFooter(slide);

  // Download
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  await pres.writeFile({ fileName: `CLOiD_경쟁력_브리프_${today}.pptx` });
}

// ── 3.1 Title Area (y: 0 ~ 0.7") ──

function addTitleArea(slide: pptxgen.Slide) {
  // LG Red left bar
  slide.addShape('rect' as any, {
    x: 0, y: 0.15, w: 0.08, h: 0.45,
    fill: { color: C.lgRed },
  });

  // Title
  slide.addText('휴머노이드 로봇 경쟁력 현황 — CLOiD 포지셔닝 브리프', {
    x: 0.3, y: 0.18, w: 9, h: 0.35,
    fontSize: 22, bold: true, color: C.black,
    fontFace: FONT,
  });

  // Date + team
  slide.addText(`${formatDate()} 기준 | 로보틱스연구기획팀`, {
    x: 0.3, y: 0.50, w: 5, h: 0.2,
    fontSize: 10, color: C.lightGray,
    fontFace: FONT,
  });
}

// ── 3.2 KPI Bar (y: 0.75 ~ 1.25") ──

function addKpiBar(slide: pptxgen.Slide, dashboard: DashboardSummary) {
  const pos = dashboard.lgPositioning;
  const totalRobots = pos?.totalRobots ?? 0;
  const overallRank = pos?.overallRank ?? 0;
  const percentile = totalRobots > 0 ? Math.round((overallRank / totalRobots) * 100) : 0;
  const poc = pos?.pocTotal ?? 0;
  const rfm = pos?.rfmTotal ?? 0;

  // Find strongest axis from positioning data
  const strongestLabel = pos ? '—' : '—';

  const kpis = [
    { label: '종합 순위', value: `${overallRank}위/${totalRobots}`, sub: `상위 ${percentile}%`, isWeak: percentile > 50 },
    { label: 'PoC 점수', value: `${poc}`, sub: ``, isWeak: false },
    { label: 'RFM 점수', value: `${rfm}`, sub: ``, isWeak: false },
    { label: '종합 점수', value: `${pos?.combinedScore ?? 0}`, sub: '', isWeak: false },
  ];

  const startX = 0.3;
  const cardW = 2.95;
  const cardH = 0.45;
  const gap = 0.15;

  kpis.forEach((kpi, i) => {
    const x = startX + i * (cardW + gap);
    const y = 0.78;

    // Card background
    slide.addShape('rect' as any, {
      x, y, w: cardW, h: cardH,
      fill: { color: C.bgLight },
      line: { color: C.border, width: 1 },
      rectRadius: 0.04,
    });

    // Label
    slide.addText(kpi.label, {
      x: x + 0.12, y: y + 0.04, w: 1.2, h: 0.18,
      fontSize: 9, color: C.gray, fontFace: FONT,
    });

    // Value
    slide.addText(kpi.value, {
      x: x + 1.2, y: y + 0.02, w: 1.5, h: 0.25,
      fontSize: 18, bold: true,
      color: kpi.isWeak ? C.lgRed : C.black,
      fontFace: FONT, align: 'right',
    });

    // Sub text
    if (kpi.sub) {
      slide.addText(kpi.sub, {
        x: x + 1.2, y: y + 0.26, w: 1.5, h: 0.15,
        fontSize: 8, color: C.lightGray, fontFace: FONT, align: 'right',
      });
    }
  });
}

// ── 3.3 12-Factor GAP Table (y: 1.35 ~ 4.8") ──

function addGapTable(slide: pptxgen.Slide, overlay: CompetitiveOverlayResult) {
  // Section header
  slide.addText('12-Factor 경쟁력 GAP 분석', {
    x: 0.3, y: 1.35, w: 6, h: 0.25,
    fontSize: 16, bold: true, color: C.black, fontFace: FONT,
  });

  // Build robot list: top 5 by combined score + CLOiD
  const allRobots = [...(overlay.top5Data || [])];
  const lgData = overlay.lgData;

  // Sort by combined score descending
  allRobots.sort((a, b) => b.combinedScore - a.combinedScore);
  const top5 = allRobots.slice(0, 5);

  // Check if CLOiD is already in top 5
  const lgInTop5 = lgData && top5.some(r => r.robotId === lgData.robotId);
  const displayRobots: OverlayRobotData[] = lgInTop5 ? top5 : [...top5, ...(lgData ? [lgData] : [])];

  // Compute top 5 averages for GAP highlight
  const topAvg: Record<string, number> = {};
  for (const k of [...POC_KEYS, ...RFM_KEYS]) {
    const vals = top5.map(r => {
      const scores = POC_KEYS.includes(k as any) ? r.pocScores : r.rfmScores;
      return scores[k] ?? 0;
    });
    topAvg[k] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  // Build table
  // Header row: Robot | 6 PoC factors | PoC합 | 6 RFM factors | RFM합
  const headerLabels = [
    '로봇',
    ...POC_KEYS.map(k => POC_LABELS[k]!),
    'PoC합',
    ...RFM_KEYS.map(k => RFM_LABELS[k]!),
    'RFM합',
  ];

  const headerRow: pptxgen.TableCell[] = headerLabels.map((label, i) => ({
    text: label,
    options: {
      fontSize: 8,
      bold: true,
      color: C.white,
      fill: { color: C.headerBg },
      fontFace: FONT,
      align: i === 0 ? ('left' as const) : ('center' as const),
      valign: 'middle' as const,
      border: [
        { type: 'solid' as const, pt: 0.5, color: C.headerBg },
        { type: 'solid' as const, pt: 0.5, color: C.headerBg },
        { type: 'solid' as const, pt: 0.5, color: C.headerBg },
        { type: 'solid' as const, pt: 0.5, color: C.headerBg },
      ],
    },
  }));

  // Data rows
  const dataRows: pptxgen.TableCell[][] = displayRobots.map((robot, rowIdx) => {
    const isCloid = lgData && robot.robotId === lgData.robotId;
    const rowBg = isCloid ? C.cloidBg : (rowIdx % 2 === 0 ? C.white : C.bgLight);
    const robotLabel = isCloid ? `${truncName(robot.robotName)}★` : truncName(robot.robotName);
    const pTotal = pocTotal(robot.pocScores);
    const rTotal = rfmTotal(robot.rfmScores);

    const cells: pptxgen.TableCell[] = [];

    // Robot name
    cells.push({
      text: robotLabel,
      options: {
        fontSize: 9, bold: !!isCloid, color: C.darkGray,
        fill: { color: rowBg }, fontFace: FONT, align: 'left' as const, valign: 'middle' as const,
        border: { type: 'solid' as const, pt: 0.5, color: C.border },
      },
    });

    // PoC factor scores
    for (const k of POC_KEYS) {
      const val = robot.pocScores[k] ?? 0;
      const isGap = isCloid && lgData && (val - topAvg[k]!) <= -3;
      cells.push({
        text: String(val),
        options: {
          fontSize: 9, bold: !!isCloid, color: C.darkGray,
          fill: { color: isGap ? C.gapRed : rowBg },
          fontFace: FONT, align: 'center' as const, valign: 'middle' as const,
          border: { type: 'solid' as const, pt: 0.5, color: C.border },
        },
      });
    }

    // PoC total
    cells.push({
      text: String(pTotal),
      options: {
        fontSize: 9, bold: true, color: C.darkGray,
        fill: { color: isCloid ? C.cloidBg : C.bgLighter },
        fontFace: FONT, align: 'center' as const, valign: 'middle' as const,
        border: { type: 'solid' as const, pt: 0.5, color: C.border },
      },
    });

    // RFM factor scores
    for (const k of RFM_KEYS) {
      const val = robot.rfmScores[k] ?? 0;
      const isGap = isCloid && lgData && (val - topAvg[k]!) <= -3;
      cells.push({
        text: String(val),
        options: {
          fontSize: 9, bold: !!isCloid, color: C.darkGray,
          fill: { color: isGap ? C.gapRed : rowBg },
          fontFace: FONT, align: 'center' as const, valign: 'middle' as const,
          border: { type: 'solid' as const, pt: 0.5, color: C.border },
        },
      });
    }

    // RFM total
    cells.push({
      text: String(rTotal),
      options: {
        fontSize: 9, bold: true, color: C.darkGray,
        fill: { color: isCloid ? C.cloidBg : C.bgLighter },
        fontFace: FONT, align: 'center' as const, valign: 'middle' as const,
        border: { type: 'solid' as const, pt: 0.5, color: C.border },
      },
    });

    return cells;
  });

  // Column widths: Robot(1.6) + 6 PoC(0.72 each) + PoC합(0.72) + 6 RFM(0.72 each) + RFM합(0.72)
  // Total = 1.6 + 14*0.72 = 1.6 + 10.08 = 11.68 → adjust to fit 12.73
  const factorW = 0.76;
  const colW = [1.85, ...Array(6).fill(factorW), factorW, ...Array(6).fill(factorW), factorW] as number[];

  slide.addTable([headerRow, ...dataRows], {
    x: 0.3, y: 1.65, w: 12.73,
    colW,
    rowH: 0.3,
    border: { type: 'solid', pt: 0.5, color: C.border },
    autoPage: false,
  });

  // GAP legend
  const legendY = 1.65 + 0.3 * (displayRobots.length + 1) + 0.08;
  slide.addShape('rect' as any, {
    x: 0.3, y: legendY, w: 0.22, h: 0.15,
    fill: { color: C.gapRed },
  });
  slide.addText('= 상위 평균 대비 -3 이상 GAP (개선 필요 항목)', {
    x: 0.56, y: legendY, w: 4, h: 0.15,
    fontSize: 8, color: C.gray, fontFace: FONT,
  });
}

// ── 3.4 Alerts (y: 4.95 ~ 6.3") ──

function addAlerts(slide: pptxgen.Slide, alerts: CompetitiveAlertRecord[]) {
  const startY = 5.0;

  slide.addText('최근 주요 경쟁 동향', {
    x: 0.3, y: startY - 0.25, w: 6, h: 0.22,
    fontSize: 12, bold: true, color: C.black, fontFace: FONT,
  });

  // Filter high severity first, then by date, max 3
  const sorted = [...alerts]
    .sort((a, b) => {
      const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const sa = sevOrder[a.severity ?? 'low'] ?? 2;
      const sb = sevOrder[b.severity ?? 'low'] ?? 2;
      if (sa !== sb) return sa - sb;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 3);

  if (sorted.length === 0) {
    slide.addText('최근 30일간 등록된 경쟁 동향이 없습니다. War Room > 알림 탭에서 등록하세요.', {
      x: 0.3, y: startY, w: 12, h: 0.3,
      fontSize: 10, color: C.lightGray, fontFace: FONT, italic: true,
    });
    return;
  }

  sorted.forEach((alert, i) => {
    const y = startY + i * 0.38;
    const sevIcon = alert.severity === 'high' ? '●' : alert.severity === 'medium' ? '●' : '●';
    const sevColor = alert.severity === 'high' ? C.lgRed : alert.severity === 'medium' ? 'D97706' : '16A34A';
    const dateStr = alert.createdAt ? new Date(alert.createdAt).toISOString().slice(0, 7).replace('-', '.') : '';

    // Severity dot + date + title
    slide.addText([
      { text: sevIcon + ' ', options: { color: sevColor, fontSize: 10 } },
      { text: `${dateStr} | `, options: { color: C.gray, fontSize: 10 } },
      { text: alert.title, options: { color: C.darkGray, fontSize: 10, bold: true } },
    ], {
      x: 0.3, y, w: 12.5, h: 0.18,
      fontFace: FONT,
    });

    // Summary / implication
    if (alert.summary) {
      slide.addText(`→ CLOiD 시사점: ${alert.summary}`, {
        x: 0.55, y: y + 0.17, w: 12, h: 0.16,
        fontSize: 9, color: C.gray, fontFace: FONT,
      });
    }
  });
}

// ── 3.5 Footer (y: 6.8 ~ 7.2") ──

function addFooter(slide: pptxgen.Slide) {
  // Separator line
  slide.addShape('rect' as any, {
    x: 0.3, y: 6.85, w: 12.73, h: 0.01,
    fill: { color: C.border },
  });

  // Footer text
  slide.addText('LG전자 로보틱스연구기획팀 | CONFIDENTIAL | ARGOS 자동 생성', {
    x: 0.3, y: 6.90, w: 10, h: 0.2,
    fontSize: 9, color: C.lightGray, fontFace: FONT,
  });

  // Page number
  slide.addText('p.1', {
    x: 12.0, y: 6.90, w: 1, h: 0.2,
    fontSize: 9, color: C.lightGray, fontFace: FONT, align: 'right',
  });
}
