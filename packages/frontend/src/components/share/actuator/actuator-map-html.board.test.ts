import { describe, expect, it } from 'vitest';
import type { RobotSourcing } from '@/types/actuator-map';
import { buildActuatorMapCardHtml, buildSourcingBoardHtml } from './actuator-map-html';
import { BOARD_COLOR, BOARD_SOFT, buildSourcingBoard } from './actuator-sourcing-board';
import { liveSnapshotTrimmed } from './actuator-sourcing-board.fixtures';
import { computeStrategyStats } from './actuator-strategy';
import { posture, response, robot, seedResponse, sp } from './actuator-strategy.fixtures';

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const FORBIDDEN = ['<script', '<link', '<img', 'src=', '@import', 'url(', 'http://'];
const ALLOWED_CLASSES = new Set(['card', 'kicker', 'meta', 'tbl-wrap', 'empty']);
/** INK + WHITE + 보드 색(tailwind info/pos/neg 및 soft 복제) */
const ALLOWED_HEX = new Set(['#1f2328', '#5c636e', '#8a909a', '#9aa1ac', '#c6cad0', '#e6e7ea', '#ececef', '#f6f7f8', '#fff', ...Object.values(BOARD_COLOR).map((c) => c.toLowerCase()), ...Object.values(BOARD_SOFT).map((c) => c.toLowerCase())]);

const INK_300 = '#c6cad0';
const live = () => liveSnapshotTrimmed();
const html = buildSourcingBoardHtml(live());
const ev = (vendor: string, role: string | null, level: 'module' | 'component' = 'module'): RobotSourcing['externalVendors'][number] => ({ vendor, role, grade: null, url: null, level });

describe('buildSourcingBoardHtml', () => {
  it('data 가 null/undefined 이면 빈 문자열', () => {
    expect(buildSourcingBoardHtml(null)).toBe('');
    expect(buildSourcingBoardHtml(undefined)).toBe('');
  });

  it('구조: h3 제목 → 부제 → 결론 문단 → 막대 1 → 막대 2 → 범례 → ④ 카드 → 상세 표 → 각주', () => {
    const board = buildSourcingBoard(live());
    const order = [board.title, board.description, '25개사 중 ', 'aria-label="설계: ', 'aria-label="조달 방식: ', '>설계</p><ul', '>조달 방식</p><ul', '④ 액추에이터를 남에게 파나?', '상세 표 (회사별 조달 방식)', '<table', '</table>', '출처: ARGOS 조달 태세 재판정 데이터'].map((t) => html.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html.startsWith('<h3')).toBe(true);
    expect(count(html, /<svg /g)).toBe(0);
    expect(count(html, /role="img"/g)).toBe(2);
    expect(count(html, /role="group"/g)).toBe(0);
    expect(count(html, /<caption /g)).toBe(1);
    expect(count(html, /<th scope="col"/g)).toBe(5);
    expect(count(html, /<th scope="row"/g)).toBe(4);
    // 상세 표는 JS 없이 펼친 채로 들어간다 (토글 버튼·aria-expanded 없음)
    expect(html).not.toMatch(/<button|aria-expanded/);
  });

  it('결론 문장은 집계 함수 결과와 같다 (strong 은 <b>)', () => {
    const board = buildSourcingBoard(live());
    const para = html.match(/<p style="[^"]*">(25개사 중 .*?)<\/p>/)![1]!;
    expect(para).toBe(
      '25개사 중 <b>설계를 외부에 맡긴 곳 2</b>, <b>제조를 외부에 맡긴 곳 2</b>, <b>속 부품을 사는 곳 2</b>.<b> 휴머노이드 액추에이터를 파는 세트 제조사는 없음.</b>'
    );
    expect(para.replace(/<\/?b>/g, '')).toBe(board.conclusionText);
    expect(count(para, /<b>/g)).toBe(board.conclusion.filter((s) => s.strong).length);
  });

  it('막대·범례: 숫자·라벨·회사명(앱 정렬 순서, 괄호 안 공급사)·④ 카드 문장이 §7 과 같다', () => {
    const board = buildSourcingBoard(live());
    const chart = html.slice(html.indexOf('<div style="margin:0;'), html.indexOf('④ 액추에이터를 남에게 파나?'));
    const text = chart.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
    for (const t of [
      `① 설계 — 관절 모듈을 누가 설계했나? (회사 25개사 · 로봇 ${board.robotCount}기 기준)`,
      '② 조달 방식 — 어떻게 조달하나?',
      '자체 설계 17개사',
      '외부 설계 2개사: Diligent Robotics (Kinova); NEURA Robotics (Schaeffler)',
      '공개 근거 없음 6개사: Aeolus Robotics, Engineered Arts, Honda, Savioke, SoftBank Robotics, Toyota',
      '자체 생산 13개사: Unitree Robotics, 1X Technologies, Agibot, Figure AI, Fourier Intelligence, UBTECH, Apptronik, LimX Dynamics, Xiaomi, Agility Robotics, Kepler Robot, Mentee Robotics, Sanctuary AI',
      '속 부품만 구매 2개사: PAL Robotics (Harmonic Drive 감속기, TQ-Group (RoboDrive) 모터); Rainbow Robotics (maxon 모터)',
      '제조 위탁 2개사: Tesla (Tuopu Group, Sanhua Intelligent Controls 위탁제조); Boston Dynamics (Hyundai Mobis 양산 공급)',
      '완성 모듈 구매 2개사: Diligent Robotics (Kinova); NEURA Robotics (Schaeffler)',
      '남이 만든 모듈을 사서 씀',
      '근거가 없을 뿐, 외부 조달이라는 뜻은 아님',
    ])
      expect(text).toContain(t);
    expect(html).toContain('aria-label="설계: 자체 설계 17, 외부 설계 2, 공개 근거 없음 6 (25개사)"');
    expect(html).toContain('aria-label="조달 방식: 자체 생산 13, 속 부품만 구매 2, 제조 위탁 2, 완성 모듈 구매 2, 공개 근거 없음 6 (25개사)"');
    expect(html).toContain('<b>④ 액추에이터를 남에게 파나?</b> 휴머노이드용 액추에이터(관절 모듈): <b>0개사</b> · 소형·사족용 모터만 판매: Unitree Robotics(GO-M8010-6), Xiaomi(CyberGear Micro Motor)');
    expect(chart).not.toContain('LG Electronics');
  });

  it('표 셀에 §6 문구가 있다', () => {
    for (const t of [
      '13개사: 없음',
      'Rainbow Robotics: maxon 모터',
      'PAL Robotics: Harmonic Drive 감속기, TQ-Group (RoboDrive) 모터',
      '(모듈이 아닌 하위 부품)',
      'Unitree Robotics: GO-M8010-6',
      'Xiaomi: CyberGear Micro Motor',
      '휴머노이드 관절 모듈은 판매 안 함',
      'Tesla: Tuopu Group, Sanhua Intelligent Controls(위탁제조)',
      'Boston Dynamics: Hyundai Mobis(양산 공급)',
      '4NE1: Schaeffler',
      'Moxi: Kinova',
      '공개 근거 없음',
      'Unitree Robotics(5)',
    ])
      expect(html).toContain(t.replace(/&/g, '&amp;'));
    expect(html.slice(html.indexOf('<table'), html.indexOf('</table>'))).not.toContain('부품 공급');
    expect(html).not.toContain('M107');
    expect(html).not.toContain('LG Electronics');
    expect(html).not.toMatch(/외부 모듈 구매|외부 제조·양산/);
    expect(count(html, />확인 안 됨</g)).toBe(2);
  });

  it('각주 1~3 이 모두 들어가고 각주 2 의 숫자는 computeStrategyStats 와 같다', () => {
    const st = computeStrategyStats(live());
    expect(html).toContain('회사 기준, LG 제외');
    expect(html).toContain(`판정 가능 ${st.sourcing.companies.judged}개사 중 ${st.sourcing.companies.confirmed}개사이며 LG 포함`);
    expect(html).toContain(`로봇 기준(${st.robotCount}기, 예측 모델 제외, LG 1기 포함): 자체 확인 `);
    expect(html).not.toContain('요약 막대');
    expect(html).toContain('수요 사례에 외부 공급사가 기록된 자체 설계 회사: Agibot(Quanzhibo (泉智博), 근거 B)');
    expect(html).toContain('Fourier Intelligence 제품 1개 (FSA 2.0)');
    expect(html).toContain('Agibot 제품 3개 (PowerFlow R52, PowerFlow R86-2, PowerFlow R86-3)');
    expect(html).toContain('(일반 지식)');
  });

  it('외부 참조·이벤트 속성·:hover 규칙이 없다', () => {
    for (const h of [html, buildSourcingBoardHtml(seedResponse()), buildSourcingBoardHtml(response([], []))]) {
      for (const bad of FORBIDDEN) expect(h.toLowerCase()).not.toContain(bad);
      expect(h).not.toMatch(/\son[a-z]+\s*=/i);
      expect(h).not.toContain(':hover');
      expect(h).not.toContain('<style');
      expect(h).not.toMatch(/xmlns|<foreignObject|<svg/i);
    }
  });

  it('class 는 허용된 것(card, kicker, meta, tbl-wrap, empty)뿐이고 색은 INK·보드 색뿐이다', () => {
    for (const h of [html, buildSourcingBoardHtml(response([], [])), buildSourcingBoardHtml(response([robot('R', 'LG Electronics', [], { isLG: true })], []))]) {
      for (const m of h.matchAll(/class="([^"]*)"/g)) for (const c of m[1]!.split(/\s+/)) expect(ALLOWED_CLASSES.has(c)).toBe(true);
    }
    for (const m of html.matchAll(/#[0-9a-fA-F]{3,6}\b/g)) expect(ALLOWED_HEX.has(m[0].toLowerCase())).toBe(true);
    // 허용 목록 밖의 hex 는 실패해야 한다 (검사 자체의 건전성)
    expect(ALLOWED_HEX.has('#abcdef')).toBe(false);
    const chart = html.slice(html.indexOf('<div style="margin:0;'), html.indexOf('④ 액추에이터를 남에게 파나?'));
    expect(chart).not.toContain('class=');
    for (const hex of [BOARD_SOFT.info, BOARD_COLOR.G1, BOARD_COLOR.G2, BOARD_COLOR.G3, INK_300]) expect(chart.toLowerCase()).toContain(hex.toLowerCase());
  });

  it('모든 동적 텍스트가 escapeHtml 을 거친다 (회사명·로봇명·vendor·noteKo·제품·targetMarket)', () => {
    const X = '<i>"&x</i>';
    const XE = '&lt;i&gt;&quot;&amp;x&lt;/i&gt;';
    const d = response(
      [
        robot(`Rob${X}`, `Seller${X}`, [], posture('in_house_sells')),
        robot(`Buyer${X}`, `BuyCo${X}`, [], posture('external', { externalVendors: [ev(`Vend${X}`, 'component supply')], noteKo: `note${X}` })),
        robot(`Tes${X}`, `Mfg${X}`, [], posture('external', { externalVendors: [ev(`Mfr${X}`, 'contract manufacturing')] })),
        robot('Part', `Part${X}`, [], posture('in_house', { componentSourcing: true, externalVendors: [ev(`Comp${X}`, null, 'component')] })),
      ],
      [sp(`Seller${X}`, `Model${X}`, { targetMarket: `tm${X}` })]
    );
    const h = buildSourcingBoardHtml(d);
    expect(h).not.toContain('<i>');
    expect(h).not.toContain(X);
    for (const piece of [`Seller${XE}`, `BuyCo${XE}`, `Vend${XE}`, `note${XE}`, `Mfg${XE}`, `Mfr${XE}`, `Comp${XE}`, `Model${XE}`, `tm${XE}`, `Buyer${XE}`]) expect(h).toContain(piece);
    // 회사 tooltip(title) 도 이스케이프된다
    expect(h).toContain(`title="Rob${XE}(B)"`);
  });

  it('같은 입력이면 같은 출력 (결정적)', () => {
    expect(buildSourcingBoardHtml(live())).toBe(buildSourcingBoardHtml(live()));
    expect(buildActuatorMapCardHtml(live())).toBe(buildActuatorMapCardHtml(live()));
  });

  it('대상 회사가 없으면 제목과 안내 한 줄만 (결론·차트 없음)', () => {
    const h = buildSourcingBoardHtml(response([robot('CLOiD', 'LG Electronics', [], { isLG: true })], []));
    expect(h).toContain('표시할 회사가 없습니다');
    expect(h).toContain('class="empty"');
    expect(h).not.toContain('개사 중');
    expect(h).not.toContain('role="img"');
    expect(h).not.toContain('<table');
  });

  it('막대 블록·④ 카드·표 행은 쪼개지지 않고(break-inside:avoid) 표는 tbl-wrap 으로 감싼다', () => {
    // 결론 문단 1 + 막대 블록 1 + ④ 카드 1 + 표 행 4
    expect(count(html, /break-inside:avoid;page-break-inside:avoid/g)).toBeGreaterThanOrEqual(1 + 1 + 1 + 4);
    expect(html).toContain('<div class="tbl-wrap" style="overflow-x:auto"><table');
    expect(html).toContain('-webkit-print-color-adjust:exact;print-color-adjust:exact');
  });

  it('조달 태세 요약 막대(4단계 누적 막대)는 없다', () => {
    expect(html).not.toContain('조달 태세 요약');
    expect(buildActuatorMapCardHtml(live())).not.toContain('조달 태세 요약');
  });
});

describe('buildActuatorMapCardHtml — 보드 삽입 위치', () => {
  const card = buildActuatorMapCardHtml(live());
  const title = buildSourcingBoard(live()).title;

  it('섹션 순서: 로봇 데이터 표 → 보드 → 외부 조달 관계 표 → 수요 사례 표 → 공급사 제품 맵 → 공급사 커버리지', () => {
    const idx = ['핵심 메시지: ', '>데이터 표<', title, '공급망 (외부 조달 관계 · 공개 채택 사례)', '외부 조달 관계 표', '수요 사례 표 (외부 액추에이터 공개 채택)', '액추에이터 공급사 커버리지'].map((t) => card.indexOf(t));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(count(card, /<h3 [^>]*>로봇 제조사 /g)).toBe(1);
  });

  it('보드 결론은 헤드라인과 같은 데이터에서 나온다 (카드 안에 보드 HTML 이 그대로 들어간다)', () => {
    expect(card).toContain(buildSourcingBoardHtml(live()));
    const st = computeStrategyStats(live());
    expect(card).toContain(`핵심 메시지: 로봇 제조사 현황을 보면 액추에이터는 자체 개발 확인 ${st.sourcing.inHouse}기`);
    expect(card).toContain(`로봇 기준(${st.sourcing.robots}기, 예측 모델 제외, LG 1기 포함)`);
  });

  it('카드 전체에서도 외부 참조가 없고 class 는 허용된 것뿐', () => {
    for (const bad of FORBIDDEN) expect(card.toLowerCase()).not.toContain(bad);
    for (const m of card.matchAll(/class="([^"]*)"/g)) for (const c of m[1]!.split(/\s+/)) expect(ALLOWED_CLASSES.has(c)).toBe(true);
  });

  it('data 가 null 이면 카드 전체가 빈 문자열', () => {
    expect(buildActuatorMapCardHtml(null)).toBe('');
  });
});
