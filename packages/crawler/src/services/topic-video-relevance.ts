/**
 * 단위기술 축(hand/rfm/actuator/expo/production) 검색 수집 영상의 관련성 판정
 *
 * topic-video-search.service.ts에서 저장 전 필터링에 사용하는 순수 함수.
 * 도메인별 정규식은 frontend/src/components/tech/TechDomainView.tsx의
 * DOMAIN_CONFIGS(paperRegex/videoTextRegex/excludeVideoRegex)와 동기화되어야 한다 —
 * 한쪽을 수정하면 다른 쪽도 함께 갱신할 것.
 */

export type TopicDomain = 'hand' | 'rfm' | 'actuator' | 'expo' | 'production';

const DOMAIN_REGEX: Record<TopicDomain, RegExp> = {
  hand: /\bhands?\b|gripper|finger|tactile|\bdex\w*|grasp|manipulat|in-hand|핸드|그리퍼|灵巧手|机械手|夹爪|多指/i,
  rfm: /foundation model|vision.language.action|\bVLA\b|imitation learning|reinforcement learning|diffusion policy|world model|embodied|manipulation policy|sim.to.real/i,
  actuator: /actuator|\bmotor\b|gearbox|harmonic drive|transmission|joint torque|quasi.direct|proprioceptive|series elastic/i,
  expo: /\bCES\b|\bexpo\b|exhibition|booth|\bIROS\b|\bICRA\b|hannover|world robot conference|\bWRC\b|trade show|robocup|automatica|automate 20|world artificial intelligence/i,
  production: /mass.?produc|production (line|ramp|facility|capacity)|start of production|robofab|botq|factory tour|manufacturing (line|facility|plant)|assembly line for|robot factory|생산라인|양산|人形机器人|量产/i,
};

/** 로봇 문맥 가드 — 도메인 키워드만으로는 로봇과 무관한 콘텐츠(일반 산업용 모터 등)를 걸러내지 못하므로 필수 */
const ROBOT_CONTEXT_REGEX = /\brobot|robotic|humanoid|휴머노이드|로봇|机器人|机械臂/i;

/**
 * 도메인별 브랜드 문맥 — 제목에 "robot"이 없어도 해당 업체·제품명이 있으면 로봇 문맥으로 인정
 * (예: "Atlas Goes Hands On", "Shadow Hand teleoperation demo")
 */
const DOMAIN_CONTEXT_REGEX: Partial<Record<TopicDomain, RegExp>> = {
  hand: /shadow (robot|hand)|sharpa|tesollo|inspire (robots?|hand)|psyonic|ability hand|sanctuary|wonik|allegro hand|leap hand|robotiq|linker ?bot|daimon|paxini|\boptimus\b|\batlas\b|figure 0\d|figure ai|unitree|agibot|dexmate|orca hand|\bruka\b|toyota research|\btri\b|boston dynamics|\btesla\b|1x technologies|\bneo\b/i,
};

/**
 * 공통 제외 — 키노트·실적발표·인터뷰 등 데모 시연이 아닌 콘텐츠.
 * 설명문 보일러플레이트("see our interview on the blog" 등) 오탐을 막기 위해 **제목에만** 적용한다.
 */
const EXCLUDE_REGEX = new RegExp(
  [
    // 비데모 콘텐츠
    'keynote|earnings|shareholder|annual meeting|interview|podcast|webinar|웨비나|기조연설|unboxing|reaction|documentary trailer',
    // "hand"의 비로봇 용법
    'second.?hand|hand-?held|hands-on (review|with|preview|look|test|impressions)',
    // 의료·마사지·보철
    'massag|prosthe|amputee',
    // 공작·완구·튜토리얼
    'how to (draw|make)|drawing tutorial|speed ?draw|\\btutorial\\b|cosplay|costume|halloween|\\blego\\b|\\btoys?\\b|\\bkids?\\b|cardboard',
    // 게임·애니메이션
    'minecraft|roblox|fortnite|gameplay|video game|\\bgaming\\b|animation|cartoon|\\bmeme\\b|prank',
    // 금융
    'forex|trading bot|crypto',
  ].join('|'),
  'i'
);

export function isRelevantTopicVideo(
  domain: TopicDomain,
  title: string,
  description: string | null | undefined
): boolean {
  const text = `${title} ${description ?? ''}`;
  const domainRegex = DOMAIN_REGEX[domain];

  if (!domainRegex.test(text)) return false;
  if (!ROBOT_CONTEXT_REGEX.test(text) && !DOMAIN_CONTEXT_REGEX[domain]?.test(text)) return false;
  if (EXCLUDE_REGEX.test(title)) return false;

  return true;
}
