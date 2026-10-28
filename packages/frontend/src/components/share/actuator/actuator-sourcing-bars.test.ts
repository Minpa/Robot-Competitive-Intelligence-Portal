import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ActuatorMapResponse, ActuatorMapRobot, RobotSourcing, SourcingPosture } from '@/types/actuator-map';
import { buildSourcingBarsHtml } from './actuator-map-html';
import { INK, WHITE } from './actuator-sourcing';
import { BAR_CAPTION, BAR_INSIDE_MIN_PCT, bar1Caption, buildSourcingBars, companyListText, legendParts } from './actuator-sourcing-bars';
import { BOARD_COLOR, BOARD_SOFT, buildSourcingBoard } from './actuator-sourcing-board';
import { liveSnapshotTrimmed } from './actuator-sourcing-board.fixtures';
import { posture, response, robot } from './actuator-strategy.fixtures';

const ev = (vendor: string, role: string | null, level: 'module' | 'component' = 'module'): RobotSourcing['externalVendors'][number] => ({ vendor, role, grade: null, url: null, level });
const rb = (name: string, company: string, p: SourcingPosture, so: Partial<RobotSourcing> = {}): ActuatorMapRobot => robot(name, company, [], posture(p, so));
const data = (robots: ActuatorMapRobot[]): ActuatorMapResponse => response(robots, []);
const barsOf = (d: ActuatorMapResponse) => buildSourcingBars(buildSourcingBoard(d).tree)!;
const live = () => barsOf(liveSnapshotTrimmed());
const sum = (segs: { count: number }[]) => segs.reduce((a, s) => a + s.count, 0);

describe('buildSourcingBars — 실데이터', () => {
  const b = live();

  it('막대 1: 자체 설계 17 · 외부 설계 2 · 공개 근거 없음 6, 막대 2: 13 · 2 · 2 · 2 · 6 (순서 고정, 합 25)', () => {
    expect(b.bar1.map((s) => [s.id, s.label, s.count])).toEqual([
      ['inhouse_design', '자체 설계', 17],
      ['external_module', '외부 설계', 2],
      ['unknown', '공개 근거 없음', 6],
    ]);
    expect(b.bar2.map((s) => [s.id, s.label, s.count])).toEqual([
      ['inhouse_all', '자체 생산', 13],
      ['inhouse_parts_bought', '속 부품만 구매', 2],
      ['inhouse_design_external_mfg', '제조 위탁', 2],
      ['external_module', '완성 모듈 구매', 2],
      ['unknown', '공개 근거 없음', 6],
    ]);
    expect(b.total).toBe(25);
    expect(sum(b.bar1)).toBe(25);
    expect(sum(b.bar2)).toBe(25);
    expect(b.omitted).toEqual([]);
  });

  it('막대 2 의 처음 세 구간 합 = 막대 1 의 자체 설계 구간 (같은 스케일로 포개진다)', () => {
    expect(sum(b.bar2.slice(0, 3))).toBe(b.bar1[0]!.count);
    expect(b.bar2.slice(0, 3).reduce((a, s) => a + s.pct, 0)).toBeCloseTo(b.bar1[0]!.pct, 2);
    // 누적 경계가 같다: 막대 1 의 외부 설계·근거 없음 구간은 막대 2 의 마지막 두 구간과 같은 폭
    expect(b.bar2[3]!.pct).toBe(b.bar1[1]!.pct);
    expect(b.bar2[4]!.pct).toBe(b.bar1[2]!.pct);
  });

  it('폭 % = 회사 수 / 전체 × 100 (소수 3자리), 합은 100 (반올림 오차 0.01 이내)', () => {
    expect(b.bar1.map((s) => s.pct)).toEqual([68, 8, 24]);
    expect(b.bar2.map((s) => s.pct)).toEqual([52, 8, 8, 8, 24]);
    for (const bar of [b.bar1, b.bar2]) expect(Math.abs(bar.reduce((a, s) => a + s.pct, 0) - 100)).toBeLessThan(0.01);
    const odd = barsOf(data([rb('A', 'A', 'in_house'), rb('B', 'B', 'in_house'), rb('U', 'U', 'unknown')]));
    expect(odd.bar1.map((s) => s.pct)).toEqual([66.667, 33.333]);
  });

  it('숫자는 폭이 6% 미만이면 바깥에 쓴다', () => {
    expect(BAR_INSIDE_MIN_PCT).toBe(6);
    expect(b.bar1.concat(b.bar2).every((s) => !s.outside)).toBe(true);
    const many = Array.from({ length: 40 }, (_, i) => rb(`r${i}`, `Co${String(i).padStart(2, '0')}`, 'in_house'));
    const narrow = barsOf(data([...many, rb('U', 'Unk', 'unknown')]));
    expect(narrow.bar1.map((s) => [s.label, s.outside])).toEqual([['자체 설계', false], ['공개 근거 없음', true]]); // 1/41 = 2.4%
    expect(narrow.bar1[1]!.pct).toBeLessThan(6);
  });

  it('색: 자체 info · 외부 설계/완성 모듈 neg · 제조 위탁 pos · 속 부품만 구매 info-soft + info 점선 · 근거 없음 ink-300', () => {
    expect(b.bar1.map((s) => s.fill)).toEqual([BOARD_COLOR.G1, BOARD_COLOR.G3, INK[300]]);
    expect(b.bar2.map((s) => s.fill)).toEqual([BOARD_COLOR.G1, BOARD_SOFT.info, BOARD_COLOR.G2, BOARD_COLOR.G3, INK[300]]);
    expect(b.bar2.map((s) => s.dashed)).toEqual([null, BOARD_COLOR.G1, null, null, null]);
    expect(b.bar1.every((s) => s.dashed === null)).toBe(true);
    const ok = new Set<string>([...Object.values(INK), WHITE, BOARD_COLOR.G1, BOARD_COLOR.G2, BOARD_COLOR.G3, ...Object.values(BOARD_SOFT)]);
    for (const s of [...b.bar1, ...b.bar2]) for (const c of [s.fill, s.numColor, s.dashed]) if (c) expect(ok.has(c)).toBe(true);
  });

  it('범례 회사명: 자체 설계는 생략, 나머지는 §7 순서·표기 (상세가 있으면 "; ", 없으면 ", ")', () => {
    expect(b.bar1[0]!.names).toBe('');
    expect(b.bar1[1]!.names).toBe('Diligent Robotics (Kinova); NEURA Robotics (Schaeffler)');
    expect(b.bar1[2]!.names).toBe('Aeolus Robotics, Engineered Arts, Honda, Savioke, SoftBank Robotics, Toyota');
    expect(b.bar2[0]!.names).toBe('Unitree Robotics, 1X Technologies, Agibot, Figure AI, Fourier Intelligence, UBTECH, Apptronik, LimX Dynamics, Xiaomi, Agility Robotics, Kepler Robot, Mentee Robotics, Sanctuary AI');
    expect(b.bar2[1]!.names).toBe('PAL Robotics (Harmonic Drive 감속기, TQ-Group (RoboDrive) 모터); Rainbow Robotics (maxon 모터)');
    expect(b.bar2[2]!.names).toBe('Tesla (Tuopu Group, Sanhua Intelligent Controls 위탁제조); Boston Dynamics (Hyundai Mobis 양산 공급)');
    expect(b.bar2[3]!.names).toBe(b.bar1[1]!.names);
    expect(b.bar2[4]!.names).toBe(b.bar1[2]!.names);
    expect(b.bar1[1]!.hint).toBe('남이 만든 모듈을 사서 씀');
    expect(b.bar1[2]!.hint).toBe('근거가 없을 뿐, 외부 조달이라는 뜻은 아님');
    expect(b.bar1[0]!.hint).toBeUndefined();
  });

  it('툴팁 title 에는 회사 목록(detail 없이), aria-label 은 숫자 나열', () => {
    expect(b.bar2[1]!.title).toBe('속 부품만 구매 2개사: PAL Robotics, Rainbow Robotics');
    expect(b.bar1[0]!.title.startsWith('자체 설계 17개사: Unitree Robotics, ')).toBe(true);
    expect(b.ariaLabel1).toBe('설계: 자체 설계 17, 외부 설계 2, 공개 근거 없음 6 (25개사)');
    expect(b.ariaLabel2).toBe('조달 방식: 자체 생산 13, 속 부품만 구매 2, 제조 위탁 2, 완성 모듈 구매 2, 공개 근거 없음 6 (25개사)');
    expect(b.robotCount).toBe(buildSourcingBoard(liveSnapshotTrimmed()).robotCount);
  });
});

describe('buildSourcingBars — 엣지', () => {
  it('null 트리·빈 보드는 null', () => {
    expect(buildSourcingBars(null)).toBeNull();
    expect(buildSourcingBars(undefined)).toBeNull();
    expect(buildSourcingBars(buildSourcingBoard(null).tree)).toBeNull();
    expect(buildSourcingBars(buildSourcingBoard(data([robot('C', 'LG Electronics', [], { isLG: true })])).tree)).toBeNull();
  });

  it('회사 수 0 구간은 막대에서 빠지고 omitted 에 한 번씩만 기록된다', () => {
    const b = barsOf(data([rb('A', 'Alpha', 'in_house')]));
    expect(b.bar1.map((s) => s.id)).toEqual(['inhouse_design']);
    expect(b.bar2.map((s) => s.id)).toEqual(['inhouse_all']);
    expect(b.bar1[0]!.pct).toBe(100);
    expect(b.omitted).toEqual(['외부 설계', '공개 근거 없음', '속 부품만 구매', '제조 위탁', '완성 모듈 구매']);
  });

  it('입력을 변경하지 않고 결정적이다', () => {
    const d = liveSnapshotTrimmed();
    const tree = buildSourcingBoard(d).tree!;
    const before = JSON.stringify(tree);
    const a = buildSourcingBars(tree);
    expect(JSON.stringify(tree)).toBe(before);
    expect(JSON.stringify(buildSourcingBars(buildSourcingBoard(liveSnapshotTrimmed()).tree))).toBe(JSON.stringify(a));
    expect(JSON.stringify(a)).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('companyListText', () => {
    expect(companyListText([])).toBe('');
    expect(companyListText([{ name: 'A', robots: 1 }, { name: 'B', robots: 1 }])).toBe('A, B');
    expect(companyListText([{ name: 'A', robots: 1, detail: 'x, y' }, { name: 'B', robots: 1 }])).toBe('A (x, y); B');
  });
});

describe('웹(ActuatorSourcingBars)과 정적 HTML(buildSourcingBarsHtml) 정합', () => {
  // vitest 환경(node, *.test.ts)에서는 TSX 를 렌더하지 않으므로, 두 쪽이 같은 순수 함수(buildSourcingBars·legendParts·bar1Caption)를 쓰는지와 HTML 출력으로 정합을 본다.
  const html = buildSourcingBarsHtml(live());
  const flat = html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');

  it('범례 한 줄 조각은 웹·HTML 공용 함수가 만든다', () => {
    const b = live();
    expect(legendParts(b.bar2[1]!)).toEqual({ head: '속 부품만 구매 2개사', names: ': PAL Robotics (Harmonic Drive 감속기, TQ-Group (RoboDrive) 모터); Rainbow Robotics (maxon 모터)', hint: '' });
    expect(legendParts(b.bar1[0]!)).toEqual({ head: '자체 설계 17개사', names: '', hint: '' });
    expect(legendParts(b.bar1[1]!).hint).toBe(' — 남이 만든 모듈을 사서 씀');
    for (const s of [...b.bar1, ...b.bar2]) {
      const p = legendParts(s);
      expect(flat).toContain(`${p.head}${p.names}${p.hint}`);
    }
    expect(flat).toContain(bar1Caption(b));
    expect(flat).toContain(BAR_CAPTION.bar2);
  });

  it('세그먼트 폭 %·색·툴팁·aria-label 이 데이터와 같고 순서는 막대 1 → 막대 2 → 범례', () => {
    const b = live();
    const widths = [...html.matchAll(/flex:none;width:([\d.]+)%/g)].map((m) => Number(m[1]));
    expect(widths).toEqual([...b.bar1, ...b.bar2].map((s) => s.pct));
    expect([...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => m[1])).toEqual([b.ariaLabel1, b.ariaLabel2]);
    expect(html.indexOf('aria-label="설계')).toBeLessThan(html.indexOf('aria-label="조달 방식'));
    expect(html.indexOf('aria-label="조달 방식')).toBeLessThan(html.indexOf('>설계</p><ul'));
    for (const s of [...b.bar1, ...b.bar2]) expect(html).toContain(`title="${s.title.replace(/&/g, '&amp;')}"`);
  });

  it('좁은 구간은 숫자를 바깥(top:100%)에 쓰고 막대 아래 여백을 둔다', () => {
    const many = Array.from({ length: 40 }, (_, i) => rb(`r${i}`, `Co${String(i).padStart(2, '0')}`, 'in_house'));
    const out = buildSourcingBarsHtml(barsOf(data([...many, rb('U', 'Unk', 'unknown')])));
    expect(out).toContain('top:100%');
    expect(out).toContain('margin:0 0 20px');
    expect(html).not.toContain('top:100%');
  });

  it('금지 문자열·이벤트 속성·class·<style>·SVG 가 없고 이스케이프·결정성', () => {
    for (const bad of ['<script', '<link', '<img', 'src=', '@import', 'url(', 'http://', '<style', 'class=', '<svg', ':hover']) expect(html.toLowerCase()).not.toContain(bad);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    const X = '<i>"&x</i>';
    const XE = '&lt;i&gt;&quot;&amp;x&lt;/i&gt;';
    const out = buildSourcingBarsHtml(barsOf(data([rb(`R${X}`, `Co${X}`, 'unknown'), rb(`B${X}`, `Buy${X}`, 'external', { externalVendors: [ev(`Vend${X}`, 'component supply')] })])));
    expect(out).not.toContain('<i>');
    expect(out).toContain(`Co${XE}`);
    expect(out).toContain(`Vend${XE}`);
    expect(buildSourcingBarsHtml(live())).toBe(html);
  });
});

describe('색 상수 parity — tailwind.config.js', () => {
  const require = createRequire(import.meta.url);
  const config = require(path.resolve(__dirname, '../../../../tailwind.config.js'));
  const colors = config.theme.extend.colors as Record<string, unknown>;

  it('BOARD_COLOR(G1~G3)와 BOARD_SOFT 가 info/pos/neg(+soft)와 같다', () => {
    expect(BOARD_COLOR.G1.toLowerCase()).toBe(String(colors.info).toLowerCase());
    expect(BOARD_COLOR.G2.toLowerCase()).toBe(String(colors.pos).toLowerCase());
    expect(BOARD_COLOR.G3.toLowerCase()).toBe(String(colors.neg).toLowerCase());
    expect(BOARD_SOFT.info.toLowerCase()).toBe(String(colors['info-soft']).toLowerCase());
    expect(BOARD_SOFT.pos.toLowerCase()).toBe(String(colors['pos-soft']).toLowerCase());
    expect(BOARD_SOFT.neg.toLowerCase()).toBe(String(colors['neg-soft']).toLowerCase());
    expect(BOARD_SOFT).toEqual({ info: '#D4E0EE', pos: '#D8E9DF', neg: '#EED4CA' });
  });

  it('INK 가 tailwind ink 토큰과 같다 (막대 색 근거)', () => {
    const ink = colors.ink as Record<string, string>;
    for (const k of [100, 300, 600, 900] as const) expect(INK[k].toLowerCase()).toBe(ink[k].toLowerCase());
  });
});
