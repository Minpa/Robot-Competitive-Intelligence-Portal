/**
 * weekly-brief-text-guard — 문장 분리, 숫자 허용 집합, 정책·금칙어, 길이 처리, 제목 번역 가드
 */
import { describe, it, expect } from 'vitest';
import {
  TEXT_GUARD,
  WEEKLY_BRIEF_BANNED_PHRASES,
  buildAllowed,
  canonNumber,
  dateNumbers,
  droppedTotal,
  englishTokens,
  extractNumbers,
  findBannedPhrase,
  guardNarrative,
  guardTitleTranslation,
  hangulRatio,
  numberForms,
  resolveEntityGuardMode,
  smallIntegers,
  splitSentences,
  violatesTextPolicy,
} from '../../services/weekly-brief-text-guard.js';

describe('splitSentences', () => {
  it('splits Korean and English sentences on terminators followed by whitespace', () => {
    expect(splitSentences('첫 문장입니다. 두 번째 문장입니다! 세 번째입니까? 끝')).toEqual(['첫 문장입니다.', '두 번째 문장입니다!', '세 번째입니까?', '끝']);
  });
  it('does not split decimals, percentages, versions, domains or abbreviations', () => {
    expect(splitSentences('점유율은 28.4%였습니다. 지난주는 22.1%였습니다.')).toEqual(['점유율은 28.4%였습니다.', '지난주는 22.1%였습니다.']);
    expect(splitSentences('arXiv.org 에 v1.2 버전이 올라왔습니다. 다음 문장입니다.')).toEqual(['arXiv.org 에 v1.2 버전이 올라왔습니다.', '다음 문장입니다.']);
    expect(splitSentences('Atlas Inc. announced a plan vs. last year. 끝입니다.')).toEqual(['Atlas Inc. announced a plan vs. last year.', '끝입니다.']);
    expect(splitSentences('A. Kim 팀의 연구입니다. 결과가 공개되었습니다.')).toEqual(['A. Kim 팀의 연구입니다.', '결과가 공개되었습니다.']);
  });
  it('keeps closing quotes with their sentence and handles empty input', () => {
    expect(splitSentences('"공개되었다." 다음입니다.')).toEqual(['"공개되었다."', '다음입니다.']);
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('numbers', () => {
  it('canonNumber drops commas, trailing zeros and leading zeros', () => {
    expect(canonNumber('1,234')).toBe('1234');
    expect(canonNumber('48.0')).toBe('48');
    expect(canonNumber('07')).toBe('7');
    expect(canonNumber('2610.10000')).toBe('2610.1');
    expect(canonNumber('x')).toBeNull();
  });
  it('extractNumbers handles thousands grouping, lists, percentages and dates', () => {
    expect(extractNumbers('조회수 1,234,567회, 점유율 28.4%.')).toEqual(['1234567', '28.4']);
    expect(extractNumbers('1,2,3 순서')).toEqual(['1', '2', '3']);
    expect(extractNumbers('2026-10-22 에 3건.')).toEqual(['2026', '10', '22', '3']);
    expect(extractNumbers('숫자 없음')).toEqual([]);
  });
  it('numberForms covers decimals, rounding, thousands separators and K/M/만/억 notations', () => {
    const f = new Set(numberForms(480_000));
    for (const t of ['480000', '480', '48']) expect(f.has(t)).toBe(true);
    const g = new Set(numberForms(1_240_000));
    for (const t of ['1240000', '1.2', '1240', '124']) expect(g.has(t)).toBe(true);
    expect(new Set(numberForms(28.4))).toEqual(new Set(['28.4', '28']));
    expect(new Set(numberForms(-5.9)).has('5.9')).toBe(true);
    expect(numberForms(Number.NaN)).toEqual([]);
    expect(new Set(numberForms(120_000_000)).has('1.2')).toBe(true);
  });
  it('buildAllowed unions server numbers, input text numbers and formatted strings', () => {
    const a = buildAllowed({ numbers: [41, null, undefined] }, { texts: ['Model X2 supports 22 DoF', null] }, { strings: ['1,000'] });
    for (const t of ['41', '2', '22', '1000']) expect(a.has(t)).toBe(true);
    expect(a.has('99')).toBe(false);
  });
  it('smallIntegers / dateNumbers', () => {
    expect(smallIntegers()).toHaveLength(TEXT_GUARD.smallIntMax);
    expect(smallIntegers(14)).toHaveLength(14);
    expect(dateNumbers('2026-10-19')).toEqual([2026, 10, 19]);
    expect(dateNumbers('bad')).toEqual([]);
  });
});

describe('policy and banned phrases', () => {
  it('flags <, urls, newlines and markdown', () => {
    for (const bad of ['a <b', 'see http://x', 'see HTTPS://x', 'www.example.com', 'line\nbreak', '**bold**', 'a `code`', '# head']) {
      expect(violatesTextPolicy(bad), bad).toBe(true);
    }
    expect(violatesTextPolicy('정상 문장입니다.')).toBe(false);
  });
  it('the banned phrase list is pinned', () => {
    expect([...WEEKLY_BRIEF_BANNED_PHRASES]).toEqual([
      '전망', '예상', '예측', '것으로 보인다', '것으로 보입니다', '것으로 보여', '가능성이 높', '가능성이 크',
      '혁신적', '획기적', '압도적', '독보적', '최초', '폭발적', '기대된다', '기대됩니다', '게임 체인저',
    ]);
  });
  it('a banned phrase is allowed when the element input text contains it', () => {
    expect(findBannedPhrase('시장 전망이 공개되었습니다.', '')).toBe('전망');
    expect(findBannedPhrase('시장 전망이 공개되었습니다.', '2027 시장 전망 보고서')).toBeNull();
    expect(findBannedPhrase('정상 문장', '')).toBeNull();
  });
});

describe('guardNarrative', () => {
  const allowed = buildAllowed({ numbers: [28.4, 22, 80] });
  const base = { max: 300, min: 20, allowed } as const;

  it('keeps clean text as is', () => {
    const r = guardNarrative('액추에이터 관련 수집은 22건이었습니다. 점유율은 28.4%였습니다.', base);
    expect(r).toMatchObject({ ok: true, text: '액추에이터 관련 수집은 22건이었습니다. 점유율은 28.4%였습니다.' });
  });

  it('drops only the sentence with a number outside the allowed set and keeps the others', () => {
    const r = guardNarrative('액추에이터 관련 수집은 22건이었습니다. 점유율이 99%까지 올랐습니다. 지난주에는 28.4%였습니다.', base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe('액추에이터 관련 수집은 22건이었습니다. 지난주에는 28.4%였습니다.');
      expect(r.stats.dropped.number).toBe(1);
      expect(droppedTotal(r.stats)).toBe(1);
      expect(r.stats.sentences).toBe(3);
    }
  });

  it('numbers written as 1,234 / 48.0 / K / 만 match the allowed server number', () => {
    const a = buildAllowed({ numbers: [480_000, 1234] });
    const r = guardNarrative('조회수는 48만 회이고 480K 로도 표기됩니다. 다른 항목은 1,234건입니다.', { max: 200, min: 10, allowed: a });
    expect(r.ok).toBe(true);
  });

  it('policy and banned sentences are dropped individually', () => {
    const r = guardNarrative('정상 문장입니다. 링크는 http://x.example 입니다. 시장 전망이 밝습니다. **강조** 문장입니다. 마지막 정상 문장입니다.', { ...base, min: 5 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe('정상 문장입니다. 마지막 정상 문장입니다.');
      expect(r.stats.dropped).toMatchObject({ policy: 2, banned: 1, number: 0 });
    }
  });

  it('banned phrase present in the input text is allowed', () => {
    const r = guardNarrative('시장 전망 보고서가 공개되었습니다.', { ...base, min: 5, inputText: 'Market 전망 report' });
    expect(r.ok).toBe(true);
  });

  it('fails when every sentence is dropped, when the type is wrong or empty', () => {
    expect(guardNarrative('점유율 99%.', base)).toMatchObject({ ok: false, reason: 'all_dropped' });
    expect(guardNarrative(42, base)).toMatchObject({ ok: false, reason: 'invalid_type' });
    expect(guardNarrative('   ', base)).toMatchObject({ ok: false, reason: 'empty' });
  });

  it('fails with too_short when survivors are shorter than the minimum (the caller falls back to the rule sentence)', () => {
    const r = guardNarrative('짧은 문장입니다. 점유율이 99%였습니다.', { ...base, min: 30 });
    expect(r).toMatchObject({ ok: false, reason: 'too_short' });
  });

  it('up to 20% over the limit is cut at the last complete sentence; more than 20% or no sentence that fits is discarded', () => {
    const s1 = '가'.repeat(48) + '.';
    const s2 = '나'.repeat(48) + '.';
    const s3 = '다'.repeat(48) + '.';
    // 합 3문장 = 147 + 공백 2 = 149 > 120 이지만 120*1.2=144 도 넘음 -> 폐기
    expect(guardNarrative(`${s1} ${s2} ${s3}`, { max: 120, min: 10, allowed })).toMatchObject({ ok: false, reason: 'too_long' });
    // 합 2문장 = 98 + 공백 1 = 99 > 90, 90*1.2=108 이내 -> 마지막 문장을 잘라 낸다
    const r = guardNarrative(`${s1} ${s2}`, { max: 90, min: 10, allowed });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe(s1);
      expect(r.stats.trimmed).toBe(1);
    }
    // 첫 문장부터 상한을 넘으면 폐기
    expect(guardNarrative('라'.repeat(55) + '.', { max: 50, min: 10, allowed })).toMatchObject({ ok: false, reason: 'too_long' });
  });

  it('English tokens absent from the input are only counted in warn mode, dropped in enforce mode, ignored when off', () => {
    const text = 'Atlas 의 발표가 있었습니다. Zorblax 라는 이름이 언급되었습니다.';
    const input = 'Atlas announcement';
    const warn = guardNarrative(text, { ...base, min: 5, inputText: input, entityMode: 'warn' });
    expect(warn.ok && warn.text).toBe(text);
    expect(warn.ok && warn.stats.entityWarnings).toBe(1);
    const enforce = guardNarrative(text, { ...base, min: 5, inputText: input, entityMode: 'enforce' });
    expect(enforce.ok && enforce.text).toBe('Atlas 의 발표가 있었습니다.');
    const off = guardNarrative(text, { ...base, min: 5, inputText: input, entityMode: 'off' });
    expect(off.ok && off.stats.entityWarnings).toBe(0);
  });

  it('does not over-discard realistic narratives: at most 15% of the sentences in 20 samples are dropped', () => {
    const allowedNums = buildAllowed(
      { numbers: [412, 187, 41, 52, 28.4, 22.1, 6.3, 14, 9, 38, 120, 480_000, 1_240_000, 43] },
      { texts: ['Figure 03 production line', 'Atlas X hand 22 DoF', 'Unitree H2 module'] },
      { numbers: smallIntegers(12) },
      { numbers: [...dateNumbers('2026-10-19'), ...dateNumbers('2026-10-25')] },
    );
    const samples = [
      '이번 주 수집된 자료는 영상 41건, 기사 187건, 논문 52건으로 모두 412건입니다. 지난주보다 6.3% 늘었습니다.',
      '액추에이터 축은 전체의 28.4%를 차지했고 지난주는 22.1%였습니다. 영상 14건과 논문 9건이 수집되었습니다.',
      '조회수가 가장 높은 영상은 Figure 03 production line 소개 영상으로 약 124만 회가 기록되었습니다. 길이는 12분입니다.',
      'Atlas X 의 손 자유도 항목이 22 DoF 로 갱신되었습니다. 신뢰도는 A 등급입니다.',
      '핸드 축에서는 촉각 센서를 다룬 영상이 3건 수집되었습니다. 해당 영상은 모두 분석이 완료되었습니다.',
      '10월 19일부터 25일까지의 기간 동안 총 43주차 자료가 집계되었습니다. 기사는 187건이었습니다.',
      'Unitree H2 module 관련 항목이 갱신되었습니다. 관련 영상 2건이 함께 수집되었습니다.',
      '전시 축에서는 특이사항이 없었습니다. 수집된 항목은 2건에 그쳤습니다.',
      '양산 축 영상은 9건이며 점유율은 6.3%입니다. 지난주 대비 변동은 제한적입니다.',
      'RFM 축 논문은 14건이 수집되었습니다. 대표 논문은 조작 과제를 다룹니다.',
      '회사별로는 상위 5곳이 전체 수집량의 38%를 차지했습니다. 나머지는 분산되어 있습니다.',
      '키워드 tactile 의 언급이 늘었습니다. 지난주 대비 증가폭은 14%였습니다.',
      '영상 12건은 조회수 순으로 정렬되었습니다. 상위 3건의 합계는 약 48만 회입니다.',
      '논문 8편 가운데 5편이 핸드 축에 속합니다. 나머지 3편은 액추에이터 축입니다.',
      'CI 갱신은 14건이며 회사는 6곳입니다. 신뢰도 A 항목이 2건 포함됩니다.',
      '이번 주 기사 187건 중 120건이 상위 출처 3곳에서 나왔습니다. 출처 다양성은 낮은 편입니다.',
      '분석이 완료된 영상은 41건 중 28건입니다. 나머지는 분석 대기 상태입니다.',
      '8주 추이에서 이번 주 수집량은 412건입니다. 직전 주는 387건이었습니다.',
      '관찰 포인트로는 추가 출처 확인이 필요한 CI 항목 2건이 있습니다. 해당 항목은 신뢰도가 낮습니다.',
      '이번 주 데이터에서 새로 나타난 키워드는 9건입니다. 모두 기사에서 추출되었습니다.',
    ];
    let total = 0;
    let dropped = 0;
    for (const s of samples) {
      const r = guardNarrative(s, { max: 400, min: 10, allowed: allowedNums, inputText: 'Figure 03 production line Atlas X hand Unitree H2 module tactile CI RFM' });
      total += r.stats.sentences;
      dropped += droppedTotal(r.stats);
    }
    expect(dropped / total).toBeLessThanOrEqual(0.15);
  });
});

describe('guardTitleTranslation', () => {
  it('accepts a Korean title whose numbers all appear in the original', () => {
    expect(guardTitleTranslation('3D 프린팅 휴머노이드 손 2종', '3D printed humanoid hand, 2 variants')).toEqual({ ok: true, text: '3D 프린팅 휴머노이드 손 2종' });
  });
  it.each([
    ['숫자 99가 추가됨 99', 'Humanoid hand', 'number'],
    ['<b>휴머노이드</b>', 'Humanoid hand', 'policy'],
    ['휴머노이드 http://x.example', 'Humanoid hand', 'policy'],
    ['휴머노이드\n손', 'Humanoid hand', 'policy'],
    ['Humanoid hand', 'Humanoid hand', 'no_hangul'],
    ['휴머노이드 손', '휴머노이드 손', 'same_as_original'],
    ['가'.repeat(81), 'Humanoid hand', 'too_long'],
    ['', 'Humanoid hand', 'empty'],
    [null, 'Humanoid hand', 'invalid_type'],
  ] as const)('rejects %j', (raw, original, reason) => {
    expect(guardTitleTranslation(raw, original)).toEqual({ ok: false, reason });
  });
});

describe('misc', () => {
  it('hangulRatio / englishTokens / resolveEntityGuardMode', () => {
    expect(hangulRatio('휴머노이드 hand')).toBeGreaterThan(0.5);
    expect(hangulRatio('')).toBe(0);
    expect(englishTokens('Atlas X-2 and ROS2 on arXiv.org, a 3D')).toEqual(['atlas', 'x-2', 'and', 'ros2', 'arxiv.org']);
    expect(resolveEntityGuardMode({})).toBe('warn');
    expect(resolveEntityGuardMode({ WEEKLY_BRIEF_ENTITY_GUARD: 'ENFORCE' })).toBe('enforce');
    expect(resolveEntityGuardMode({ WEEKLY_BRIEF_ENTITY_GUARD: 'off' })).toBe('off');
    expect(resolveEntityGuardMode({ WEEKLY_BRIEF_ENTITY_GUARD: 'weird' })).toBe('warn');
  });
});
