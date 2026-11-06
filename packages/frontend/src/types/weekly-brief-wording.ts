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
  sections: {
    conclusions: { title: '이번 주 주요 내용', subtitle: '이번 주 눈여겨볼 변화와 그 의미입니다' },
    gap: { title: '경쟁사 동향과 우리 위치', subtitle: '이번 주 새 자료가 있는 항목만 · 수치는 모두 서버 계산' },
    tech: { title: '기술 흐름', subtitle: '최근 4주 대 이전 4주 비교 · 8주 추이' },
    business: { title: '사업·공급망 동향', subtitle: '현재 등록 현황과 이번 주 동향' },
    questions: { title: '함께 검토해 주실 사항', subtitle: '참고 자료와 함께 정리했습니다' },
    evidence: { title: '참고 자료', subtitle: '영상 · 논문 · 뉴스' },
  },
  /** 결론 줄 역할 라벨 (detail 은 보조 설명) */
  roles: { change: '변화', why: '의미', action: '제안', detail: '참고' },
  /** 결론 행동 배지 */
  actions: { evaluate: '검토 제안', contact: '접촉 제안', watch: '지켜볼 사항', decide: '결정 필요', none: '' },
  /** 질문 유형 배지 (행동 배지와 같은 말) */
  questionKinds: { evaluate: '검토 제안', contact: '접촉 제안', decide: '결정 필요', watch: '지켜볼 사항' },
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
