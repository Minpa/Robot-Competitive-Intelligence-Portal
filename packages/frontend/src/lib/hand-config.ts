// 핸드 벤치마크/리스트에서 공유하는 시각 설정 + 전략 텍스트.
// 8종 핸드 slug 기준.

export const HAND_COLORS: Record<string, string> = {
  'shadow-e3m5': '#22d3ee',
  'allegro-v4': '#f43f5e',
  'tesollo-dg5f': '#fb923c',
  'inspire-rh56dfx': '#a78bfa',
  'paxini-dexh13': '#34d399',
  'linkerhand-l20': '#fbbf24',
  'sanctuary-phoenix': '#ff6b9d',
  'schunk-svh': '#94a3b8',
};

// "10점 = N" Perfect Hand Spec 천장값 (레이더 차트 축 보조 표기용)
export const HAND_AXIS_MAX_LABELS: Record<string, string> = {
  dof: '24 DoF',
  payload: '10 kg',
  gripForce: '50 N',
  responseSpeed: '10 Hz',
  tactileChannels: '100+ 채널',
  weightEfficiency: '5.0 비율',
};

export const HAND_STRATEGIES: Record<string, string> = {
  'shadow-e3m5':
    '연구용 표준. 촉각 + DoF 최강이나 무게 문제로 휴머노이드 적용 한계. 차세대는 경량화가 관건.',
  'allegro-v4':
    '한국 연구 시장 표준. 4지형 한계 (엄지 부재). 촉각 옵션화 + DoF 확장이 차세대 과제.',
  'tesollo-dg5f':
    '국산 다지형 표준. 5핑거 균형형. 촉각 채널 확대 + 응답속도 강화가 차별화 포인트.',
  'inspire-rh56dfx':
    '휴머노이드 표준 핸드 — 페이로드/무게 효율 최강. 촉각 채널 확장으로 VLA 학습 호환성 추격 필요.',
  'paxini-dexh13':
    '텍타일 + 응답속도 양강. 1,300 텍셀 DexSkin이 핵심 차별점. DoF 확장 시 종합 1위 가능.',
  'linkerhand-l20':
    'DoF 20 + 800g 경량 — 가성비 강점. 촉각 채널 확대로 Shadow급 추격 목표.',
  'sanctuary-phoenix':
    '자체 휴머노이드 통합 핸드. 그립력 강점. 촉각 + 외부 SDK 부재가 한계.',
  'schunk-svh':
    '산업용 5지형 베이스라인. 응답속도/촉각이 다지형 핸드 대비 약점. 산업 도구 그립력은 강점.',
};
