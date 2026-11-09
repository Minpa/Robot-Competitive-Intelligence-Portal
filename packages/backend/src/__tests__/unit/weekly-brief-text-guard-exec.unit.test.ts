/**
 * v3 서술 가드 — 합니다체 허용/금지 어미, 수집 건수 문구, 방향 모순, 금칙어, 숫자, 편집 경고
 */
import { describe, it, expect } from 'vitest';
import {
  COLLECTION_COUNT_PATTERN,
  WEEKLY_BRIEF_BANNED_PHRASES,
  WEEKLY_BRIEF_OVERCLAIM_PHRASES,
  buildAllowed,
  contradictsPosition,
  editWarnings,
  endsWithNounForm,
  endsWithPolite,
  findBannedPhraseV3,
  contradictsMovement,
  execSentenceProblem,
  guardExecSentences,
  mentionsCollectionCount,
  smallIntegers,
  isRequestForm,
  endsWithProposal,
  hasProposalTarget,
  numberHasTarget,
} from '../../services/weekly-brief-text-guard.js';

const allowed = buildAllowed({ numbers: [12, 48.5] }, { numbers: smallIntegers() });

describe('endsWithPolite (합니다체 allowlist)', () => {
  it.each([
    '경쟁사가 앞서 있습니다.',
    '확인하겠습니다.',
    '평가해 볼 만합니다.',
    '검토해 보세요.',
    '다음 주에도 지켜봐야 해요.',
    '이번 변화는 의미가 있어요.',
    '이것은 중요한 신호예요.',
    '그럴 수 있죠.',
    '갱신되었습니다(신뢰도 B).',
  ])('accepts %s', (s) => {
    expect(endsWithPolite(s)).toBe(true);
  });

  it.each(['이 격차를 어떻게 보시겠습니까?', '가격이 내려감.', '격차가 커짐', '수치가 높음.', '핵심은 가격임.', '수치가 늘었다.', '확인했다.', '비교가 어렵다'])('rejects %s', (s) => {
    expect(endsWithPolite(s)).toBe(false);
  });

  it('flags noun-form endings (됨/함/임/음)', () => {
    for (const s of ['변경됨.', '조달함', '핵심임', '약함.']) expect(endsWithNounForm(s)).toBe(true);
    expect(endsWithNounForm('변경되었습니다.')).toBe(false);
  });
});

describe('COLLECTION_COUNT_PATTERN', () => {
  it.each([
    '이번 주 영상 12건이 수집되었습니다.',
    '수집된 기사 30건 중 일부를 봅니다.',
    '논문 5편을 수집했습니다.',
    '수집량이 늘었습니다.',
    '12건 수집되었습니다.',
    '뉴스 40건이 집계되었습니다.',
  ])('matches %s', (s) => {
    expect(mentionsCollectionCount(s)).toBe(true);
    expect(COLLECTION_COUNT_PATTERN.test(s)).toBe(true);
  });

  it.each(['경쟁사의 가격이 12% 낮아졌습니다.', '촉각 센서 점유율이 8.5%로 늘었습니다.', '영상 속 시연에서 손가락 24개 자유도가 확인됩니다.'])('does not match %s', (s) => {
    expect(mentionsCollectionCount(s)).toBe(false);
  });
});

describe('contradictsPosition (방향 모순)', () => {
  it('discards "we are ahead" when the competitor is ahead', () => {
    expect(contradictsPosition('이 축에서는 우리가 앞섭니다.', 'competitor_ahead')).toBe(true);
    expect(contradictsPosition('우리 쪽이 우위를 점하고 있습니다.', 'competitor_ahead')).toBe(true);
    expect(contradictsPosition('경쟁사가 뒤처져 있습니다.', 'competitor_ahead')).toBe(true);
    expect(contradictsPosition('경쟁사가 앞서 있습니다.', 'competitor_ahead')).toBe(false);
    expect(contradictsPosition('경쟁사가 우위를 점하고 있습니다.', 'competitor_ahead')).toBe(false);
  });
  it('discards "competitor ahead" when we are ahead', () => {
    expect(contradictsPosition('경쟁사가 앞서 있습니다.', 'we_ahead')).toBe(true);
    expect(contradictsPosition('우리가 뒤처집니다.', 'we_ahead')).toBe(true);
    expect(contradictsPosition('우리가 앞서 있습니다.', 'we_ahead')).toBe(false);
  });
  it('has no constraint for parity or null', () => {
    expect(contradictsPosition('우리가 앞섭니다.', 'parity')).toBe(false);
    expect(contradictsPosition('우리가 앞섭니다.', null)).toBe(false);
  });
});

describe('banned phrases', () => {
  it('fixes the v2 list and the three v3 additions', () => {
    expect(WEEKLY_BRIEF_BANNED_PHRASES).toContain('전망');
    expect([...WEEKLY_BRIEF_OVERCLAIM_PHRASES]).toEqual(['반드시', '확실히', '틀림없이']);
  });
  it('detects v3 overclaim words unless the input has them', () => {
    expect(findBannedPhraseV3('반드시 평가해야 합니다.')).toBe('반드시');
    expect(findBannedPhraseV3('확실히 앞서 있습니다.')).toBe('확실히');
    expect(findBannedPhraseV3('전망이 밝습니다.')).toBe('전망');
    expect(findBannedPhraseV3('반드시 확인합니다.', '반드시')).toBeNull();
  });
  it('rejects analyst-tool wording (관측·격차·신호·판정) unless the input text has it', () => {
    expect(findBannedPhraseV3('격차가 커졌습니다.')).toBe('격차');
    expect(findBannedPhraseV3('새 신호가 보입니다.')).toBe('신호');
    expect(findBannedPhraseV3('관측되었습니다.')).toBe('관측');
    expect(findBannedPhraseV3('판정이 났습니다.')).toBe('판정');
    expect(findBannedPhraseV3('격차 보고서가 공개되었습니다.', '격차 보고서')).toBeNull();
    expect(findBannedPhraseV3('차이가 줄어드는 중입니다.')).toBeNull();
  });
});

describe('contradictsMovement (position x movement)', () => {
  it.each([
    ['competitor_ahead', 'competitor_closing', '차이가 줄어드는 중입니다.', true],
    ['competitor_ahead', 'competitor_closing', '차이가 더 벌어지는 중입니다.', false],
    ['competitor_ahead', 'competitor_receding', '차이가 더 벌어지고 있습니다.', true],
    ['competitor_ahead', 'competitor_receding', '차이가 줄어드는 중입니다.', false],
    ['we_ahead', 'competitor_closing', '우리가 더 앞서는 중입니다.', true],
    ['we_ahead', 'competitor_closing', '경쟁사가 따라오는 중입니다.', false],
    ['we_ahead', 'competitor_receding', '경쟁사가 따라오는 중입니다.', true],
    ['we_ahead', 'competitor_receding', '우리가 더 앞서는 중입니다.', false],
    ['parity', 'competitor_closing', '우리 쪽으로 기우는 중입니다.', true],
    ['parity', 'competitor_closing', '경쟁사 쪽으로 기우는 중입니다.', false],
    ['parity', 'competitor_receding', '경쟁사 쪽으로 기우는 중입니다.', true],
    ['parity', 'competitor_receding', '우리 쪽으로 기우는 중입니다.', false],
    ['competitor_ahead', 'steady', '차이가 줄어드는 중입니다.', true],
    ['competitor_ahead', 'first_seen', '차이가 줄어드는 중입니다.', false],
  ] as const)('%s / %s: "%s" -> %s', (position, movement, sentence, bad) => {
    expect(contradictsMovement(sentence, position, movement)).toBe(bad);
    expect(execSentenceProblem(sentence, { allowed: new Set(), position, movement }, null) === 'direction').toBe(bad);
  });
  it('does nothing without a position or movement', () => {
    expect(contradictsMovement('차이가 줄어드는 중입니다.', null, 'competitor_closing')).toBe(false);
    expect(contradictsMovement('차이가 줄어드는 중입니다.', 'competitor_ahead', null)).toBe(false);
  });
});

describe('guardExecSentences', () => {
  it('drops only the violating sentences and keeps the rest', () => {
    const r = guardExecSentences(
      [
        '경쟁사 가격이 12% 낮아졌습니다.', // ok
        '가격이 낮아짐.', // ending
        '반드시 평가합니다.', // banned
        '영상 30건이 수집되었습니다.', // collection (also number)
        '값이 99로 올랐습니다.', // number
        '<b>태그</b>입니다.', // policy
        '평가해 볼 만합니다.', // 대상 없는 권유 → proposal_misplaced
        '평가해 보겠습니다.',
      ],
      { allowed },
    );
    expect(r.sentences).toEqual(['경쟁사 가격이 12% 낮아졌습니다.', '평가해 보겠습니다.']);
    expect(r.stats.dropped.proposal_misplaced).toBe(1);
    expect(r.stats.dropped.ending).toBe(1);
    expect(r.stats.dropped.banned).toBe(1);
    expect(r.stats.dropped.collection + r.stats.dropped.number).toBeGreaterThanOrEqual(2);
    expect(r.stats.dropped.policy).toBe(1);
  });

  it('applies the direction guard with the server position', () => {
    const r = guardExecSentences(['우리가 앞서 있습니다.', '경쟁사가 앞서 있습니다.'], { allowed, position: 'competitor_ahead' });
    expect(r.sentences).toEqual(['경쟁사가 앞서 있습니다.']);
    expect(r.stats.dropped.direction).toBe(1);
  });

  it('drops sentences over the max length', () => {
    const long = `${'가'.repeat(210)}입니다.`;
    const r = guardExecSentences([long, '짧습니다.'], { allowed });
    expect(r.sentences).toEqual(['짧습니다.']);
    expect(r.stats.dropped.too_long).toBe(1);
  });

  it('accepts a string with several sentences', () => {
    const r = guardExecSentences('첫째입니다. 둘째입니다.', { allowed });
    expect(r.sentences).toHaveLength(2);
  });
});

describe('editWarnings (경고만, 저장 허용)', () => {
  it('returns codes for honorific, banned, number, direction and collection violations', () => {
    expect(editWarnings('격차가 커짐', allowed)).toContain('ending');
    expect(editWarnings('반드시 봐야 합니다.', allowed)).toContain('banned');
    expect(editWarnings('값이 777입니다.', allowed)).toContain('number');
    expect(editWarnings('우리가 앞섭니다.', allowed, 'competitor_ahead')).toContain('direction');
    expect(editWarnings('영상 30건이 수집되었습니다.', allowed)).toContain('collection');
    expect(editWarnings('가격이 12% 낮아졌습니다.', allowed)).toEqual([]);
  });
});

describe('tone v2: request/question (R1), proposal endings (R2), target (R3)', () => {
  const input = 'BrainCo Revo 3 핸드 21자유도 손가락 구동 방식 파지력';
  const ok = buildAllowed({ numbers: [3, 21] }, { numbers: smallIntegers() });
  const problem = (s: string, scope: 'plain' | 'proposal') => execSentenceProblem(s, { allowed: ok, inputText: input, scope, entityMode: 'off' }, null);

  it.each([
    ['P1', 'proposal', 'Revo 3의 21자유도 손가락 구성을 우리 핸드 사양과 비교해 볼 필요가 있을 것 같습니다.'],
    ['P2', 'proposal', 'BrainCo가 공개한 구동 방식이 어떤 액추에이터에 기반하는지 공개 자료에서 살펴볼 필요가 있어 보입니다.'],
    ['P3', 'proposal', 'Revo 3 파지력 수치가 공식 자료에 있는지 확인해 볼 필요가 있겠습니다.'],
    ['P4', 'proposal', '핸드 21자유도 관련 언급이 다음 주에도 이어지는지 집계 결과를 지켜볼 필요가 있을 것 같습니다.'],
    ['P5', 'proposal', 'BrainCo Revo 3 샘플을 확보해 손가락별 구동력을 직접 측정해 볼 필요가 있겠습니다.'],
    ['P6', 'plain', 'Revo 3는 21자유도 핸드이며 손가락 구동 방식이 공개되었습니다.'],
  ] as const)('%s passes', (_id, scope, s) => {
    expect(problem(s, scope)).toBeNull();
  });

  it.each([
    ['D1', 'proposal', '문의해 볼까요?', 'request'],
    ['D2', 'proposal', 'BrainCo에 Revo 3 구매를 요청드립니다.', 'request'],
    ['D3', 'proposal', 'Revo 3 도입 여부를 결정해 주시기 바랍니다.', 'request'],
    ['D4', 'proposal', 'Revo 3 구매를 승인해 주세요.', 'request'],
    ['D5', 'proposal', 'Revo 3 사양을 확인해야 합니다.', 'request'],
    ['D6', 'proposal', '비교해 볼 필요가 있을 것 같습니다.', 'no_target'],
    ['D7', 'proposal', '관련 사양을 확인해 볼 필요가 있어 보입니다.', 'no_target'],
    ['D8', 'proposal', 'Revo 3는 21자유도 핸드입니다.', 'proposal_ending'],
    ['D9', 'plain', 'Revo 3의 21자유도 구성을 확인해 볼 필요가 있을 것 같습니다.', 'proposal_misplaced'],
  ] as const)('%s is dropped as %s', (_id, scope, s, code) => {
    expect(problem(s, scope)).toBe(code);
  });

  it('does not flag ordinary approval news, drops 볼 만합니다 from proposals', () => {
    expect(isRequestForm('FDA 승인 획득 소식이 확인되었습니다.')).toBe(false);
    expect(problem('Revo 3 구동 방식을 비교해 볼 만합니다.', 'proposal')).toBe('proposal_ending');
    expect(endsWithProposal('확인해 볼 필요가 있겠습니다.')).toBe(true);
    expect(hasProposalTarget('Revo 3의 21자유도 손가락 구성을 비교해 볼 필요가 있겠습니다.', input)).toBe(true);
  });

  it('plain scope drops soft suggestions (볼 만합니다 류) and "요청드리겠습니다" style requests', () => {
    for (const x of ['평가해 볼 만합니다.', '이 흐름은 참고할 만한 흐름입니다.', '공급망 관점에서 지켜볼 만합니다.']) expect(problem(x, 'plain'), x).toBe('proposal_misplaced');
    for (const x of ['도입 검토를 요청드리겠습니다.', '자료 공유를 부탁드리겠습니다.']) {
      expect(problem(x, 'plain'), x).toBe('request');
      expect(problem(x, 'proposal'), x).toBe('request');
    }
  });

  it('number-target rule: numbers need something they count', () => {
    expect(numberHasTarget('21이 확인되었습니다.', input)).toBe(false);
    expect(numberHasTarget('Revo 3는 21자유도입니다.', input)).toBe(true);
    expect(numberHasTarget('조사 대상 로봇 46기 중 26기입니다.', '')).toBe(true);
    expect(execSentenceProblem('21이 확인되었습니다.', { allowed: ok, inputText: input, requireNumberTarget: true, entityMode: 'off' }, null)).toBe('no_target');
  });

  it('edit warnings by scope', () => {
    const al = buildAllowed({ numbers: [21] }, { numbers: smallIntegers() });
    expect(editWarnings('Revo 3 도입을 승인해 주세요.', al, null, null, 'proposal', input)).toContain('request');
    expect(editWarnings('비교해 볼 필요가 있을 것 같습니다.', al, null, null, 'proposal', input)).toContain('no_target');
    expect(editWarnings('Revo 3의 21자유도 손가락 구성을 비교해 볼 필요가 있겠습니다.', al, null, null, 'proposal', input)).toEqual([]);
    expect(editWarnings('Revo 3의 21자유도 구성을 비교해 볼 필요가 있겠습니다.', al, null, null, 'plain', input)).toContain('ending');
    expect(editWarnings('Revo 3를 검토할까요?', al, null, null, 'headline')).toEqual(['request']);
    expect(editWarnings('Revo 3 공개', al, null, null, 'headline')).toEqual([]);
  });
});
