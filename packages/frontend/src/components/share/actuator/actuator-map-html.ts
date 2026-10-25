/**
 * 다운로드 HTML용 액추에이터 카드 — 기본 뷰(타입 × 난이도, 전체 지역, 커버리지 ON, 예측 OFF, 기본 가중치) SVG 문자열
 * + 공급망 표 + 공급사 표. 외부 스크립트/스타일 없음, 모든 텍스트는 escapeHtml, 링크는 safeHref 통과분만.
 * 색: chartColors 팔레트 토큰 + tailwind ink 토큰 hex (tech-trend-report-html.ts 와 동일 값). 새 hex 없음.
 */

import { escapeHtml, safeHref } from '@/lib/tech-trend-report-html';
import type { ActuatorMapResponse, ActuatorSupplyEdge, ActuatorSupplierProduct } from '@/types/actuator-map';
import {
  REGION_GROUPS,
  REGION_GROUP_COLOR,
  REGION_GROUP_LABEL,
  REGION_GROUP_OF,
  REGION_LABEL,
  buildLayout,
  defaultLayoutOptions,
  diamondPath,
  fmtUSD,
  numText,
  priceText,
  type ChartLayout,
} from './actuator-map-layout';

/** tailwind.config ink 토큰 값 (tech-trend-report-html.ts 인라인 스타일과 동일) */
const INK = {
  900: '#1F2328',
  600: '#5C636E',
  500: '#8A909A',
  400: '#9AA1AC',
  300: '#C6CAD0',
  200: '#E6E7EA',
  100: '#ECECEF',
  50: '#F6F7F8',
} as const;
const WHITE = '#fff';

const n1 = (v: number) => v.toFixed(1);
const e = escapeHtml;

export function buildActuatorMapSvg(layout: ChartLayout): string {
  const parts: string[] = [];
  const P = layout.plot;
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="100%" role="img" aria-label="${e(layout.title)} — ${e(layout.meta)}" style="display:block;max-width:100%;height:auto;font-family:inherit">`
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
  // 헐
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
      const fc = r.forecast ? ` fill-opacity="0.35" stroke="${p.color}" stroke-width="1.5" stroke-dasharray="2 2"` : '';
      parts.push(`<circle cx="${n1(p.px)}" cy="${n1(p.py)}" r="5" fill="${p.color}"${fc}/>`);
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

const TABLE_STYLE = `style="border-collapse:collapse;width:100%;font-size:12px"`;
const TH = `style="text-align:left;padding:5px 8px;border-bottom:1px solid ${INK[200]};color:${INK[600]};font-weight:600;white-space:nowrap"`;
const THN = `style="text-align:right;padding:5px 8px;border-bottom:1px solid ${INK[200]};color:${INK[600]};font-weight:600;white-space:nowrap"`;
const TD = `style="padding:5px 8px;border-bottom:1px solid ${INK[100]};vertical-align:top"`;
const TDN = `style="padding:5px 8px;border-bottom:1px solid ${INK[100]};text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap"`;

function legendHtml(hasLG: boolean, hasForecast: boolean): string {
  const items = REGION_GROUPS.map(
    (g) =>
      `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${REGION_GROUP_COLOR[g]}"></i>${e(REGION_GROUP_LABEL[g])}</span>`
  );
  if (hasLG)
    items.push(
      `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><i style="display:inline-block;width:10px;height:10px;background:${INK[900]};transform:rotate(45deg)"></i>LG 기준점</span>`
    );
  items.push(
    `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px"><i style="display:inline-block;width:18px;height:10px;border:1px solid ${INK[400]};background:${INK[100]};border-radius:3px"></i>같은 회사 제품군 커버리지</span>`
  );
  if (hasForecast) items.push(`<span style="margin-right:14px">○ 점선 테두리 = 예측 모델</span>`);
  return `<div style="font-size:11.5px;color:${INK[600]};margin-top:8px">${items.join('')}</div>`;
}

function robotTableHtml(data: ActuatorMapResponse, layout: ChartLayout): string {
  const byId = new Map(layout.points.map((p) => [p.robot.id, p.x] as const));
  const rows = [...data.robots]
    .filter((r) => !r.forecast)
    .map((r) => ({ r, x: byId.get(r.id) ?? null }))
    .sort((a, b) => (b.x ?? -1) - (a.x ?? -1));
  const head = ['로봇', '회사', '지역', '보행', '전신 DOF', '손 DOF', '속도 m/s', '난이도', '무게 kg', '키 cm', '가반하중 kg', '액추에이터 타입', '가격 (등급)', '출처'];
  const th = head.map((h, i) => `<th ${i >= 4 && i <= 10 ? THN : TH}>${e(h)}</th>`).join('');
  const body = rows
    .map(({ r, x }) => {
      const nameTd = r.incomplete ? `style="padding:5px 8px;border-bottom:1px solid ${INK[100]};vertical-align:top;color:${INK[500]}"` : TD;
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
        `<td ${TD}>${e(priceText(r.price))}${r.price ? ` ${e(r.price.conf)}` : ''}</td>`,
        `<td ${TD}><span style="color:${INK[600]}">${e(r.sources.join(' · '))} · ${e(r.actuatorTypeNote)}</span></td>`,
      ];
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');
  return `<div style="overflow-x:auto;margin-top:12px"><table ${TABLE_STYLE}><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function buildSupplyChainTableHtml(edges: ActuatorSupplyEdge[], data: ActuatorMapResponse): string {
  if (edges.length === 0) return `<p class="empty" style="color:${INK[500]};font-size:13px;padding:8px 0">기록된 로봇–공급사 관계가 없습니다.</p>`;
  const regionOf = new Map(data.robots.map((r) => [r.id, REGION_GROUP_OF[r.region]] as const));
  const sorted = [...edges].sort((a, b) => a.company.localeCompare(b.company) || a.robotName.localeCompare(b.robotName) || b.quantity - a.quantity);
  const rows = sorted
    .map((ed) => {
      const color = REGION_GROUP_COLOR[regionOf.get(ed.robotId) ?? 'other'];
      return `<tr><td ${TD}><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px"></i>${e(ed.robotName)} <span style="color:${INK[500]}">${e(ed.company)}</span></td><td ${TD}>${ed.inHouse ? '◆ ' : ''}${e(ed.vendor)}${ed.inHouse ? ' <span style="color:' + INK[500] + '">(자체)</span>' : ''}</td><td ${TD}>${e(ed.type)}</td><td ${TDN}>${ed.quantity}</td><td ${TDN}>${e(ed.confidence)}</td></tr>`;
    })
    .join('');
  return `<div style="overflow-x:auto"><table ${TABLE_STYLE}><thead><tr><th ${TH}>로봇</th><th ${TH}>공급사</th><th ${TH}>액추에이터 타입</th><th ${THN}>수량</th><th ${THN}>신뢰도</th></tr></thead><tbody>${rows}</tbody></table></div><p style="font-size:11.5px;color:${INK[500]};margin:6px 0 0">◆ = 자체 생산(제조사 자신) · 신뢰도 A 공식 ~ D 추정(CI) · 수량 미상은 1</p>`;
}

export function buildSupplierTableHtml(suppliers: ActuatorSupplierProduct[]): string {
  if (suppliers.length === 0) return `<p class="empty" style="color:${INK[500]};font-size:13px;padding:8px 0">등록된 액추에이터 공급사 제품이 없습니다.</p>`;
  const rows = suppliers
    .map(
      (s) =>
        `<tr><td ${TD}><b>${e(s.vendor)}</b></td><td ${TD}>${e(s.country ?? '—')}</td><td ${TD}>${e(s.model)}</td><td ${TD}>${e(s.type)}</td><td ${TDN}>${e(numText(s.peakTorqueNm))}</td><td ${TDN}>${e(numText(s.continuousTorqueNm))}</td><td ${TDN}>${e(numText(s.weightKg))}</td><td ${TDN}>${e(numText(s.diameterMm))}</td><td ${TDN}>${s.priceUsd == null ? '—' : e(fmtUSD(s.priceUsd))}</td><td ${TD}>${e(s.status ?? '—')}</td><td ${TD}>${e(s.targetMarket ?? '—')}</td></tr>`
    )
    .join('');
  return `<div style="overflow-x:auto"><table ${TABLE_STYLE}><thead><tr><th ${TH}>공급사</th><th ${TH}>국가</th><th ${TH}>모델</th><th ${TH}>타입(추정)</th><th ${THN}>피크 토크 Nm</th><th ${THN}>연속 토크 Nm</th><th ${THN}>무게 kg</th><th ${THN}>직경 mm</th><th ${THN}>가격 USD</th><th ${TH}>상태</th><th ${TH}>타깃 시장</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/**
 * 액추에이터 카드 HTML (tech-trend-report-html.ts 의 .card 스타일을 그대로 쓰도록 class="card" 사용).
 * data 가 없으면 '' 를 돌려 카드를 생략한다. 링크는 pageUrl(https 허용 호스트)만 선택적으로 표시한다.
 */
export function buildActuatorMapCardHtml(data: ActuatorMapResponse | null | undefined, pageUrl?: string): string {
  if (!data) return '';
  const layout = buildLayout(data.robots, defaultLayoutOptions(data.difficultyDefault, data.typeOrder));
  const hasLG = data.robots.some((r) => r.isLG && !r.incomplete);
  const hasForecast = data.robots.some((r) => r.forecast);
  const href = safeHref(pageUrl);
  const link = href ? `<p style="font-size:11.5px;color:${INK[500]};margin:6px 0 0"><a href="${e(href)}" target="_blank" rel="noopener noreferrer">인터랙티브 버전(Y축 전환·가중치 조정)은 ARGOS 포털에서</a></p>` : '';

  const chart =
    layout.points.length === 0
      ? `<p class="empty" style="color:${INK[500]};font-size:13px;padding:8px 0">포지션 맵에 올릴 스펙 완결 로봇이 없습니다.</p>`
      : `${buildActuatorMapSvg(layout)}${legendHtml(hasLG, hasForecast)}`;

  return [
    `<section class="card" style="background:${WHITE};border:1px solid ${INK[200]};border-radius:14px;padding:20px 22px;margin-top:18px">`,
    `<p class="kicker" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${INK[500]};margin:0 0 6px">Actuator · Position &amp; Supply Chain</p>`,
    `<h2 style="font-size:16px;margin:0 0 4px;color:${INK[900]}">${e(layout.title)}</h2>`,
    `<p class="meta" style="color:${INK[600]};font-size:12px;margin:0 0 10px">${e(layout.meta)} · ${e(layout.formula)}</p>`,
    chart,
    link,
    `<h3 style="font-size:14px;margin:18px 0 4px;color:${INK[900]}">데이터 표</h3>`,
    `<p class="meta" style="color:${INK[600]};font-size:12px;margin:0">스펙 미등록 로봇은 난이도 없이 표에만 포함됩니다. 출처 등급 A 공식 ~ D 추정(CI).</p>`,
    robotTableHtml(data, layout),
    `<h3 style="font-size:14px;margin:18px 0 6px;color:${INK[900]}">공급망 (로봇 → 액추에이터 공급사)</h3>`,
    buildSupplyChainTableHtml(data.edges, data),
    `<h3 style="font-size:14px;margin:18px 0 6px;color:${INK[900]}">액추에이터 공급사 커버리지</h3>`,
    `<p class="meta" style="color:${INK[600]};font-size:12px;margin:0 0 6px">products(type='actuator') + 로봇에 연결되지 않은 components. 타입은 DB 텍스트에서 추정.</p>`,
    buildSupplierTableHtml(data.suppliers),
    `<p style="font-size:11.5px;color:${INK[500]};margin:14px 0 0;line-height:1.6">X축은 DB 필드(보행·전신 DOF·손 DOF·속도)만으로 계산한 지수. 액추에이터 타입은 components·CI '구동 방식' 근거가 있는 경우만 분류(없으면 '미확인'). 가격은 CI '가격대'·로봇 설명의 기록 값만 사용. 집계 ${e(data.generatedAt)}.</p>`,
    '</section>',
  ].join('');
}
