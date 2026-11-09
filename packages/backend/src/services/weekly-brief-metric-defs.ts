/**
 * 주간 브리프 v3 — 숫자·칩이 "무엇을 센 것인지"를 한 문장으로 설명하는 정의 사전 (순수 함수, DB·AI 접근 없음).
 *
 *  - 사실 칩(business.picture[], moves[].facts[])의 note 는 여기서 만든다. 분모(46기 등)는 서버 값으로 채운다.
 *  - 기술 흐름 카드의 "이 주제는 …을 뜻합니다" 설명(techExplain)도 여기서 만든다.
 *  - 독자가 ARGOS 를 몰라도 이해할 수 있어야 하므로 약어·내부 용어를 풀어 쓴다.
 */

import { DOMAIN_TAXONOMIES } from './domain-topics.js';
import type { TechSignalDraft } from './weekly-brief-trend.js';

export const CHIP_NOTE_MAX = 120;

/** 칩 정의 사전 — 키는 칩 종류, 값은 note 를 만드는 함수 */
export const METRIC_DEFINITIONS = {
  inHouse: (robots: number) => `조사 대상 휴머노이드 로봇 ${robots}기 중 관절 액추에이터를 제조사가 직접 설계·생산하는 로봇 수입니다.`,
  external: (robots: number, mixed: number) =>
    `조사 대상 로봇 ${robots}기 중 완성된 관절 모듈을 외부 공급사에서 사서 쓰는 로봇 수입니다.${mixed > 0 ? ` 일부만 외부에서 사는 ${mixed}기를 포함합니다.` : ''}`,
  unknown: (robots: number) => `조사 대상 로봇 ${robots}기 중 공개 자료로는 자체인지 외부인지 확인되지 않은 로봇 수입니다. 외부 조달이라는 뜻은 아닙니다.`,
  inHouseSells: () => '직접 만든 액추에이터를 다른 회사에도 파는 제조사의 로봇 수입니다.',
  medianPrice: (n: number) => `가격이 공개된 휴머노이드 ${n}기의 공개 가격 중앙값(USD)입니다.`,
  adoptions: () => '로봇 제조사가 외부 공급사의 액추에이터를 채택한 것으로 확인된 사례 수입니다.',
  vendorMarkets: () => '액추에이터 공급사 가운데 시장 세그먼트(어느 로봇 시장을 겨냥하는지)가 등록된 공급사 수입니다.',
  robotPrice: (robot: string, estimated: boolean) => `${robot}의 공개 가격(가격 범위의 중간값, USD)입니다.${estimated ? ' 출처 신뢰도가 낮은 추정치입니다.' : ''}`,
  vendorAdoptions: (vendor: string) => `${vendor}의 액추에이터를 채택한 것으로 확인된 로봇 제조사 사례 수입니다.`,
  posture: (posture: 'external' | 'in_house' | 'unknown', estimated: boolean) =>
    (posture === 'external'
      ? '이 회사 로봇은 완성된 관절 모듈을 외부 공급사에서 사서 씁니다.'
      : posture === 'in_house'
        ? '이 회사 로봇은 관절 액추에이터를 제조사가 직접 설계·생산합니다.'
        : '이 회사 로봇의 관절 액추에이터 조달 방식은 공개 자료로 확인되지 않았습니다.') + (estimated ? ' 근거 신뢰도가 낮은 추정입니다.' : ''),
} as const;

/** 신뢰도 D·F 는 추정치로 표기한다 (등급 코드 자체는 화면에 쓰지 않는다) */
export function isEstimatedGrade(grade: string | null | undefined): boolean {
  return grade === 'D' || grade === 'F';
}

const THEME_EXPLAIN: Readonly<Record<string, string>> = {
  tactile_integration: '로봇 손가락에 촉각 센서를 넣어 접촉과 힘을 감지하는 기술',
  vla_manipulation: '카메라 영상과 말(언어)을 보고 로봇의 팔·손 동작을 곧바로 만들어 내는 AI 모델(VLA)',
  joint_module_sourcing: '로봇 제조사가 완성된 관절 모듈을 외부 공급사에서 조달하는 방식',
  harmonic_alternative: '하모닉 감속기 대신 사이클로이드·유성 롤러 같은 다른 감속 방식을 쓰는 움직임',
  hydraulic_to_electric: '유압으로 움직이던 로봇을 전기 구동으로 바꾸는 움직임',
  mass_price: '로봇의 대량 생산과 가격 인하',
};

function clipText(s: string, max: number): string {
  const chars = Array.from(s.replace(/\s+/g, ' ').trim());
  return chars.length <= max ? chars.join('') : chars.slice(0, max - 1).join('') + '…';
}

/** 기술 흐름 주제 설명 한 문장 — "이 주제는 …을 뜻합니다". 독자가 ARGOS 를 몰라도 주제가 무엇인지 알 수 있어야 한다 */
export function techExplain(d: Pick<TechSignalDraft, 'kind' | 'label' | 'ref'>): string {
  if (d.kind === 'procurement') return '이 주제는 CI(경쟁사 정보) 변경 이력에서 관절 모듈 조달 방식이 외부 조달 쪽으로 바뀐 건수를 뜻합니다.';
  if (d.kind === 'theme') {
    const desc = d.ref.themeId ? THEME_EXPLAIN[d.ref.themeId] : undefined;
    if (desc) return `이 주제는 ${desc}에 관한 자료를 뜻합니다.`;
    return `이 주제는 '${d.label}'와 관련된 영상·논문·기사를 뜻합니다.`;
  }
  if (d.kind === 'subtopic' && d.ref.topicDomain && d.ref.topicId) {
    const def = DOMAIN_TAXONOMIES[d.ref.topicDomain]?.topics.find((t) => t.id === d.ref.topicId)?.definition;
    if (def) return `이 주제는 ${clipText(def, 100)}에 관한 자료를 뜻합니다.`;
  }
  return `이 주제는 '${d.label}' 키워드가 붙은 영상·논문·기사를 뜻합니다.`;
}
