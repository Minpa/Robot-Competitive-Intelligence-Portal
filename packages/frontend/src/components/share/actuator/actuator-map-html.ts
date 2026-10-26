/**
 * 다운로드 HTML용 액추에이터 카드 — 헤드라인 → 조달 태세 요약 막대 → 포지션 맵(타입 × 난이도, 점 색 = 조달 태세) SVG → 로봇 표 →
 * 공급망 표 2개(외부 조달 관계 / 수요 사례) → 공급사 제품 맵 SVG → 공급사 표 → 각주.
 * 외부 스크립트/스타일/이미지 없음, 모든 텍스트는 escapeHtml, 링크는 pageUrl(safeHref 통과분)만이고 데이터의 URL 은 https 인 경우에만 텍스트로 표시한다.
 * 색: chartColors 팔레트 토큰 + tailwind ink 토큰 hex (tech-trend-report-html.ts 와 동일 값). 새 hex 없음.
 */

import { escapeHtml, safeHref } from '@/lib/tech-trend-report-html';
import type { ActuatorAdoptionCase, ActuatorMapResponse, ActuatorMapRobot, ActuatorSupplierProduct, ActuatorSupplyEdge } from '@/types/actuator-map';
import {
  REGION_LABEL,
  buildLayout,
  defaultLayoutOptions,
  diamondPath,
  fmtUSD,
  numText,
  priceText,
  type ChartLayout,
} from './actuator-map-layout';
import {
  SEGMENT_BASIS_LABEL,
  buildLgCallout,
  buildMarketLayout,
  fmtTorque,
  type MarketLayout,
} from './actuator-market-layout';
import {
  INK,
  POSTURE_COLOR,
  POSTURE_HOLLOW,
  POSTURE_LABEL,
  POSTURE_ORDER,
  SEGMENT_COLOR,
  SEGMENT_HOLLOW,
  SEGMENT_LABEL,
  SEGMENT_ORDER,
  WHITE,
  adoptionBySegment,
  companyPosture,
  componentSourcingText,
  postureDetailLabel,
  postureOf,
  resolveSegmentOrder,
  roleKo,
  summarizeSourcing,
} from './actuator-sourcing';
import { unregisteredVendorNames } from './actuator-supply-graph';
import {
  STRATEGY_CONTENT,
  STRATEGY_SOURCES,
  buildDiagnosisLines,
  buildHeadlineMessage,
  buildMetricRows,
  buildSubtitle,
  computeStrategyStats,
  formatFooter,
  safeSourceHref,
} from './actuator-strategy';

const n1 = (v: number) => v.toFixed(1);
const e = escapeHtml;

export function buildActuatorMapSvg(layout: ChartLayout): string {
  const parts: string[] = [];
  const P = layout.plot;
  parts.push(
    `<svg viewBox="0 0 ${layout.width} ${layout.height}" width="100%" role="img" aria-label="${e(layout.title)} — ${e(layout.meta)}" style="display:block;max-width:100%;height:auto;font-family:inherit">`
  );
  // 격자·축
  for (const t of layout.xTicks) {
    parts.push(`<line x1="${n1(t.x)}" x2="${n1(t.x)}" y1="${P.y}" y2="${P.y + P.h}" stroke="${INK[100]}" stroke-width="1"/>`);
    parts.push(`<text x="${n1(t.x)}" y="${P.y + P.h + 18}" text-anchor="middle" font-size="11" fill="${INK[500]}">${e(t.label)}</text>`);
  }
  for (const y of layout.gridY) parts.push(`<line x1="${P.x}" x2="${P.x + P.w}" y1="${n1(y)}" y2="${n1(y)}" stroke="${INK[100]}" stroke-width="1"/>`);
  for (const t of layout.yTicks) parts.push(`<text x="${P.x - 10}" y="${n1(t.y + 4)}" text-anchor="end" font-size="11" fill="${INK[500]}">${e(t.label)}</text>`);
  parts.push(`<line x1="${P.x}" x2="${P.x + P.w}" y1="${P.y + P.h}" y2="${P.y + P.h}" stroke="${INK[300]}" stroke-width="1"/>`);
  parts.push(`<line x1="${P.x}" x2="${P.x}" y1="${P.y}" y2="${P.y + P.h}" stroke="${INK[300]}" stroke-width="1"/>`);
  parts.push(`<text x="${P.x + P.w / 2}" y="${layout.height - 14}" text-anchor="middle" font-size="12" fill="${INK[600]}">${e(layout.xAxisTitle)}</text>`);
  parts.push(`<text x="16" y="${P.y - 10}" font-size="12" fill="${INK[600]}">${e(layout.yAxisTitle)}</text>`);
  // 헐 (무채색)
  for (const h of layout.hulls) parts.push(`<path d="${h.d}" fill="${h.color}" fill-opacity="0.1" stroke="${h.color}" stroke-opacity="0.45" stroke-width="1"/>`);
  // 가격 막대
  for (const b of layout.priceBars)
    parts.push(`<line x1="${n1(b.px)}" x2="${n1(b.px)}" y1="${n1(b.y1)}" y2="${n1(b.y2)}" stroke="${b.color}" stroke-width="2" stroke-linecap="round" stroke-opacity="0.7"/>`);
  // 점 + 라벨
  for (const p of layout.points) {
    const r = p.robot;
    parts.push(`<g role="img" aria-label="${e(p.ariaLabel)}">`);
    if (r.isLG) {
      parts.push(`<path d="${diamondPath(p.px, p.py, 9)}" fill="${WHITE}"/><path d="${diamondPath(p.px, p.py, 7)}" fill="${INK[900]}"/>`);
    } else {
      parts.push(`<circle cx="${n1(p.px)}" cy="${n1(p.py)}" r="7" fill="${WHITE}" stroke="${WHITE}" stroke-width="2"/>`);
      if (p.hollow) {
        // 확인 불가: 흰 채움 + 회색 링 (예측 모델은 점선 링)
        parts.push(
          `<circle cx="${n1(p.px)}" cy="${n1(p.py)}" r="4.5" fill="${WHITE}" stroke="${p.color}" stroke-width="2"${r.forecast ? ' stroke-dasharray="2 2"' : ''}/>`
        );
      } else {
        const fc = r.forecast ? ` fill-opacity="0.35" stroke="${p.color}" stroke-width="1.5" stroke-dasharray="2 2"` : '';
        parts.push(`<circle cx="${n1(p.px)}" cy="${n1(p.py)}" r="5" fill="${p.color}"${fc}/>`);
      }
    }
    if (p.label.leader) parts.push(`<line x1="${n1(p.px)}" y1="${n1(p.py)}" x2="${n1(p.label.leader.x2)}" y2="${n1(p.label.leader.y2)}" stroke="${INK[400]}" stroke-width="1"/>`);
    parts.push(
      `<text x="${n1(p.label.x)}" y="${n1(p.label.y)}" text-anchor="${p.label.anchor}" font-size="11" fill="${INK[900]}" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${e(r.name)}</text>`
    );
    parts.push('</g>');
  }
  for (const h of layout.hulls)
    parts.push(
      `<text x="${n1(h.label.x)}" y="${n1(h.label.y)}" text-anchor="${h.label.anchor}" font-size="11" font-weight="600" fill="${INK[600]}" stroke="${WHITE}" stroke-width="3" paint-order="stroke">${e(h.company)}</text>`
    );
  parts.push('</svg>');
  return parts.join('');
}

const AVOID = 'break-inside:avoid;page-break-inside:avoid';
/**
 * 인쇄 규칙 — 표 래퍼의 overflow-x:auto 가 인쇄에서 열을 가리지 않도록 풀고, 긴 URL·영문 토큰이 행 높이를 키우지 않도록 줄바꿈한다.
 * 카드 안의 <style> 하나(외부 참조 없음). 화면 표시는 그대로다.
 */
const PRINT_STYLE = `<style>@media print{.tbl-wrap{overflow:visible !important}.tbl-wrap table{table-layout:auto;font-size:10px}.tbl-wrap th,.tbl-wrap td{white-space:normal !important;overflow-wrap:break-word}.tbl-wrap a{word-break:break-all}}</style>`;
const TABLE_STYLE = `style="border-collapse:collapse;width:100%;font-size:12px"`;
const TH = `style="text-align:left;padding:5px 8px;border-bottom:1px solid ${INK[200]};color:${INK[600]};font-weight:600;white-space:nowrap"`;
const THN = `style="text-align:right;padding:5px 8px;border-bottom:1px solid ${INK[200]};color:${INK[600]};font-weight:600;white-space:nowrap"`;
const TD = `style="padding:5px 8px;border-bottom:1px solid ${INK[100]};vertical-align:top"`;
const TDN = `style="padding:5px 8px;border-bottom:1px solid ${INK[100]};text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap"`;
const TR = `<tr style="${AVOID}">`;
const META = `color:${INK[600]};font-size:12px;margin:0`;
const SMALL = `font-size:11.5px;color:${INK[600]};line-height:1.6`;
const EXACT = '-webkit-print-color-adjust:exact;print-color-adjust:exact';

/** 조달 태세 견본 (확인 불가·자사 전용은 속 빈 링) */
function dot(color: string, hollow: boolean, ring = 2): string {
  return hollow
    ? `<i style="display:inline-block;width:10px;height:10px;border-radius:50%;box-sizing:border-box;background:${WHITE};border:${ring}px solid ${color};${EXACT}"></i>`
    : `<i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};${EXACT}"></i>`;
}
const postureDot = (r: ActuatorMapRobot) => dot(POSTURE_COLOR[postureOf(r)], POSTURE_HOLLOW[postureOf(r)]);

function emptyP(text: string): string {
  return `<p class="empty" style="color:${INK[500]};font-size:13px;padding:8px 0">${e(text)}</p>`;
}

function legendHtml(hasLG: boolean, hasForecast: boolean): string {
  const items = POSTURE_ORDER.map(
    (p) =>
      `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px">${dot(POSTURE_COLOR[p], POSTURE_HOLLOW[p])}${e(POSTURE_LABEL[p])}</span>`
  );
  if (hasLG)
    items.push(
      `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><i style="display:inline-block;width:10px;height:10px;background:${INK[900]};transform:rotate(45deg)"></i>LG 기준점</span>`
    );
  items.push(
    `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><i style="display:inline-block;width:18px;height:10px;border:1px solid ${INK[400]};background:${INK[100]};border-radius:3px;${EXACT}"></i>같은 회사 제품군 커버리지</span>`
  );
  if (hasForecast) items.push(`<span style="margin-right:14px">○ 점선 테두리 = 예측 모델</span>`);
  return `<div style="font-size:11.5px;color:${INK[600]};margin-top:8px">${items.join('')}</div><p style="${SMALL};margin:4px 0 0">점 색은 액추에이터 조달 태세입니다(속 빈 회색 링 = 근거 부족으로 확인 불가). 자체 개발 확인은 근거 등급 A·B만 셉니다. 지역은 색으로 구분하지 않습니다.</p>`;
}

/** 조달 태세 요약 막대 + 범례 (div flex, 인라인 스타일) */
export function buildSourcingSummaryHtml(robots: ActuatorMapRobot[]): string {
  const sum = summarizeSourcing(robots);
  if (sum.robots === 0) return '';
  const counts = { in_house: sum.inHouse, in_house_sells: sum.inHouseSells, external: sum.external, unknown: sum.unknown };
  const bar = POSTURE_ORDER.filter((p) => counts[p] > 0)
    .map(
      (p) =>
        `<div title="${e(POSTURE_LABEL[p])} ${counts[p]}기" style="flex:${counts[p]} 1 0;background:${POSTURE_HOLLOW[p] ? WHITE : POSTURE_COLOR[p]};${POSTURE_HOLLOW[p] ? `border-left:3px solid ${POSTURE_COLOR[p]};` : ''}${EXACT}"></div>`
    )
    .join('');
  const legend = POSTURE_ORDER.map(
    (p) =>
      `<span style="display:inline-flex;align-items:center;gap:6px;margin:2px 16px 2px 0">${dot(POSTURE_COLOR[p], POSTURE_HOLLOW[p])}${e(POSTURE_LABEL[p])} <b>${counts[p]}기</b>${
        p === 'external' && sum.externalMixed > 0 ? e(` (이 중 혼합 ${sum.externalMixed}기)`) : ''
      }${p === 'unknown' ? e(` (이 중 자체 개발 추정 ${sum.unknownPresumed}기)`) : ''}</span>`
  ).join('');
  const comp =
    sum.componentSourcing > 0
      ? ` 모듈(통합 관절)은 자체 설계이고 부품(모터·감속기)만 외부에서 조달하는 ${sum.componentSourcing}기는 자체 개발 확인에 포함하고 표에 따로 표기합니다.`
      : '';
  return [
    `<div style="margin:10px 0 0;${AVOID}">`,
    `<h3 style="font-size:14px;margin:0 0 6px;color:${INK[900]}">조달 태세 요약</h3>`,
    `<div role="img" aria-label="${e(`로봇 조달 태세 ${POSTURE_ORDER.map((p) => `${POSTURE_LABEL[p]} ${counts[p]}기`).join(', ')}`)}" style="display:flex;width:100%;height:22px;border:1px solid ${INK[200]};border-radius:6px;overflow:hidden">${bar}</div>`,
    `<div style="font-size:12px;color:${INK[600]};margin-top:6px">${legend}</div>`,
    `<p style="${SMALL};margin:2px 0 0">${e(`로봇 ${sum.robots}기(예측 모델 제외). 자체 개발 확인 ${sum.inHouse + sum.inHouseSells}기 중 근거 등급 A ${sum.confirmedGradeA}기 / B ${sum.confirmedGradeB}기.${comp}`)}</p>`,
    '</div>',
  ].join('');
}

function robotTableHtml(data: ActuatorMapResponse, layout: ChartLayout): string {
  const byId = new Map(layout.points.map((p) => [p.robot.id, p.x] as const));
  const rows = [...data.robots]
    .filter((r) => !r.forecast)
    .map((r) => ({ r, x: byId.get(r.id) ?? null }))
    .sort((a, b) => (b.x ?? -1) - (a.x ?? -1));
  const head = ['로봇', '회사', '지역', '보행', '전신 DOF', '손 DOF', '속도 m/s', '난이도', '무게 kg', '키 cm', '가반하중 kg', '액추에이터 타입', '조달 태세', '가격 (등급)', '출처'];
  const th = head.map((h, i) => `<th ${i >= 4 && i <= 10 ? THN : TH}>${e(h)}</th>`).join('');
  const body = rows
    .map(({ r, x }) => {
      const nameTd = r.incomplete ? `style="padding:5px 8px;border-bottom:1px solid ${INK[100]};vertical-align:top;color:${INK[500]}"` : TD;
      const comp = componentSourcingText(r.sourcing);
      const cells = [
        `<td ${nameTd}>${e(r.name)}${r.incomplete ? ' · 스펙 없음' : ''}</td>`,
        `<td ${TD}>${e(r.company)}</td>`,
        `<td ${TD}>${e(REGION_LABEL[r.region])}</td>`,
        `<td ${TD}>${e(r.locomotion)}</td>`,
        `<td ${TDN}>${e(numText(r.dof))}</td>`,
        `<td ${TDN}>${e(numText(r.handDof))}</td>`,
        `<td ${TDN}>${e(numText(r.speed))}</td>`,
        `<td ${TDN}><b>${x == null ? '—' : n1(x)}</b></td>`,
        `<td ${TDN}>${e(numText(r.weight))}</td>`,
        `<td ${TDN}>${e(numText(r.height))}</td>`,
        `<td ${TDN}>${e(numText(r.payload))}</td>`,
        `<td ${TD}>${e(r.actuatorTypeLabel)}</td>`,
        `<td ${TD}>${postureDot(r)} ${e(postureDetailLabel(r.sourcing))}${comp ? `<br><span style="color:${INK[500]};font-size:11px">${e(comp)}</span>` : ''}</td>`,
        `<td ${TD}>${e(priceText(r.price))}${r.price ? ` ${e(r.price.conf)}` : ''}</td>`,
        `<td ${TD}><span style="color:${INK[600]}">${e(r.sources.join(' · '))} · ${e(r.actuatorTypeNote)}${r.sourcing.noteKo ? ` · ${e(r.sourcing.noteKo)}` : ''}</span></td>`,
      ];
      return `${TR}${cells.join('')}</tr>`;
    })
    .join('');
  return `<div class="tbl-wrap" style="overflow-x:auto;margin-top:12px"><table ${TABLE_STYLE}><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** 외부 조달 관계 표 (조달 태세가 외부 조달·혼합인 로봇의 공급사 관계; 자체 개발 관계는 제외) */
export function buildSupplyChainTableHtml(edges: ActuatorSupplyEdge[], _data?: ActuatorMapResponse): string {
  const ext = (edges ?? []).filter((ed) => ed.basis === 'external');
  if (ext.length === 0) return emptyP('기록된 외부 조달 관계가 없습니다.');
  const sorted = [...ext].sort((a, b) => a.company.localeCompare(b.company) || a.robotName.localeCompare(b.robotName) || b.quantity - a.quantity);
  const rows = sorted
    .map(
      (ed) =>
        `${TR}<td ${TD}><b>${e(ed.robotName)}</b></td><td ${TD}>${e(ed.company)}</td><td ${TD}>${e(ed.vendor)}${ed.level === 'component' ? ' (부품)' : ''}</td><td ${TD}>${e(roleKo(ed.role) ?? '—')}</td><td ${TD}>${e(ed.type)}</td><td ${TDN}>${ed.quantity}</td><td ${TDN}>${e(ed.confidence)}</td></tr>`
    )
    .join('');
  return `<div class="tbl-wrap" style="overflow-x:auto"><table ${TABLE_STYLE}><thead><tr><th ${TH}>로봇</th><th ${TH}>회사</th><th ${TH}>공급사</th><th ${TH}>역할</th><th ${TH}>타입</th><th ${THN}>수량</th><th ${THN}>등급</th></tr></thead><tbody>${rows}</tbody></table></div><p style="font-size:11.5px;color:${INK[500]};margin:6px 0 0">부품 = 부품(모터·감속기) 단위 · 신뢰도 A 공식 ~ D 추정(CI) · 수량 미상은 1</p>`;
}

/** 출처: https 인 경우에만 URL 을 텍스트로 표시 (링크 아님) */
function sourceText(c: ActuatorAdoptionCase): string {
  const parts = c.sources.slice(0, 2).map((s) => {
    const url = safeSourceHref(s.url) ? s.url : '';
    return [s.title, url].filter(Boolean).join(' ');
  });
  return parts.filter(Boolean).join(' / ') || '—';
}

/** 수요 사례 표 (외부 액추에이터 공개 채택) */
export function buildAdoptionTableHtml(adoptions: ActuatorAdoptionCase[]): string {
  if (!adoptions || adoptions.length === 0) return emptyP('공개 채택 사례는 아직 수집되지 않았습니다.');
  const rows = adoptions
    .map(
      (c) =>
        `${TR}<td ${TD}><b>${e(c.robotName)}</b></td><td ${TD}>${e(c.company)}</td><td ${TD}>${e(c.country ?? '—')}</td><td ${TD}>${dot(SEGMENT_COLOR[c.marketSegment], SEGMENT_HOLLOW[c.marketSegment], 1.75)} ${e(SEGMENT_LABEL[c.marketSegment])}</td><td ${TD}>${e(c.actuatorVendor)}${c.level === 'component' ? ' (부품)' : ''}${c.actuatorModel ? `<br><span style="color:${INK[500]};font-size:11px">${e(c.actuatorModel)}</span>` : ''}</td><td ${TD}>${e(c.usage ?? '—')}</td><td ${TDN}>${e(c.evidenceGrade ?? '—')}</td><td ${TDN}>${c.year ?? '—'}</td><td ${TD}><span style="color:${INK[600]};word-break:break-all">${e(sourceText(c))}</span></td></tr>`
    )
    .join('');
  return `<div class="tbl-wrap" style="overflow-x:auto"><table ${TABLE_STYLE}><thead><tr><th ${TH}>로봇</th><th ${TH}>회사</th><th ${TH}>국가</th><th ${TH}>세그먼트</th><th ${TH}>공급사/모델</th><th ${TH}>용도</th><th ${THN}>등급</th><th ${THN}>연도</th><th ${TH}>출처</th></tr></thead><tbody>${rows}</tbody></table></div><p style="font-size:11.5px;color:${INK[500]};margin:6px 0 0">수요 사례는 외부 액추에이터를 쓰는 공개 채택 사례이며 공급 계약 여부는 별도입니다. 부품 = 부품(모터·감속기) 단위 채택.</p>`;
}

function supplyChainParagraphsHtml(data: ActuatorMapResponse): string {
  const unknown = data.robots.filter((r) => !r.forecast && postureOf(r) === 'unknown');
  const confirmed = [...companyPosture(data.robots).values()].filter((c) => c.posture === 'in_house' || c.posture === 'in_house_sells').map((c) => c.company);
  const mod = data.adoptions.filter((c) => c.level !== 'component').length;
  const comp = data.adoptions.length - mod;
  const seg = adoptionBySegment(data.adoptions, data.segmentOrder).filter((c) => c.count > 0);
  const lines = [
    data.adoptions.length > 0
      ? `공개 채택 사례 ${data.adoptions.length}건${mod > 0 ? `: ${seg.map((c) => `${SEGMENT_LABEL[c.segment]} ${c.count}`).join(', ')}` : ''}${comp > 0 ? ` (부품 단위 채택 ${comp}건은 별도)` : ''}`
      : '',
    `확인 불가 로봇 ${unknown.length}기${unknown.length ? `: ${unknown.map((r) => `${r.name}(${r.company})${r.sourcing.kind === 'in_house_presumed' ? ' 자체 개발 추정' : ''}`).join(', ')}` : ''}`,
    `자체 개발 확인 회사 ${confirmed.length}개사${confirmed.length ? `: ${confirmed.join(', ')}` : ''}. 자체 개발 관계는 공급망 표에 넣지 않았습니다.`,
  ].filter(Boolean);
  return lines.map((l) => `<p style="${SMALL};margin:6px 0 0">${e(l)}</p>`).join('');
}

// ── 공급사 제품 맵 (정적 SVG) ─────────────────────────────────────────────────

/** 공급사 제품 맵 정적 SVG — 인라인 속성만 사용하고 클래스·스크립트·외부 참조가 없다. 빈 레이아웃이면 <p class="empty"> */
export function buildSupplierMarketMapSvg(layout: MarketLayout): string {
  const { plot: P, lane: L } = layout;
  if (layout.counts.plotted + layout.counts.lane === 0 && !layout.band && !layout.bandNote) return emptyP('표시할 공급사 제품이 없습니다.');
  const out: string[] = [];
  out.push(
    `<svg viewBox="0 0 ${layout.width} ${layout.height}" width="100%" role="img" aria-label="${e(layout.title)} — ${e(layout.meta)}" style="display:block;max-width:100%;height:auto;font-family:inherit">`
  );
  for (const t of layout.yTicks) {
    out.push(`<line x1="${L.x}" x2="${P.x + P.w}" y1="${n1(t.y)}" y2="${n1(t.y)}" stroke="${INK[100]}" stroke-width="1"/>`);
    out.push(`<text x="${L.x - 8}" y="${n1(t.y + 4)}" text-anchor="end" font-size="11" fill="${INK[500]}">${e(t.label)}</text>`);
  }
  for (const t of layout.xTicks) {
    out.push(`<line x1="${n1(t.x)}" x2="${n1(t.x)}" y1="${P.y}" y2="${P.y + P.h}" stroke="${INK[100]}" stroke-width="1"/>`);
    out.push(`<text x="${n1(t.x)}" y="${P.y + P.h + 18}" text-anchor="middle" font-size="11" fill="${INK[500]}">${e(t.label)}</text>`);
  }
  out.push(`<line x1="${L.x}" x2="${P.x + P.w}" y1="${P.y + P.h}" y2="${P.y + P.h}" stroke="${INK[300]}" stroke-width="1"/>`);
  out.push(`<line x1="${L.x}" x2="${L.x}" y1="${P.y}" y2="${P.y + P.h}" stroke="${INK[300]}" stroke-width="1"/>`);
  out.push(`<line x1="${P.x - 11}" x2="${P.x - 11}" y1="${P.y - 8}" y2="${P.y + P.h}" stroke="${INK[400]}" stroke-width="1" stroke-dasharray="4 4"/>`);
  out.push(`<text x="${L.x}" y="${P.y - 14}" font-size="11.5" font-weight="600" fill="${INK[600]}">${e(layout.laneTitle)}</text>`);
  out.push(`<text x="${P.x}" y="${P.y - 14}" font-size="11.5" font-weight="600" fill="${INK[600]}">${e(layout.plotTitle)}</text>`);
  out.push(`<text x="${P.x + P.w / 2}" y="${layout.height - 16}" text-anchor="middle" font-size="12" fill="${INK[600]}">${e(layout.xAxisTitle)}</text>`);
  out.push(
    `<text x="14" y="${P.y + P.h / 2}" text-anchor="middle" font-size="12" fill="${INK[600]}" transform="rotate(-90 14 ${P.y + P.h / 2})">${e(layout.yAxisTitle)}</text>`
  );
  // 빈 구간 주석 (가설)
  if (layout.gap) {
    const g = layout.gap;
    out.push(`<rect x="${n1(g.x1)}" y="${g.y1}" width="${n1(g.x2 - g.x1)}" height="${n1(g.y2 - g.y1)}" fill="none" stroke="${INK[400]}" stroke-width="1" stroke-dasharray="3 3"/>`);
    out.push(
      `<text text-anchor="middle" font-size="10.5" fill="${INK[600]}">${g.lines.map((l, i) => `<tspan x="${n1(g.labelX)}" y="${n1(g.labelY + i * 13)}"${i === 0 ? ' font-weight="600"' : ''}>${e(l)}</tspan>`).join('')}</text>`
    );
  }
  // AXIUM 추정 밴드 — 점·라벨 아래 레이어
  if (layout.band) {
    const b = layout.band;
    out.push(
      `<rect x="${b.x1}" y="${n1(b.y1)}" width="${n1(b.x2 - b.x1)}" height="${n1(b.y2 - b.y1)}" fill="${INK[900]}" fill-opacity="0.07" stroke="${INK[900]}" stroke-width="1.5" stroke-dasharray="6 4"><title>${e(b.labelLines.join(' '))}</title></rect>`
    );
  }
  for (const p of layout.points) {
    const s = p.supplier;
    const tip = `${p.ariaLabel} · ${s.type} · 연속 토크 ${fmtTorque(s.continuousTorqueNm)} · ${SEGMENT_BASIS_LABEL[s.segmentBasis]} · 공개 채택 사례 ${s.adoptionIds.length}건`;
    out.push(`<g role="img" aria-label="${e(p.ariaLabel)}"><title>${e(tip)}</title>`);
    if (p.label.leader) out.push(`<polyline points="${p.label.leader.map((q) => `${n1(q[0])},${n1(q[1])}`).join(' ')}" fill="none" stroke="${INK[300]}" stroke-width="1"/>`);
    out.push(`<circle cx="${n1(p.px)}" cy="${n1(p.py)}" r="7" fill="${WHITE}"/>`);
    out.push(
      p.hollow
        ? `<circle cx="${n1(p.px)}" cy="${n1(p.py)}" r="4.25" fill="${WHITE}" stroke="${p.color}" stroke-width="1.75"/>`
        : `<circle cx="${n1(p.px)}" cy="${n1(p.py)}" r="5" fill="${p.color}"/>`
    );
    out.push(
      `<text x="${n1(p.label.x)}" y="${n1(p.label.y)}" text-anchor="${p.label.anchor}" font-size="10.5" fill="${INK[900]}" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${e(p.label.text)}</text>`
    );
    out.push('</g>');
  }
  if (layout.band) {
    const b = layout.band;
    out.push(
      `<text text-anchor="end" font-size="10.5" fill="${INK[900]}" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${b.labelLines.map((l, i) => `<tspan x="${n1(b.labelX)}" y="${n1(b.labelY + i * 13)}"${i === 0 ? ' font-weight="700"' : ''}>${e(l)}</tspan>`).join('')}</text>`
    );
  }
  if (layout.bandNote) {
    const n = layout.bandNote;
    out.push(`<text x="${n1(n.x)}" y="${n1(n.y)}" text-anchor="end" font-size="10.5" fill="${INK[600]}">${e(n.text)}</text>`);
  }
  out.push('</svg>');
  return out.join('');
}

function marketLegendHtml(layout: MarketLayout, order: ReturnType<typeof resolveSegmentOrder>): string {
  const chips = order.map(
    (s) =>
      `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px">${dot(SEGMENT_COLOR[s], SEGMENT_HOLLOW[s], 1.75)}${e(SEGMENT_LABEL[s])} ${layout.segmentCounts[s] ?? 0}</span>`
  );
  if (layout.lg)
    chips.push(
      `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><i style="display:inline-block;width:18px;height:10px;border:1px dashed ${INK[900]};background:${INK[100]};${EXACT}"></i>LG AXIUM 추정 밴드(가설)</span>`
    );
  chips.push(
    `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><i style="display:inline-block;width:18px;height:10px;border:1px dashed ${INK[400]}"></i>점선 사각형 = 가설 구간</span>`
  );
  return `<div style="font-size:11.5px;color:${INK[600]};margin-top:8px">${chips.join('')}</div><p style="${SMALL};margin:4px 0 0">점 색은 시장 세그먼트이며 조달 태세 색과 의미가 다릅니다. 세그먼트는 공급사 기재 타깃 시장과 키워드 규칙으로 분류했고, 자사 전용(계열 포함)은 속 빈 링으로 표시합니다.</p>`;
}

export function buildSupplierTableHtml(suppliers: ActuatorSupplierProduct[], adoptions: ActuatorAdoptionCase[] = []): string {
  if (suppliers.length === 0) return emptyP('등록된 액추에이터 공급사 제품이 없습니다.');
  const byId = new Map(adoptions.map((c) => [c.id, c] as const));
  const adoptionCell = (s: ActuatorSupplierProduct): string => {
    const cases = s.adoptionIds.map((id) => byId.get(id)).filter((c): c is ActuatorAdoptionCase => !!c);
    if (cases.length === 0) return '—';
    const shown = cases.slice(0, 3).map((c) => c.robotName.replace(/\s*\([^)]*\)/g, ''));
    return `${cases.length}건: ${shown.join(', ')}${cases.length > 3 ? ` 외 ${cases.length - 3}건` : ''}`;
  };
  const rows = suppliers
    .map((s) => {
      const others = s.segments.filter((x) => x !== s.segment);
      return `${TR}<td ${TD}><b>${e(s.vendor)}</b></td><td ${TD}>${e(s.country ?? '—')}</td><td ${TD}>${e(s.model)}</td><td ${TD}>${e(s.type)}</td><td ${TDN}>${e(numText(s.peakTorqueNm))}</td><td ${TDN}>${e(numText(s.continuousTorqueNm))}</td><td ${TDN}>${e(numText(s.weightKg))}</td><td ${TDN}>${e(numText(s.diameterMm))}</td><td ${TDN}>${s.priceUsd == null ? '—' : e(fmtUSD(s.priceUsd))}</td><td ${TD}>${e(s.status ?? '—')}</td><td ${TD}>${e(s.targetMarket ?? '—')}</td><td ${TD}>${dot(SEGMENT_COLOR[s.segment], SEGMENT_HOLLOW[s.segment], 1.75)} ${e(SEGMENT_LABEL[s.segment])}${others.length ? `<br><span style="color:${INK[500]};font-size:11px">${e(`그 외: ${others.map((x) => SEGMENT_LABEL[x]).join(', ')}`)}</span>` : ''}</td><td ${TD}>${e(adoptionCell(s))}</td></tr>`;
    })
    .join('');
  return `<div class="tbl-wrap" style="overflow-x:auto"><table ${TABLE_STYLE}><thead><tr><th ${TH}>공급사</th><th ${TH}>국가</th><th ${TH}>모델</th><th ${TH}>타입(추정)</th><th ${THN}>피크 토크 Nm</th><th ${THN}>연속 토크 Nm</th><th ${THN}>무게 kg</th><th ${THN}>직경 mm</th><th ${THN}>가격 USD</th><th ${TH}>상태</th><th ${TH}>타깃 시장</th><th ${TH}>시장 세그먼트</th><th ${TH}>공개 채택 사례</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/**
 * 액추에이터 카드 HTML (tech-trend-report-html.ts 의 .card 스타일을 그대로 쓰도록 class="card" 사용).
 * data 가 없으면 '' 를 돌려 카드를 생략한다. 링크는 pageUrl(https 허용 호스트)만 선택적으로 표시한다.
 */
export function buildActuatorMapCardHtml(data: ActuatorMapResponse | null | undefined, pageUrl?: string): string {
  if (!data) return '';
  const layout = buildLayout(data.robots, defaultLayoutOptions(data.difficultyDefault, data.typeOrder));
  const order = resolveSegmentOrder(data.segmentOrder);
  const market = buildMarketLayout(data.suppliers, data.adoptions);
  const callout = buildLgCallout(data.suppliers, data.adoptions, order);
  const hasLG = data.robots.some((r) => r.isLG && !r.incomplete);
  const hasForecast = data.robots.some((r) => r.forecast);
  const href = safeHref(pageUrl);
  const link = href ? `<p style="font-size:11.5px;color:${INK[500]};margin:6px 0 0"><a href="${e(href)}" target="_blank" rel="noopener noreferrer">인터랙티브 버전(Y축 전환·가중치 조정)은 ARGOS 포털에서</a></p>` : '';
  const headline = buildHeadlineMessage(computeStrategyStats(data));
  const unregistered = unregisteredVendorNames(data.edges, data.robots, data.adoptions, data.suppliers);

  const chart =
    layout.points.length === 0
      ? emptyP('포지션 맵에 올릴 스펙 완결 로봇이 없습니다.')
      : `<div style="${AVOID}">${buildActuatorMapSvg(layout)}</div>${legendHtml(hasLG, hasForecast)}`;
  const marketChart = `<div style="${AVOID}">${buildSupplierMarketMapSvg(market)}</div>${market.counts.plotted + market.counts.lane + market.counts.lg > 0 ? marketLegendHtml(market, order) : ''}`;
  const excluded =
    market.excludedNoTorque.length > 0
      ? `<p style="${SMALL};margin:6px 0 0">토크 미공개 ${market.excludedNoTorque.length}개는 그래프에서 제외: ${e(market.excludedNoTorque.map((x) => x.label).join(', '))}</p>`
      : '';
  const calloutHtml = callout.length
    ? `<div style="border:1px solid ${INK[200]};background:${INK[50]};border-radius:10px;padding:8px 12px;margin-top:8px;${AVOID}">${callout.map((l) => `<p style="font-size:12px;color:${INK[900]};line-height:1.6;margin:2px 0">${e(l)}</p>`).join('')}</div>`
    : '';

  return [
    `<section class="card" style="background:${WHITE};border:1px solid ${INK[200]};border-radius:14px;padding:20px 22px;margin-top:18px">`,
    PRINT_STYLE,
    `<p class="kicker" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${INK[500]};margin:0 0 6px">Actuator · Position &amp; Supply Chain</p>`,
    `<h2 style="font-size:16px;margin:0 0 4px;color:${INK[900]}">${e(layout.title)}</h2>`,
    `<p style="font-size:12.5px;color:${INK[900]};line-height:1.65;margin:6px 0 8px;font-weight:600;${AVOID}">${e(headline)}</p>`,
    buildSourcingSummaryHtml(data.robots),
    `<p class="meta" style="${META};margin:12px 0 10px">${e(layout.meta)} · ${e(layout.formula)}</p>`,
    chart,
    link,
    `<h3 style="font-size:14px;margin:18px 0 4px;color:${INK[900]}">데이터 표</h3>`,
    `<p class="meta" style="${META}">스펙 미등록 로봇은 난이도 없이 표에만 포함됩니다. 출처 등급 A 공식 ~ D 추정(CI). 조달 태세의 등급은 자체 개발 근거의 등급입니다.</p>`,
    robotTableHtml(data, layout),
    `<h3 style="font-size:14px;margin:18px 0 6px;color:${INK[900]}">공급망 (외부 조달 관계 · 공개 채택 사례)</h3>`,
    `<p class="meta" style="${META};margin:0 0 6px">외부 조달 관계 표</p>`,
    buildSupplyChainTableHtml(data.edges, data),
    `<p class="meta" style="${META};margin:14px 0 6px">수요 사례 표 (외부 액추에이터 공개 채택)</p>`,
    buildAdoptionTableHtml(data.adoptions),
    supplyChainParagraphsHtml(data),
    `<h3 style="font-size:14px;margin:18px 0 6px;color:${INK[900]}">${e(market.title)}</h3>`,
    `<p class="meta" style="${META};margin:0 0 6px">${e(market.meta)}</p>`,
    marketChart,
    excluded,
    calloutHtml,
    `<h3 style="font-size:14px;margin:18px 0 6px;color:${INK[900]}">액추에이터 공급사 커버리지</h3>`,
    `<p class="meta" style="${META};margin:0 0 6px">products(type='actuator') + 로봇에 연결되지 않은 components. 타입은 DB 텍스트에서 추정, 타깃 시장·세그먼트는 공급사 기재 + 키워드 규칙 분류.</p>`,
    buildSupplierTableHtml(data.suppliers, data.adoptions),
    `<p style="font-size:11.5px;color:${INK[500]};margin:14px 0 0;line-height:1.6">X축은 DB 필드(보행·전신 DOF·손 DOF·속도)만으로 계산한 지수. 액추에이터 타입은 components·CI '구동 방식' 근거가 있는 경우만 분류(없으면 '미확인'). 가격은 CI '가격대'·로봇 설명의 기록 값만 사용. 조달 태세: 자체 개발 확인은 근거 등급 A·B만 세고 C·D 등급이거나 근거가 없으면 확인 불가(자체 개발 추정은 별도 표기), 외부 조달에는 혼합 포함, 모듈은 자체 설계이고 부품(모터·감속기)만 외부 조달이면 자체 개발 확인으로 두고 부품 외부 조달을 따로 표기. 수요 사례는 공개 채택 사례이며 공급 계약 여부는 별도. 시장 세그먼트 분류는 (가설)을 포함합니다.${unregistered.length > 0 ? ` 제품 스펙 미등록 공급사 ${unregistered.length}개(${e(unregistered.join(', '))})는 공급망 표에만 나타나고 공급사 제품 맵·표에는 없습니다.` : ''} 집계 ${e(data.generatedAt)}.</p>`,
    '</section>',
  ].join('');
}

// ── 세트 제조사의 액추에이터 사업화 전략 카드 ─────────────────────────────────────

/** 긴 문장이 줄바꿈되도록 nowrap 없는 셀 스타일 */
const STH = `style="text-align:left;padding:5px 8px;border-bottom:1px solid ${INK[200]};color:${INK[600]};font-weight:600;vertical-align:bottom"`;
const STD = `style="padding:5px 8px;border-bottom:1px solid ${INK[100]};vertical-align:top;line-height:1.55"`;
const STD_FIRST = `style="padding:5px 8px;border-bottom:1px solid ${INK[100]};vertical-align:top;line-height:1.55;min-width:72px"`;
const SR_ONLY = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

function strategyH3(text: string): string {
  return `<h3 style="font-size:14px;margin:18px 0 6px;color:${INK[900]}">${e(text)}</h3>`;
}

function strategyTable(caption: string, columns: string[], rows: string[][], boldFirst = true): string {
  const head = columns.map((c) => `<th scope="col" ${STH}>${e(c)}</th>`).join('');
  const body = rows
    .map(
      (cells) =>
        `<tr style="${AVOID}">${cells.map((c, i) => `<td ${i === 0 ? STD_FIRST : STD}>${i === 0 && boldFirst ? `<b>${e(c)}</b>` : e(c)}</td>`).join('')}</tr>`
    )
    .join('');
  return `<div class="tbl-wrap" style="overflow-x:auto"><table ${TABLE_STYLE}><caption style="${SR_ONLY}">${e(caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function strategySourcesHtml(): string {
  const items = STRATEGY_SOURCES.map((s) => {
    const href = safeSourceHref(s.url);
    const url = href ? `<a href="${e(href)}" target="_blank" rel="noopener noreferrer">${e(s.url)}</a>` : e(s.url);
    return `<li style="margin:2px 0;${AVOID}">[${e(s.id)}] ${e(s.label)} · 신뢰도 ${e(s.grade)} · ${url}</li>`;
  }).join('');
  return `<ul style="list-style:none;margin:0;padding:0;font-size:11.5px;color:${INK[600]};line-height:1.6;word-break:break-all">${items}</ul><p style="font-size:11.5px;color:${INK[600]};margin:6px 0 0">신뢰도: A 공식, B 대형 매체, C 2차 자료.</p>`;
}

/**
 * "세트 제조사의 액추에이터 사업화 전략" 카드 HTML. 정적 원고는 항상 출력하고, data 가 없으면 동적 값은 '—'.
 * 모든 텍스트는 escapeHtml, 출처 링크는 safeSourceHref(정적 상수 전용, https)만. 외부 참조·새 hex 없음.
 */
export function buildActuatorStrategyCardHtml(data: ActuatorMapResponse | null | undefined): string {
  const C = STRATEGY_CONTENT;
  const stats = computeStrategyStats(data);
  const diagnosis = stats.hasData
    ? buildDiagnosisLines(stats).map((l) => `<li style="margin:3px 0;${AVOID}">${e(l)}</li>`).join('')
    : `<li style="margin:3px 0">—</li>`;
  const metricRows = buildMetricRows(stats).map((m) => [m.name, m.definition, m.availability, m.source, m.currentValue]);
  const small = `font-size:11.5px;color:${INK[600]};line-height:1.6`;
  const headline = buildHeadlineMessage(stats);

  return [
    `<section class="card" style="background:${WHITE};border:1px solid ${INK[200]};border-radius:14px;padding:20px 22px;margin-top:18px">`,
    PRINT_STYLE,
    `<p class="kicker" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${INK[500]};margin:0 0 6px">${e(C.kicker)}</p>`,
    `<h2 style="font-size:16px;margin:0 0 4px;color:${INK[900]}">${e(C.title)}</h2>`,
    `<p class="meta" style="color:${INK[600]};font-size:12px;margin:0 0 10px">${e(buildSubtitle(stats))}</p>`,
    `<p style="font-size:12.5px;color:${INK[900]};line-height:1.65;margin:0 0 8px;font-weight:600;${AVOID}">${e(headline)}</p>`,
    `<p style="${small};margin:0 0 6px;${AVOID}">${e(C.notice)}</p>`,
    `<p style="font-size:12px;color:${INK[900]};line-height:1.6;margin:0;${AVOID}"><b>${e(C.question)}</b></p>`,
    strategyH3(C.sections.diagnosis),
    `<ul style="margin:0 0 10px;padding-left:18px;font-size:12px;color:${INK[900]};line-height:1.6">${diagnosis}</ul>`,
    strategyTable(
      C.factsHeading,
      C.factColumns,
      C.factRows.map((r) => [r.category, r.subject, r.fact, r.evidence]),
      false
    ),
    `<p style="${small};margin:6px 0 0">${e(C.factsFootnote)}</p>`,
    strategyH3(C.sections.roles),
    `<p style="${small};margin:0 0 4px">${e(C.rolesIntro)}</p>`,
    strategyTable(
      C.sections.roles,
      C.roleColumns,
      C.roles.map((r) => [r.kind, r.item, r.content, r.evidence, r.limits])
    ),
    strategyH3(C.sections.options),
    strategyTable(
      C.sections.options,
      C.optionColumns,
      C.options.map((o) => [o.name, o.core, o.evidence, o.capability, o.risk, o.prerequisite])
    ),
    strategyH3(C.sections.collab),
    strategyTable(
      C.sections.collab,
      C.collabColumns,
      C.collabModels.map((m) => [m.name, m.content, m.pros, m.cons, m.decisions, m.evidence])
    ),
    strategyH3(C.sections.metrics),
    strategyTable(C.sections.metrics, C.metricColumns, metricRows),
    strategyH3(C.sections.questions),
    `<p style="${small};margin:0 0 4px">${e(C.questionsIntro)}</p>`,
    `<ol style="margin:0;padding-left:20px;font-size:12px;color:${INK[900]};line-height:1.6">${C.questions.map((q) => `<li style="margin:3px 0;${AVOID}">${e(q)}</li>`).join('')}</ol>`,
    strategyH3(C.sections.sources),
    strategySourcesHtml(),
    `<p style="${small};margin:14px 0 0">${e(formatFooter(stats))}</p>`,
    '</section>',
  ].join('');
}
