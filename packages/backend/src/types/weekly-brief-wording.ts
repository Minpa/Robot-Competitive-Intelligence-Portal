/**
 * 주간 브리프 v3(임원판) 문구 용어집 — 화면·다운로드 HTML·AI 프롬프트·규칙 폴백·가드가 함께 쓰는 단일 출처.
 *
 * 프론트엔드 packages/frontend/src/types/weekly-brief-wording.ts 는 이 파일의 동일 복사본이다
 * (weekly-brief-wording-contract.unit.test.ts 가 두 파일의 일치를 검사한다). 한쪽을 고치면 다른 쪽도 같이 고친다.
 *
 * 어조: 분석 도구 말투(결론·격차·신호·판정·관측) 대신 보고서에 맞는 자연스러운 말을 쓴다.
 * payload 키·enum 값(competitor_ahead, first_seen, evaluate 등)은 바꾸지 않고 표시 문구만 여기서 정한다.
 */

export const WEEKLY_WORDING = {
  /** 섹션 제목·부제·도입 문장(intro). intro 는 숫자·칩이 무엇을 센 것인지 독자가 ARGOS 를 몰라도 알 수 있게 하는 한 줄 설명이다 */
  sections: {
    conclusions: {
      title: '이번 주 주요 내용',
      subtitle: '이번 주 눈여겨볼 변화와 그 의미입니다',
      intro: '이번 주 자료에서 눈여겨볼 변화를 골라 무엇이 바뀌었고 우리에게 어떤 의미인지 정리했습니다.',
    },
    gap: {
      title: '경쟁사 동향과 우리 위치',
      subtitle: '이번 주 새 자료가 있는 항목만 다룹니다',
      intro: '경쟁사가 새로 공개한 사양이나 평가 점수를, ARGOS에 등록된 우리 제품 수치와 같은 기준으로 나란히 놓은 것입니다. 우리 수치가 없는 항목은 비교하지 않고 그 사실만 적습니다.',
    },
    tech: {
      title: '기술 흐름',
      subtitle: '최근 4주 대 이전 4주 비교 · 8주 추이',
      intro: '최근 8주 동안 수집한 영상·논문·기사 가운데 각 주제가 차지한 비율의 변화입니다. 최근 4주와 그 앞 4주를 비교해 뚜렷하게 오르거나 내린 주제만 골랐습니다.',
    },
    business: {
      title: '사업·공급망 동향',
      subtitle: '현재 등록 현황과 이번 주 동향',
      intro: '휴머노이드 로봇 제조사들이 관절 액추에이터를 어떻게 조달하고 있는지와, 이번 주 확인된 공급 계약·가격·양산 소식입니다. 액추에이터 사업 관점에서 누가 사고 누가 파는지를 보는 자리입니다.',
    },
    questions: {
      title: '확인이 필요해 보이는 사항',
      subtitle: '현재 알려진 것과 아직 알 수 없는 것을 함께 정리했습니다',
      intro: '현재 알려진 것과 아직 알 수 없는 것을 함께 정리했습니다',
    },
    evidence: { title: '참고 자료', subtitle: '영상 · 논문 · 뉴스', intro: '위 내용의 근거가 된 영상·논문·기사입니다.' },
  },
  /** 결론 줄 역할 라벨 (detail 은 보조 설명) */
  roles: { change: '변화', why: '의미', action: '제안', detail: '참고' },
  /** 결론 행동 배지 (enum 값은 유지하고 표시 문구만 정한다) */
  actions: { evaluate: '비교·확인', contact: '공식 문의', watch: '추이 확인', decide: '판단 참고', none: '' },
  /** 질문 유형 배지 (행동 배지와 같은 말) */
  questionKinds: { evaluate: '비교·확인', contact: '공식 문의', decide: '판단 참고', watch: '추이 확인' },
  /** 제안 줄(action)과 확인 사항(text)의 허용 말끝 — 가드와 프롬프트가 함께 쓴다 */
  proposalEndings: ['볼 필요가 있을 것 같습니다', '볼 필요가 있어 보입니다', '볼 필요가 있겠습니다'],
  positions: { competitor_ahead: '경쟁사가 앞서 있음', parity: '비슷한 수준', we_ahead: '우리가 앞서 있음' },
  /** 변화 라벨 — position 과 movement 를 함께 보고 정한다. movementLabelKo 로 읽는다 */
  movements: {
    byPosition: {
      competitor_ahead: { competitor_closing: '차이가 더 벌어지는 중', competitor_receding: '차이가 줄어드는 중' },
      we_ahead: { competitor_closing: '경쟁사가 따라오는 중', competitor_receding: '우리가 더 앞서는 중' },
      parity: { competitor_closing: '경쟁사 쪽으로 기우는 중', competitor_receding: '우리 쪽으로 기우는 중' },
    },
    steady: '큰 변화 없음',
    first_seen: '이번 주 처음 확인',
  },
  oursMissing: { badge: '우리 수치 미등록', long: '우리 쪽 수치는 아직 등록되지 않았습니다' },
  empty: {
    conclusions: '이번 주에는 특별히 말씀드릴 변화가 없었습니다',
    gaps: '이번 주에는 경쟁사와 비교해 새로 말씀드릴 차이가 없었습니다',
    tech: '이번 주에는 뚜렷한 기술 흐름의 변화가 없었습니다',
    papers: '이번 주 프론티어를 바꾼 논문은 없었습니다',
  },
  /** 분석 도구 말투 금칙어 — 입력 텍스트(제목·요약)에 같은 말이 있으면 예외. AI 지시에도 같은 목록을 쓴다 */
  jargonBanned: ['관측', '격차', '신호', '판정'],
  /** 금칙어 대신 쓰는 말 (AI 지시용) */
  jargonAlternatives: ['확인됐습니다', '차이', '흐름', '보입니다'],
  /** 비교 축 설명 — 차이 카드 안에 한 줄로 보인다. 키는 payload 의 axisKey (화면에는 키를 노출하지 않는다) */
  axes: {
    torque_density: '관절 액추에이터의 최대 토크를 무게로 나눈 값입니다. 높을수록 같은 무게로 더 큰 힘을 냅니다.',
    hand_dof: '손이 독립적으로 움직일 수 있는 관절 수입니다. 많을수록 더 섬세한 동작이 가능합니다.',
    grip_force: '로봇 손이 물체를 쥘 때 낼 수 있는 최대 힘입니다. 높을수록 무거운 물체를 안정적으로 잡습니다.',
    tactile: '손가락에 달린 촉각 센서가 독립적으로 측정하는 채널 수입니다. 많을수록 접촉을 더 세밀하게 감지합니다.',
    body_dof: '로봇 몸 전체가 독립적으로 움직일 수 있는 관절 수입니다. 많을수록 더 다양한 동작이 가능합니다.',
    payload: '로봇이 들어 올려 옮길 수 있는 최대 무게입니다. 높을수록 더 무거운 물건을 다룹니다.',
    price: '로봇 한 대의 공개 판매 가격입니다. 낮을수록 도입 비용이 적습니다.',
    bench: 'ARGOS 벤치마크에서 우리가 매긴 0~10점의 상대 점수입니다. 높을수록 평가가 좋습니다.',
  },
  /** 사업 동향 분류 설명 — 사업 동향 카드의 분류 배지 아래에 보인다 */
  businessCategories: {
    contract: '로봇 제조사와 부품 공급사 사이의 공급·납품 계약에 관한 소식입니다.',
    pricing: '로봇이나 부품의 판매 가격에 관한 소식입니다.',
    mass_production: '시험 생산을 넘어 대량 생산 단계에 들어간 소식입니다.',
    sourcing: '로봇 제조사가 관절 액추에이터를 어디서 조달하는지에 관한 소식입니다.',
    market: '로봇·액추에이터 시장 동향에 관한 소식입니다.',
  },
} as const;

export type WordingGapPosition = 'competitor_ahead' | 'parity' | 'we_ahead';
export type WordingGapMovement = 'competitor_closing' | 'competitor_receding' | 'steady' | 'first_seen';

/** 변화 배지 문구. 비교할 수 없으면(position 또는 movement 가 없으면) null — 화면에 표시하지 않는다 */
export function movementLabelKo(position: WordingGapPosition | null | undefined, movement: WordingGapMovement | null | undefined): string | null {
  if (!position || !movement) return null;
  if (movement === 'steady') return WEEKLY_WORDING.movements.steady;
  if (movement === 'first_seen') return WEEKLY_WORDING.movements.first_seen;
  return WEEKLY_WORDING.movements.byPosition[position][movement];
}

/** 프롬프트용: 가능한 변화 라벨 전체 */
export function allMovementLabels(): string[] {
  const m = WEEKLY_WORDING.movements;
  return [...new Set([...Object.values(m.byPosition).flatMap((x) => Object.values(x)), m.steady, m.first_seen])];
}

/** 축 설명 한 줄 — "토크밀도(Nm/kg): …". 알 수 없는 축이면 null */
export function axisExplainKo(axisKey: string, axisLabel: string, unit: string | null): string | null {
  const A = WEEKLY_WORDING.axes as Record<string, string>;
  if (axisKey.startsWith('bench_')) return `${axisLabel}: ${A.bench}`;
  const text = A[axisKey];
  if (!text) return null;
  return `${axisLabel}${unit ? `(${unit})` : ''}: ${text}`;
}
