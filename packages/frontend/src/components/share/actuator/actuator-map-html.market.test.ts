import { describe, expect, it } from 'vitest';
import { CATEGORY_PALETTE, CHART_HUE_MUTED } from '@/app/events/wrc2026/components/chartColors';
import {
  buildActuatorMapCardHtml,
  buildActuatorMapSvg,
  buildAdoptionTableHtml,
  buildHullIndexTableHtml,
  buildSourcingSummaryHtml,
  buildSupplierMarketMapSvg,
  buildSupplyChainTableHtml,
} from './actuator-map-html';
import { badgeTextTone, buildLayout, defaultLayoutOptions, hullIndexRows, hullLabelDot } from './actuator-map-layout';
import { buildMarketLayout } from './actuator-market-layout';
import { INK, SEGMENT_LABEL, SEGMENT_ORDER } from './actuator-sourcing';
import { buildHeadlineMessage, computeStrategyStats } from './actuator-strategy';
import { adoption, posture, response, robot, seedResponse, seedSuppliers44, sp } from './actuator-strategy.fixtures';

const XSS = '<img src=x onerror=alert(1)>"';
const FORBIDDEN = ['<script', '<link', '<img', 'src=', '@import', 'url(', 'http://'];
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const seed44 = seedSuppliers44();

describe('buildSupplierMarketMapSvg', () => {
  const data = seed44 ? { ...seedResponse(), suppliers: seed44 } : seedResponse();
  const layout = buildMarketLayout(data.suppliers, data.adoptions);
  const svg = buildSupplierMarketMapSvg(layout);

  it('<svg 하나, 점마다 <g role="img" aria-label> 와 <title>, 클래스·스크립트 없음', () => {
    expect(count(svg, /<svg[\s>]/g)).toBe(1);
    expect(count(svg, /<\/svg>/g)).toBe(1);
    expect(count(svg, /<g role="img" aria-label="/g)).toBe(layout.points.length);
    expect(count(svg, /<title>/g)).toBeGreaterThanOrEqual(layout.points.length);
    expect(svg).not.toMatch(/\sclass=/);
    for (const bad of FORBIDDEN) expect(svg.toLowerCase()).not.toContain(bad);
  });

  it('밴드·빈 구간 주석·축 제목 문구', () => {
    if (seed44) expect(svg).toContain('LG AXIUM Φ40–Φ120 (9종)');
    else expect(svg).toContain('LG AXIUM');
    expect(svg).toContain('(가설)');
    expect(svg).toContain('가격 (USD, 로그 스케일)');
    expect(svg).toContain('피크 토크 (Nm, 로그)');
    if (seed44) expect(svg).toContain('stroke-dasharray="6 4"');
  });

  it('결정적: 같은 입력은 같은 출력', () => {
    expect(buildSupplierMarketMapSvg(buildMarketLayout(data.suppliers, data.adoptions))).toBe(svg);
  });

  it('XSS: 공급사·모델명의 태그는 이스케이프된다', () => {
    const l = buildMarketLayout([sp(XSS, XSS, { peakTorqueNm: 10, priceUsd: 100 }), sp('b', 'b', { peakTorqueNm: 20 })], []);
    const out = buildSupplierMarketMapSvg(l);
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('빈 레이아웃이면 <p class="empty">', () => {
    const out = buildSupplierMarketMapSvg(buildMarketLayout([], []));
    expect(out.startsWith('<p class="empty"')).toBe(true);
    expect(out).not.toContain('<svg');
  });

  (seed44 ? it : it.skip)('시드 44개: 점 36개(13+23)와 7개 제외 목록', () => {
    const l = buildMarketLayout(seed44!, []);
    const out = buildSupplierMarketMapSvg(l);
    expect(count(out, /<g role="img"/g)).toBe(36);
    expect(l.excludedNoTorque).toHaveLength(7);
  });
});

const badgeFill = (colorIndex: number) => (badgeTextTone(colorIndex) === 'light' ? '#fff' : INK[900]);

describe('buildActuatorMapSvg — 조달 태세 색', () => {
  const r = (name: string, company: string, p: Parameters<typeof posture>[0], dof: number) =>
    robot(name, company, [], { dof, handDof: 4, speed: 1, actuatorTypeLabel: '직구동/QDD', ...posture(p) });
  const OPT = { ...defaultLayoutOptions({ L: 1, D: 1, H: 1, S: 1 }, []), yAxis: 'type' as const, hull: true };
  const hullPaths = (svg: string) => [...svg.matchAll(/<path d="[^"]*" fill="([^"]*)" fill-opacity="0\.12" stroke="([^"]*)" stroke-opacity="0\.7" stroke-width="1\.2"\/>/g)].map((m) => ({ fill: m[1]!, stroke: m[2]! }));

  it('확인 불가는 흰 채움 + 회색 링, 그 외는 태세 색', () => {
    const robots = [r('a', 'Co', 'in_house', 20), r('b', 'Co', 'in_house_sells', 30), r('c', 'Co', 'external', 40), r('d', 'Co', 'unknown', 25)];
    const svg = buildActuatorMapSvg(buildLayout(robots, OPT));
    for (const c of CATEGORY_PALETTE.slice(0, 3)) expect(svg).toContain(`fill="${c}"`);
    expect(svg).toContain(`r="4.5" fill="#fff" stroke="${CHART_HUE_MUTED}" stroke-width="2"`);
    expect(svg).toContain(`<path d="`);
  });

  it('hull 은 회사 구분 팔레트 색(회색 아님), 겹치는 두 회사는 서로 다른 색, 라벨은 잉크색 + 앞의 미니 배지 = hull 색·같은 번호', () => {
    const robots = [r('a1', 'Alpha Co', 'in_house', 20), r('a2', 'Alpha Co', 'in_house', 22), r('b1', 'Beta Co', 'external', 21), r('b2', 'Beta Co', 'external', 23)];
    const layout = buildLayout(robots, OPT);
    const svg = buildActuatorMapSvg(layout);
    const paths = hullPaths(svg);
    expect(paths).toHaveLength(2);
    for (const p of paths) {
      expect(CATEGORY_PALETTE).toContain(p.fill);
      expect(p.stroke).toBe(p.fill);
      expect(p.fill).not.toBe(CHART_HUE_MUTED);
    }
    expect(paths[0]!.fill).not.toBe(paths[1]!.fill);
    for (const h of layout.hulls) {
      const dot = hullLabelDot(h);
      expect(svg).toContain(`<g aria-hidden="true"><circle cx="${dot.cx.toFixed(1)}" cy="${dot.cy.toFixed(1)}" r="7" fill="${h.color}" stroke="#fff" stroke-width="1.5"/><text x="${dot.cx.toFixed(1)}" y="${(dot.cy + 3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="${badgeFill(h.colorIndex)}">${h.index}</text></g><text x="`);
      expect(svg).toContain(`font-weight="600" fill="${INK[900]}" stroke="#fff" stroke-width="3" paint-order="stroke">${h.company}`);
    }
  });

  it('결정적, 이벤트 속성·:hover·금지 문자열 없음', () => {
    const robots = [r('a1', 'Alpha Co', 'in_house', 20), r('a2', 'Alpha Co', 'in_house', 22), r('b1', 'Beta Co', 'external', 21), r('b2', 'Beta Co', 'external', 23)];
    const svg = buildActuatorMapSvg(buildLayout(robots, OPT));
    expect(buildActuatorMapSvg(buildLayout(robots, OPT))).toBe(svg);
    expect(svg).not.toMatch(/onpointer|onfocus|onmouse|:hover/i);
    for (const bad of FORBIDDEN) expect(svg.toLowerCase()).not.toContain(bad);
  });
});

describe('buildActuatorMapCardHtml', () => {
  const data = seed44 ? { ...seedResponse(), suppliers: seed44 } : seedResponse();
  const html = buildActuatorMapCardHtml(data, 'https://argos.example.com/share/tech-trend/actuator');

  it('카드 순서: 헤드라인 → 조달 태세 요약 → 포지션 맵 → 로봇 표 → 공급망 → 공급사 제품 맵 → 공급사 표 → 각주', () => {
    const idx = [
      html.indexOf('핵심 메시지:'),
      html.indexOf('조달 태세 요약'),
      html.indexOf('<svg'),
      html.indexOf('>데이터 표<'),
      html.indexOf('공급망 (외부 조달 관계'),
      html.indexOf('공급사 제품 맵 — 피크 토크 × 가격'),
      html.indexOf('액추에이터 공급사 커버리지'),
      html.indexOf('조달 태세: 자체 개발 확인은 근거 등급 A·B만 세고'),
    ];
    for (let i = 1; i < idx.length; i++) expect(idx[i]!).toBeGreaterThan(idx[i - 1]!);
    expect(idx[0]).toBeGreaterThan(-1);
  });

  it('헤드라인은 전략 카드와 같은 함수의 문장', () => {
    const headline = buildHeadlineMessage(computeStrategyStats(data));
    expect(html).toContain(headline.replace(/&/g, '&amp;'));
  });

  it('요약 막대: 4단계 범례, 확인 불가 중 자체 개발 추정, 확인 A/B 건수', () => {
    const bar = buildSourcingSummaryHtml(data.robots);
    for (const l of ['자체 개발(확인)', '자체 개발+외판', '외부 조달·혼합', '확인 불가']) expect(bar).toContain(l);
    expect(bar).toContain('이 중 자체 개발 추정 1기');
    expect(bar).toContain('근거 등급 A 2기 / B 5기');
    expect(buildSourcingSummaryHtml([])).toBe('');
  });

  it('외부 참조 없음, 링크는 pageUrl 뿐 (데이터의 URL 은 링크가 되지 않는다)', () => {
    for (const bad of FORBIDDEN) expect(html.toLowerCase()).not.toContain(bad);
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual([]); // pageUrl 은 허용 호스트(safeHref)일 때만 링크가 된다 — 데이터의 URL 은 어떤 경우에도 링크가 되지 않는다
    const evil = seedResponse();
    evil.adoptions = [adoption({ sources: [{ url: 'https://evil.example/x', title: 'T' }, { url: 'http://plain.example/y', title: 'U' }] })];
    const out = buildActuatorMapCardHtml(evil);
    expect(out).not.toContain('href="https://evil.example');
    expect(out).toContain('https://evil.example/x');
    expect(out).not.toContain('http://plain.example');
  });

  it('범례 6칩 이상 + 가설: 세그먼트 7종 라벨, 점선 사각형 = 가설 구간', () => {
    for (const s of SEGMENT_ORDER) expect(html).toContain(SEGMENT_LABEL[s]);
    expect(html).toContain('점선 사각형 = 가설 구간');
    expect(html).toContain('LG AXIUM 추정 밴드(가설)');
    expect(html).toContain('AXIUM 공개 타깃: 자사 CLOiD(2026) → 외부 파트너(2027~) → 산업용 고토크(2030)');
  });

  it('공급망 표 2개 + 확인 불가/자체 확인 문단, 로봇 표에 조달 태세 열', () => {
    expect(html).toContain('외부 조달 관계 표');
    expect(html).toContain('수요 사례 표 (외부 액추에이터 공개 채택)');
    expect(html).toContain('확인 불가 로봇 1기: Walker S(UBTech) 자체 개발 추정');
    expect(html).toContain('자체 개발 확인 회사 ');
    expect(html).toContain('<th style="text-align:left;padding:5px 8px;border-bottom:1px solid #E6E7EA;color:#5C636E;font-weight:600;white-space:nowrap">조달 태세</th>');
    expect(html).toContain('부품(모터·감속기) 외부 조달: maxon');
    expect(html).toContain('자체 개발(확인·B)');
    expect(html).not.toContain('(Q4)');
  });

  it('외부 조달 관계 표는 자체 개발 엣지를 넣지 않는다 / 수요 사례 표 빈 경우', () => {
    const t = buildSupplyChainTableHtml([
      ...data.edges,
      { ...data.edges[0]!, vendor: 'SelfCo', basis: 'self', inHouse: true },
    ]);
    expect(t).not.toContain('SelfCo');
    expect(t).toContain('양산 단계 액추에이터 공급');
    expect(buildAdoptionTableHtml([])).toContain('class="empty"');
  });

  it('미등록 공급사 각주, 인쇄 회피 속성, 이스케이프', () => {
    expect(html).toContain('제품 스펙 미등록 공급사');
    expect(html).toContain('break-inside:avoid;page-break-inside:avoid');
    expect(count(html, /<tr[\s>]/g)).toBe(count(html, /<\/tr>/g));
    expect(count(html, /<table[\s>]/g)).toBe(count(html, /<\/table>/g));
    const evil = response([robot(XSS, XSS, [], posture('unknown', { noteKo: XSS }))], [sp(XSS, XSS, { targetMarket: XSS })], { adoptions: [adoption({ robotName: XSS, company: XSS })] });
    const out = buildActuatorMapCardHtml(evil);
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('인쇄 규칙: 카드 <style> 하나, 모든 표 래퍼에 tbl-wrap, 외부 참조 없음', () => {
    expect(count(html, /<style>@media print\{/g)).toBe(1);
    expect(count(html, /class="tbl-wrap"/g)).toBe(count(html, /<table[\s>]/g));
    const css = /<style>([^<]*)<\/style>/.exec(html)![1]!;
    expect(css).toContain('.tbl-wrap{overflow:visible !important}');
    expect(css).toContain('overflow-wrap:break-word');
    expect(css).toContain('white-space:normal !important');
    for (const bad of ['url(', '@import', 'http://', 'src=']) expect(css).not.toContain(bad);
  });

  it('범례: 회사 커버리지 문구 반영, 번호 배지 칩, 옛 문구 없음, 이벤트 속성·:hover 없음', () => {
    expect(html).toContain('회사 커버리지(색은 회사 구분용, 의미 없음)');
    expect(html).toContain('영역 색은 회사 구분용으로 겹치는 영역끼리 다른 색을 자동 배정한 것이며 의미는 없습니다.');
    expect(html).toContain('영역 안의 번호 배지와 회사명 라벨 앞의 번호는 같은 번호이며, 색인 표에서 번호로 회사를 찾을 수 있습니다.');
    expect(html).not.toContain('회사명 라벨 앞의 색 점이 영역 색을 가리');
    expect(html).toContain('지역은 색으로 구분하지 않습니다.');
    expect(html).not.toContain('같은 회사 제품군 커버리지');
    expect(html).not.toMatch(/onpointer|onfocus|onmouse|:hover/i);
  });

  it('시드 데이터: hull 색은 팔레트 안이고 라벨 앞 미니 배지 색·번호와 같다', () => {
    const layout = buildLayout(data.robots, defaultLayoutOptions(data.difficultyDefault, data.typeOrder));
    const svg = buildActuatorMapSvg(layout);
    for (const h of layout.hulls) {
      expect(CATEGORY_PALETTE).toContain(h.color);
      expect(svg).toContain(`fill="${h.color}" fill-opacity="0.12" stroke="${h.color}"`);
      expect(svg).toContain(`r="7" fill="${h.color}" stroke="#fff" stroke-width="1.5"/><text`);
      expect(svg).toContain(`fill="${INK[900]}" stroke="#fff" stroke-width="3" paint-order="stroke">${h.company}`);
    }
  });

  it('data 가 없으면 빈 문자열, 결정적', () => {
    expect(buildActuatorMapCardHtml(null)).toBe('');
    expect(buildActuatorMapCardHtml(data, 'https://argos.example.com/share/tech-trend/actuator')).toBe(html);
  });

  it('구 스키마(정규화 전 값)도 예외 없이 생성: 조달 태세 필드가 비어도 크래시하지 않는다', () => {
    const d = seedResponse();
    d.adoptions = [];
    d.vendorMarkets = [];
    const out = buildActuatorMapCardHtml(d);
    expect(out).toContain('외부 채택 사례는 아직 수집되지 않았습니다.');
    expect(out).toContain('공개 채택 사례는 아직 수집되지 않았습니다.');
  });
});

describe('영역 번호 배지 + 색인 표 (정적 HTML)', () => {
  // 시드는 회사당 로봇 1기라 hull 이 없다 — 겹치는 회사 3곳(로봇 4·3·2기)으로 구성
  const mk = (name: string, company: string, p: Parameters<typeof posture>[0], dof: number) =>
    robot(name, company, [], { dof, handDof: 4, speed: 1, actuatorTypeLabel: '직구동/QDD', ...posture(p) });
  const robots = [
    ...[20, 24, 28, 32].map((d, i) => mk(`Alpha ${i}`, 'Alpha Co', i === 0 ? 'in_house_sells' : 'in_house', d)),
    ...[22, 26, 30].map((d, i) => mk(`Beta ${i}`, 'Beta Co', 'external', d)),
    ...[40, 44].map((d, i) => mk(`Gamma ${i}`, 'Gamma Co', 'unknown', d)),
    mk('Solo 0', 'Solo Co', 'in_house', 35),
  ];
  const data = response(robots, [], { typeOrder: [] });
  const layout = buildLayout(data.robots, defaultLayoutOptions(data.difficultyDefault, data.typeOrder));
  const svg = buildActuatorMapSvg(layout);
  const html = buildActuatorMapCardHtml(data, 'https://argos.example.com/share/tech-trend/actuator');
  const index = buildHullIndexTableHtml(layout);
  const rows = hullIndexRows(layout.hulls);

  it('시드에 hull 이 있다 (이후 단언이 공허하지 않도록)', () => {
    expect(layout.hulls).toHaveLength(3);
    expect(hullIndexRows(layout.hulls).map((x) => x.company)).toEqual(['Alpha Co', 'Beta Co', 'Gamma Co']);
  });

  it('배지 그룹 수 = hull 수, 반경 9·hull 색·흰 테두리 1.5·숫자 11px 굵게, 숫자 = index', () => {
    expect(count(svg, /<g role="img" aria-label="영역 /g)).toBe(layout.hulls.length);
    expect(count(svg, /aria-label="영역 /g)).toBe(layout.hulls.length);
    for (const h of layout.hulls) {
      const g = `<g role="img" aria-label="영역 ${h.index}: ${h.company}"><circle cx="${h.badge.x.toFixed(1)}" cy="${h.badge.y.toFixed(1)}" r="9" fill="${h.color}" stroke="#fff" stroke-width="1.5"/>`;
      expect(svg).toContain(g);
      expect(svg).toContain(`text-anchor="middle" font-size="11" font-weight="700" fill="${badgeFill(h.colorIndex)}">${h.index}</text></g>`);
    }
  });

  it('배지는 hull path·가격 막대 다음, 점 그룹 앞 레이어', () => {
    const firstBadge = svg.indexOf('aria-label="영역 ');
    const lastHullPath = svg.lastIndexOf('fill-opacity="0.12"');
    const firstPoint = svg.indexOf('aria-label="Alpha 0');
    expect(firstBadge).toBeGreaterThan(lastHullPath);
    expect(firstPoint).toBeGreaterThan(firstBadge);
  });

  it('범례에 번호 배지 칩이 있다', () => {
    expect(html).toContain('번호 배지 = 색인 번호');
  });

  it('색인 표: tbody tr 수 = hull 수, 번호 오름차순, 번호 칸 배경색 = SVG 배지 hull 색', () => {
    const tbody = /<tbody>([\s\S]*)<\/tbody>/.exec(index)![1]!;
    const trs = tbody.split('<tr ').slice(1);
    expect(trs).toHaveLength(layout.hulls.length);
    expect(count(index, /<thead>/g)).toBe(1);
    trs.forEach((tr, i) => {
      const row = rows[i]!;
      expect(row.index).toBe(i + 1);
      expect(tr).toContain(`background:${row.color};color:${badgeFill(row.colorIndex)}`);
      expect(tr).toContain(`line-height:1;-webkit-print-color-adjust:exact;print-color-adjust:exact">${row.index}</span>`);
      expect(tr).toContain(`<b>${row.company}</b>`);
      expect(tr).toContain(`${row.robotCount}기`);
      expect(tr).toContain(row.postureLabel);
      expect(svg).toContain(`aria-label="영역 ${row.index}: ${row.company}"><circle`);
      expect(svg).toContain(`r="9" fill="${row.color}"`);
    });
    expect(index).toContain('break-inside:avoid;page-break-inside:avoid');
  });

  it('열: 번호·회사·로봇 수·조달 태세·포함 로봇, 제목·caption·각주', () => {
    for (const th of ['번호', '회사', '로봇 수', '조달 태세', '포함 로봇']) expect(index).toContain(`>${th}</th>`);
    expect(index).toContain('영역 색인(차트의 번호 배지와 같은 번호)');
    expect(index).toContain('<caption style="position:absolute');
    expect(index).toContain('로봇 2기 이상 회사만 그려집니다');
    expect(index).toContain('자체 개발+외판 &gt; 자체 개발 &gt; 외부 조달·혼합 &gt; 확인 불가');
    expect(index).toContain('class="tbl-wrap"');
  });

  it('카드 조립 순서: SVG → 영역 색인 → 범례 → 데이터 표', () => {
    const idx = [html.indexOf('<svg'), html.indexOf('영역 색인('), html.indexOf('번호 배지 = 색인 번호'), html.indexOf('>데이터 표<')];
    for (let i = 1; i < idx.length; i++) expect(idx[i]!).toBeGreaterThan(idx[i - 1]!);
    expect(idx[0]).toBeGreaterThan(-1);
  });

  it('XSS: 로봇·회사 이름의 태그는 색인 표와 배지 라벨에서도 이스케이프된다', () => {
    const mk = (name: string, dof: number) => robot(name, XSS, [], { dof, handDof: 4, speed: 1, actuatorTypeLabel: '직구동/QDD', ...posture('in_house') });
    const l = buildLayout([mk('XSS', 20), mk('XSS 2', 30), mk('XSS 3', 40), mk(XSS, 50)], { ...defaultLayoutOptions({ L: 1, D: 1, H: 1, S: 1 }, []), yAxis: 'type' as const });
    expect(l.hulls).toHaveLength(1);
    const out = buildHullIndexTableHtml(l) + buildActuatorMapSvg(l);
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(out).toContain('title="XSS, XSS 2, XSS 3, &lt;img');
  });

  it('금지 문자열·이벤트 속성·:hover 없음, 결정적, 구조 단언 유지', () => {
    for (const bad of FORBIDDEN) expect(index.toLowerCase()).not.toContain(bad);
    expect(index).not.toMatch(/onpointer|onfocus|onmouse|:hover|\sclass="(?!tbl-wrap)/i);
    expect(buildHullIndexTableHtml(buildLayout(data.robots, defaultLayoutOptions(data.difficultyDefault, data.typeOrder)))).toBe(index);
    expect(buildActuatorMapCardHtml(data, 'https://argos.example.com/share/tech-trend/actuator')).toBe(html);
    expect(count(html, /class="tbl-wrap"/g)).toBe(count(html, /<table[\s>]/g));
    expect(count(html, /<tr[\s>]/g)).toBe(count(html, /<\/tr>/g));
    expect(count(html, /<style>/g)).toBe(1);
  });

  it('hull 이 없으면 색인·배지·범례 칩이 모두 없다', () => {
    const none = buildLayout(data.robots, { ...defaultLayoutOptions(data.difficultyDefault, data.typeOrder), hull: false });
    expect(none.hulls).toHaveLength(0);
    expect(buildHullIndexTableHtml(none)).toBe('');
    const solo = response([robot('Only', 'Solo Co', [], { dof: 20, handDof: 4, speed: 1, actuatorTypeLabel: '직구동/QDD', ...posture('in_house') })], []);
    const out = buildActuatorMapCardHtml(solo);
    expect(out).not.toContain('영역 색인');
    expect(out).not.toContain('aria-label="영역 ');
    expect(out).not.toContain('번호 배지 = 색인 번호');
  });
});
