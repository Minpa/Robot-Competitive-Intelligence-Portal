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
  actuator:
    /actuator|joint module|\bmotors?\b|gearbox|harmonic|cycloidal|planetary|quasi.direct|\bqdd\b|strain wave|roller screw|ball screw|series elastic|backdrivab|torque density|transmission|joint torque|proprioceptive|액추에이터|감속기|관절 모듈|执行器|关节模组|减速器/i,
  expo: /\bCES\b|\bexpo\b|exhibition|booth|\bIROS\b|\bICRA\b|hannover|world robot conference|\bWRC\b|trade show|robocup|automatica|automate 20|world artificial intelligence/i,
  production: /mass.?produc|production (line|ramp|facility|capacity)|start of production|robofab|botq|factory tour|manufacturing (line|facility|plant)|assembly line for|robot factory|생산라인|양산|人形机器人|量产/i,
};

/** 로봇 문맥 가드 — 도메인 키워드만으로는 로봇과 무관한 콘텐츠(일반 산업용 모터 등)를 걸러내지 못하므로 필수 */
const ROBOT_CONTEXT_REGEX = /\brobot|robotic|humanoid|휴머노이드|로봇|机器人|机械臂/i;

/**
 * 도메인별 브랜드 문맥 — 제목에 "robot"이 없어도 해당 업체·제품명이 있으면 로봇 문맥으로 인정
 * (예: "Atlas Goes Hands On", "Shadow Hand teleoperation demo")
 * BrainCo 는 단독 `brainco`/`revo` 로 통과시키지 않는다 — BCI 헤드밴드 영상("hands-free")이 오탐되고, Revo2 는 1X NEO 모터 이름이기도 하다.
 * 반드시 BrainCo 와 Revo 가 근접해 함께 나오거나(강脑 … 灵巧手 포함) 해야 한다.
 */
const DOMAIN_CONTEXT_REGEX: Partial<Record<TopicDomain, RegExp>> = {
  hand: /shadow (robot|hand)|sharpa|tesollo|inspire (robots?|hand)|psyonic|ability hand|sanctuary|wonik|allegro hand|leap hand|robotiq|linker ?bot|daimon|paxini|\boptimus\b|\batlas\b|figure 0\d|figure ai|unitree|agibot|dexmate|orca hand|\bruka\b|toyota research|\btri\b|boston dynamics|\btesla\b|1x technologies|\bneo\b|\bbrain ?co\b[\s\S]{0,120}\brevo ?\d?\b|\brevo ?\d?\b[\s\S]{0,120}\bbrain ?co\b|强脑[\s\S]{0,60}灵巧手|灵巧手[\s\S]{0,60}强脑/i,
  // 액추에이터·관절 모듈 업체와 이를 자체 개발하는 휴머노이드 업체 (제목에 "robot"이 없는 티어다운·벤치 영상 수용)
  actuator:
    /robstride|cubemars|t-?motor|myactuator|unitree|fourier|nabtesco|maxon|faulhaber|\btesla\b|\boptimus\b|figure 0\d|figure ai|apptronik|agibot|kepler|hyundai mobis|lg axium|\bmit cheetah\b|\bhebi\b|\bdynamixel\b/i,
};

/**
 * 도메인 전용 제외 — 공통 제외(EXCLUDE_REGEX)와 같이 **제목에만** 적용한다.
 * actuator: 자동차·브레이크·드론 ESC·공작기계 등 로봇과 무관한 모터 영상 (브랜드 문맥 tesla 등으로 통과하는 차량 영상 포함)
 */
const DOMAIN_EXCLUDE_REGEX: Partial<Record<TopicDomain, RegExp>> = {
  actuator: new RegExp(
    [
      // 자동차·전동 차량
      '\\bcars?\\b|automotive|\\bautomobile|\\bvehicles?\\b|\\bEVs?\\b|electric vehicle|model [3sxy]\\b|cybertruck|roadster|autopilot|\\bfsd\\b|e-?bike|scooter|\\btruck',
      // 브레이크·차량 부품
      '\\bbrakes?\\b|brake (pad|caliper)|power window|wiper|\\bhvac\\b|turbocharger|alternator',
      // 드론·RC
      '\\bdrones?\\b|\\besc\\b|quadcopter|\\bfpv\\b|rc (car|plane|boat|truck)',
      // 공작기계·가전·건물 설비
      '3d printer|\\bcnc\\b|washing machine|\\bdishwasher|elevator|garage door|\\bconveyor\\b|air conditioner',
    ].join('|'),
    'i'
  ),
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
  if (DOMAIN_EXCLUDE_REGEX[domain]?.test(title)) return false;

  return true;
}
