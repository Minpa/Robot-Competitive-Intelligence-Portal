// AUTO-GENERATED. Do not edit by hand.
// Regenerate with: ANTHROPIC_API_KEY=... npx tsx scripts/enrich-action-glossary.ts
//                  (or: npx tsx scripts/enrich-all.ts)
// Source: scripts/enrich-action-glossary.ts (Claude claude-opus-4-7)
// Generated: 2026-05-06T12:37:30.840Z

import type { ActionGlossaryEntry, AbbreviationEntry } from './data';

export const ACTION_GLOSSARY: ActionGlossaryEntry[] = [
  {
    "code": "COG-02",
    "category": "COG",
    "plainName": "다품목 동시 작업 처리",
    "description": "여러 부품 명세서를 동시에 처리하거나 여러 작업 대기열을 병렬로 관리하는 능력으로, 다품종 소량생산 라인에서 처리량을 좌우합니다."
  },
  {
    "code": "COG-03",
    "category": "COG",
    "plainName": "최적 동선 계산",
    "description": "창고·라인 내 이동 경로를 최단·최적으로 계획하는 능력으로, 작업 시간 단축과 생산성 향상의 핵심 요소입니다."
  },
  {
    "code": "COG-04",
    "category": "COG",
    "plainName": "실시간 작업 재계획",
    "description": "부품 부족·주문 변경 등 돌발 상황에서 부품 명세를 즉시 재계산해 작업을 이어가는 능력으로, 라인 정지 손실을 줄입니다."
  },
  {
    "code": "COG-07",
    "category": "COG",
    "plainName": "포장 순서 계획",
    "description": "박스에 담을 품목의 적재 순서를 사전에 계산해 결정하는 능력으로, 포장 품질과 작업 속도를 동시에 확보합니다."
  },
  {
    "code": "COG-08",
    "category": "COG",
    "plainName": "품목별 포장 순서 설계",
    "description": "품목 종류별 크기·무게·취급 주의 사항을 반영해 포장 순서를 설계하는 능력으로, 파손 방지와 공간 효율을 높입니다."
  },
  {
    "code": "COG-09",
    "category": "COG",
    "plainName": "피킹 순서 계획",
    "description": "적재함 내 부품을 어떤 순서로 집을지 미리 계획하는 능력으로, 피킹 속도와 충돌 회피에 직접 영향을 줍니다."
  },
  {
    "code": "COG-10",
    "category": "COG",
    "plainName": "다품목 피킹 순서 결정",
    "description": "여러 종류의 부품이 섞여 있는 환경에서 효율적인 피킹 순서를 계산하는 능력으로, 물류센터 처리 능력을 결정짓습니다."
  },
  {
    "code": "COG-11",
    "category": "COG",
    "plainName": "적재 순서 계획",
    "description": "바구니나 박스를 어떤 순서로 쌓을지 사전에 계산하는 능력으로, 무너짐 방지와 적재 밀도 향상에 필수적입니다."
  },
  {
    "code": "COG-12",
    "category": "COG",
    "plainName": "다품목 적재 패턴 설계",
    "description": "다양한 품목을 안정적이고 공간 효율적으로 쌓는 패턴을 자동 설계하는 능력으로, 운송 효율과 안전을 동시에 확보합니다."
  },
  {
    "code": "COG-13",
    "category": "COG",
    "plainName": "이상 징후 자동 검출",
    "description": "센서 데이터에서 평소와 다른 패턴을 자동으로 감지하는 능력으로, 설비 고장이나 품질 불량을 조기에 발견합니다."
  },
  {
    "code": "LOC-01",
    "category": "LOC",
    "plainName": "평지 정속 보행",
    "description": "공장 평지에서 일정한 속도로 안정적으로 이동하는 기본 보행 능력으로, 모든 이송 작업의 기본 토대가 됩니다."
  },
  {
    "code": "LOC-03",
    "category": "LOC",
    "plainName": "고정 장애물 회피",
    "description": "기둥·박스 등 움직이지 않는 장애물을 우회해 이동하는 능력으로, 복잡한 공장 통로에서의 자율 이동에 필수입니다."
  },
  {
    "code": "LOC-04",
    "category": "LOC",
    "plainName": "움직이는 장애물 회피",
    "description": "사람·지게차 등 이동하는 장애물을 실시간으로 인식해 피하는 능력으로, 인간 협업 환경에서의 안전성을 보장합니다."
  },
  {
    "code": "LOC-05",
    "category": "LOC",
    "plainName": "좁은 통로 통과",
    "description": "폭 80센티미터 수준의 좁은 통로를 통과해 이동하는 능력으로, 기존 공장 구조 변경 없이 도입 가능한지를 좌우합니다."
  },
  {
    "code": "LOC-06",
    "category": "LOC",
    "plainName": "극협소 공간 진입",
    "description": "폭 60센티미터 이하의 매우 좁은 공간에 진입해 작업하는 능력으로, 선박·플랜트 의장 작업의 핵심 차별화 요소입니다."
  },
  {
    "code": "LOC-07",
    "category": "LOC",
    "plainName": "계단 등반",
    "description": "단높이 17센티미터 수준의 일반 산업용 계단을 오르내리는 능력으로, 다층 공장 자율 이동의 필수 조건입니다."
  },
  {
    "code": "LOC-09",
    "category": "LOC",
    "plainName": "경사면 보행",
    "description": "15도 수준의 경사면을 안정적으로 보행하는 능력으로, 조선·건설·옥외 플랜트 등 비평탄 환경에서 운용 가능성을 결정합니다."
  },
  {
    "code": "MAN-01",
    "category": "MAN",
    "plainName": "양손 협조 박스 들기",
    "description": "양손을 협조시켜 10~15킬로그램급 바구니나 박스를 들어 옮기는 능력으로, 물류 이송 작업의 기본 역량입니다."
  },
  {
    "code": "MAN-02",
    "category": "MAN",
    "plainName": "단일 부품 픽업",
    "description": "정해진 위치의 단일 품목을 정확하게 집어 올리는 기본 조작 능력으로, 키팅·조립 자동화의 출발점입니다."
  },
  {
    "code": "MAN-03",
    "category": "MAN",
    "plainName": "정위치 배치",
    "description": "집은 부품을 지정된 위치에 정밀하게 내려놓는 능력으로, 후속 조립 공정의 품질과 작업 속도를 결정짓습니다."
  },
  {
    "code": "MAN-06",
    "category": "MAN",
    "plainName": "협소 공간 작업",
    "description": "좁은 공간 안으로 팔을 넣어 부품을 다루는 능력으로, 차체 내부·랙 내부 등 기존 로봇이 접근하기 어려운 영역을 커버합니다."
  },
  {
    "code": "MAN-07",
    "category": "MAN",
    "plainName": "정밀 커넥터 삽입",
    "description": "오차 1밀리미터 이내로 다양한 종류의 커넥터를 정확히 삽입하는 능력으로, 전장 조립 자동화의 핵심 기술입니다."
  },
  {
    "code": "MAN-08",
    "category": "MAN",
    "plainName": "고전압 안전 체결",
    "description": "고전압 커넥터를 절연·접지 절차를 지키며 안전하게 체결하는 능력으로, 전기차·배터리 조립의 필수 안전 역량입니다."
  },
  {
    "code": "MAN-09",
    "category": "MAN",
    "plainName": "체결 토크 제어",
    "description": "규정된 회전력으로 부품을 체결하는 능력으로, 풀림·파손을 방지해 완성품의 품질과 안전성을 확보합니다."
  },
  {
    "code": "MAN-10",
    "category": "MAN",
    "plainName": "양손 협조 체결",
    "description": "한 손이 부품을 잡고 다른 손이 체결하는 양손 협업 작업 능력으로, 사람 손이 필요했던 복잡 조립 공정을 자동화합니다."
  },
  {
    "code": "MAN-11",
    "category": "MAN",
    "plainName": "초정밀 체결",
    "description": "0.1밀리미터 수준의 미세 정밀도로 체결하는 능력으로, 반도체·디스플레이·정밀 전장품 조립에 적용됩니다."
  },
  {
    "code": "MAN-12",
    "category": "MAN",
    "plainName": "규격 박스 접기·테이핑",
    "description": "규격화된 박스를 펼치고 접고 테이프로 봉합하는 일련의 능력으로, 출하 포장 공정의 자동화율을 높입니다."
  },
  {
    "code": "MAN-13",
    "category": "MAN",
    "plainName": "완충재 충전",
    "description": "박스 내부에 보호 완충재를 채워 넣는 능력으로, 운송 중 파손을 방지해 반품률과 클레임을 줄입니다."
  },
  {
    "code": "MAN-14",
    "category": "MAN",
    "plainName": "비규격 박스 접기",
    "description": "크기·형태가 일정하지 않은 박스를 유연하게 접어 조립하는 능력으로, 다품종 소량 출하 환경에 대응합니다."
  },
  {
    "code": "MAN-15",
    "category": "MAN",
    "plainName": "비정형 품목 취급",
    "description": "형태가 일정하지 않은 부품·제품을 안정적으로 집고 다루는 능력으로, 의류·식품·잡화 등 비표준 품목 자동화의 관건입니다."
  },
  {
    "code": "MAN-16",
    "category": "MAN",
    "plainName": "맞춤 포장 작업",
    "description": "리본·포장지 등으로 선물 포장 수준의 맞춤 포장을 수행하는 능력으로, 프리미엄 이커머스·기프팅 시장에 대응합니다."
  },
  {
    "code": "MAN-17",
    "category": "MAN",
    "plainName": "용접 토치 운용",
    "description": "용접 토치를 잡고 정해진 경로를 따라 용접을 수행하는 능력으로, 조선·중공업 용접 인력 부족에 대한 핵심 대응책입니다."
  },
  {
    "code": "MAN-18",
    "category": "MAN",
    "plainName": "곡면 경로 추종",
    "description": "곡면 형상을 따라 일정한 거리·각도를 유지하며 작업하는 능력으로, 용접·도장 품질을 좌우하는 핵심 기술입니다."
  },
  {
    "code": "MAN-19",
    "category": "MAN",
    "plainName": "도장 분사 작업",
    "description": "스프레이 건을 운용해 균일하게 도장을 분사하는 능력으로, 도장 품질 편차와 도료 낭비를 동시에 줄입니다."
  },
  {
    "code": "MAN-20",
    "category": "MAN",
    "plainName": "부드러운 그리퍼 운용",
    "description": "무르거나 깨지기 쉬운 품목을 손상 없이 집기 위한 유연 그리퍼 운용 능력으로, 식품·생활용품 자동화에 적합합니다."
  },
  {
    "code": "MAN-21",
    "category": "MAN",
    "plainName": "고소 적재·피킹",
    "description": "높이 2미터 이상 고층 랙에서 부품을 집거나 적재하는 능력으로, 창고 공간 활용도를 극대화합니다."
  },
  {
    "code": "MAN-22",
    "category": "MAN",
    "plainName": "토크 드라이버 운용",
    "description": "전동 토크 드라이버를 손에 쥐고 나사를 정확한 회전력으로 체결하는 능력으로, 조립 품질 표준화의 기본입니다."
  },
  {
    "code": "MAN-23",
    "category": "MAN",
    "plainName": "셀프태핑 너트 운용",
    "description": "별도 탭 가공 없이 자체 절삭으로 체결되는 너트를 다루는 능력으로, 차체·가전 라인의 고속 체결에 활용됩니다."
  },
  {
    "code": "MAN-24",
    "category": "MAN",
    "plainName": "협소 손목 회전 체결",
    "description": "좁은 공간에서 손목 관절만으로 회전 체결을 수행하는 능력으로, 차체 내부·기계 내부 작업의 자동화 범위를 넓힙니다."
  },
  {
    "code": "MAN-25",
    "category": "MAN",
    "plainName": "내부 정밀 체결",
    "description": "제품·차체 내부의 보이지 않거나 접근이 어려운 위치에서 정밀하게 체결하는 능력으로, 기존 로봇 대비 핵심 차별점입니다."
  },
  {
    "code": "MAN-26",
    "category": "MAN",
    "plainName": "케이블 배선 작업",
    "description": "하네스나 다발 케이블을 정해진 경로를 따라 배치하는 능력으로, 자동차·전장 조립의 대표적 미자동화 영역을 공략합니다."
  },
  {
    "code": "MAN-27",
    "category": "MAN",
    "plainName": "연성기판 삽입",
    "description": "휘어지는 얇은 회로 기판을 손상 없이 커넥터에 삽입하는 능력으로, 스마트폰·디스플레이 조립의 고난도 공정입니다."
  },
  {
    "code": "MAN-28",
    "category": "MAN",
    "plainName": "케이블 결속",
    "description": "케이블을 타이·클립 등으로 묶어 고정하는 능력으로, 다수의 결속점을 정확히 처리해 배선 품질을 확보합니다."
  },
  {
    "code": "MAN-29",
    "category": "MAN",
    "plainName": "실시간 힘 조절",
    "description": "작업 중 케이블·부품에 가해지는 힘을 실시간으로 감지·조절하는 능력으로, 손상 없는 유연 조립을 가능하게 합니다."
  },
  {
    "code": "MAN-30",
    "category": "MAN",
    "plainName": "협소 가변 라우팅",
    "description": "좁고 형상이 변하는 공간에서 케이블을 배선하는 고난도 능력으로, 차체·항공기 내부 배선 자동화의 핵심 기술입니다."
  },
  {
    "code": "MAN-31",
    "category": "MAN",
    "plainName": "적재 패턴 실행",
    "description": "계산된 적재 패턴에 맞춰 박스·바구니를 정확히 쌓는 능력으로, 팔레타이징 자동화의 직접 실행 단계입니다."
  },
  {
    "code": "MAN-32",
    "category": "MAN",
    "plainName": "비파괴 검사 도구 운용",
    "description": "초음파·와전류 등 비파괴 검사 장비를 직접 다루는 능력으로, 점검 인력을 대체해 안전성과 정밀도를 동시에 확보합니다."
  },
  {
    "code": "NAV-01",
    "category": "NAV",
    "plainName": "라인 주변 자율 측위",
    "description": "생산 라인 옆 통로를 스스로 지도화하며 위치를 파악하는 능력으로, 별도 인프라 없이 라인 사이드 운영을 가능케 합니다."
  },
  {
    "code": "NAV-02",
    "category": "NAV",
    "plainName": "다중 라인 순회",
    "description": "여러 생산 라인을 정해진 일정에 따라 순회 이동하는 능력으로, 한 대의 로봇이 다수 라인을 커버해 투자 효율을 높입니다."
  },
  {
    "code": "NAV-03",
    "category": "NAV",
    "plainName": "다창고 동선 계획",
    "description": "여러 창고·구역을 가로지르는 최적 이동 경로를 계획하는 능력으로, 대규모 물류센터 운영 효율을 결정합니다."
  },
  {
    "code": "NAV-04",
    "category": "NAV",
    "plainName": "비정형 동선 주행",
    "description": "미리 정해지지 않은 자유 경로를 상황에 맞춰 주행하는 능력으로, 변화가 잦은 현장에서도 유연한 운영이 가능합니다."
  },
  {
    "code": "NAV-05",
    "category": "NAV",
    "plainName": "의장 작업 위치 이동",
    "description": "점검·계측 대상 의장 위치까지 자율 이동하는 능력으로, 조선·플랜트 점검 인력 부담을 줄여줍니다."
  },
  {
    "code": "NAV-06",
    "category": "NAV",
    "plainName": "블록 단위 순회",
    "description": "조선소·플랜트의 블록 단위 작업 구역을 자동으로 순회하는 능력으로, 광역 점검·계측의 자동화 기반이 됩니다."
  },
  {
    "code": "PER-03",
    "category": "PER",
    "plainName": "협소 공간 자율 측위",
    "description": "좁고 특징이 적은 공간에서도 위치를 정확히 인식하는 능력으로, 차체·선체 내부 등 난이도 높은 환경 작업을 가능케 합니다."
  },
  {
    "code": "PER-04",
    "category": "PER",
    "plainName": "부품 명세 인식",
    "description": "작업 지시서상의 부품 명세를 시각적으로 인식하고 매칭하는 능력으로, 키팅 정확도와 오류율을 직접 좌우합니다."
  },
  {
    "code": "PER-05",
    "category": "PER",
    "plainName": "품목 시각 분류",
    "description": "카메라 영상으로 품목 종류를 자동 분류하는 능력으로, 다품종 환경에서 분류·피킹 자동화의 기본 토대입니다."
  },
  {
    "code": "PER-06",
    "category": "PER",
    "plainName": "6축 자세 인식",
    "description": "부품의 위치와 3축 회전 자세를 동시에 추정하는 능력으로, 정밀 조립·체결 작업의 정확도를 결정짓습니다."
  },
  {
    "code": "PER-07",
    "category": "PER",
    "plainName": "비정형 위치 인식",
    "description": "위치가 정해지지 않은 부품의 좌표를 추정하는 능력으로, 컨베이어 외 자유 배치 환경에서의 자동화에 필수입니다."
  },
  {
    "code": "PER-08",
    "category": "PER",
    "plainName": "서브밀리 정렬 인식",
    "description": "1밀리미터 미만 수준의 정밀 정렬 오차를 시각으로 측정하는 능력으로, 고정밀 조립·체결의 품질을 보장합니다."
  },
  {
    "code": "PER-09",
    "category": "PER",
    "plainName": "비정형 형상 인식",
    "description": "형태가 일정하지 않은 부품·박스의 형상을 인식하는 능력으로, 비표준 품목 자동화의 핵심 시각 기술입니다."
  },
  {
    "code": "PER-10",
    "category": "PER",
    "plainName": "곡면 경로 인식",
    "description": "곡면 표면 위 용접·도장 경로를 시각으로 추출하는 능력으로, 작업 품질 편차를 줄이고 무인화를 가능하게 합니다."
  },
  {
    "code": "PER-12",
    "category": "PER",
    "plainName": "도장 영역 인식",
    "description": "도장 대상 면적과 경계를 자동 인식하는 능력으로, 도료 사용량 최적화와 도장 품질 균일화를 지원합니다."
  },
  {
    "code": "PER-13",
    "category": "PER",
    "plainName": "적재함 위치 인식",
    "description": "부품이 담긴 적재함의 위치와 자세를 인식하는 능력으로, 빈 피킹 자동화의 출발점이 됩니다."
  },
  {
    "code": "PER-14",
    "category": "PER",
    "plainName": "반사 표면 인식",
    "description": "금속·유리 같은 반사면 부품을 정확히 인식하는 능력으로, 기존 비전 시스템이 어려워했던 영역의 자동화를 가능케 합니다."
  },
  {
    "code": "PER-15",
    "category": "PER",
    "plainName": "나사 위치 인식",
    "description": "체결 대상 나사 구멍의 위치를 시각적으로 인식하는 능력으로, 나사 체결 자동화의 정확도를 결정합니다."
  },
  {
    "code": "PER-16",
    "category": "PER",
    "plainName": "다지점 위치 인식",
    "description": "여러 체결 지점을 동시에 인식·추적하는 능력으로, 다수 나사 체결 작업의 속도와 정확도를 동시에 확보합니다."
  },
  {
    "code": "PER-17",
    "category": "PER",
    "plainName": "케이블 다발 인식",
    "description": "여러 가닥이 얽힌 케이블 다발을 시각으로 구분 인식하는 능력으로, 배선 자동화의 가장 큰 기술 장벽을 해소합니다."
  },
  {
    "code": "PER-18",
    "category": "PER",
    "plainName": "외관 자동 검사",
    "description": "카메라 영상으로 제품 외관 결함을 자동 판독하는 능력으로, 검사 인력 의존도를 낮추고 품질 일관성을 확보합니다."
  },
  {
    "code": "PER-19",
    "category": "PER",
    "plainName": "협소 환경 자율 측위",
    "description": "점검 대상 협소 구역에서도 자기 위치를 정확히 파악하는 능력으로, 의장·플랜트 내부 자동 점검을 가능하게 합니다."
  },
  {
    "code": "PER-20",
    "category": "PER",
    "plainName": "비파괴 검사 데이터 수집",
    "description": "초음파·열화상 등 비파괴 검사 데이터를 자동으로 수집하는 능력으로, 점검 결과의 디지털화와 추적 관리를 지원합니다."
  }
] as const;

export const ABBREVIATIONS: AbbreviationEntry[] = [
  {
    "term": "VLA",
    "expansion": "Vision-Language-Action Model",
    "description": "시각·언어·행동을 하나의 인공지능 모델에서 처리하는 차세대 로봇 기반 모델로, 휴머노이드의 범용 작업 수행 능력을 결정짓는 핵심 기술입니다."
  },
  {
    "term": "F/T",
    "expansion": "Force/Torque Sensor",
    "description": "로봇 손목 등에 부착되어 가해지는 힘과 회전력을 측정하는 센서로, 정밀 조립·체결과 충돌 감지의 핵심 부품입니다."
  },
  {
    "term": "F-T",
    "expansion": "Force-Torque Sensor",
    "description": "힘·토크 센서의 다른 표기로, 동일하게 정밀 조작과 안전 제어에 사용되는 핵심 센서를 의미합니다."
  },
  {
    "term": "ZMP",
    "expansion": "Zero Moment Point",
    "description": "이족 보행 로봇이 넘어지지 않고 안정적으로 걷기 위한 무게중심 제어 기준점으로, 보행 안정성을 좌우하는 고전 제어 지표입니다."
  },
  {
    "term": "IECEx",
    "expansion": "IEC System for Certification to Standards Relating to Equipment for Use in Explosive Atmospheres",
    "description": "폭발 위험 지역에서 사용하는 장비에 대한 국제 방폭 인증 체계로, 정유·화학·조선 현장 진입을 위한 필수 인증입니다."
  },
  {
    "term": "IP65",
    "expansion": "Ingress Protection Rating 65",
    "description": "먼지로부터 완전 보호되고 모든 방향의 분사 물에 견디는 보호 등급으로, 일반 산업 현장에서 요구되는 기본 방진·방수 수준입니다."
  },
  {
    "term": "IP67",
    "expansion": "Ingress Protection Rating 67",
    "description": "먼지로부터 완전 보호되며 일정 수심 침수에도 견디는 보호 등급으로, 옥외·세척 환경에서의 안정 운용을 보장합니다."
  },
  {
    "term": "ISO 10218",
    "expansion": "ISO 10218 Robots and Robotic Devices — Safety Requirements for Industrial Robots",
    "description": "산업용 로봇의 안전 요구 사항을 규정한 국제 표준으로, 공장 도입을 위한 가장 기본이 되는 안전 인증 기준입니다."
  },
  {
    "term": "ISO 13482",
    "expansion": "ISO 13482 Robots and Robotic Devices — Safety Requirements for Personal Care Robots",
    "description": "사람과 가까이서 작동하는 서비스·돌봄 로봇의 안전 요구 사항 표준으로, 인간 협업·서비스 로봇 사업화의 핵심 기준입니다."
  },
  {
    "term": "BOM",
    "expansion": "Bill of Materials",
    "description": "제품을 구성하는 부품 목록과 수량을 정리한 자재 명세서로, 생산 계획·키팅·구매 전반의 기준 데이터입니다."
  },
  {
    "term": "FPC",
    "expansion": "Flexible Printed Circuit",
    "description": "휘어지는 얇은 필름 형태의 회로 기판으로, 스마트폰·디스플레이 등 소형 전자기기 조립에 광범위하게 쓰입니다."
  },
  {
    "term": "SLAM",
    "expansion": "Simultaneous Localization and Mapping",
    "description": "로봇이 이동하면서 주변 지도를 만들고 동시에 자신의 위치를 추정하는 기술로, 자율 주행·자율 점검의 기반 기술입니다."
  },
  {
    "term": "DoF",
    "expansion": "Degrees of Freedom",
    "description": "로봇이 독립적으로 움직일 수 있는 관절 자유도의 수로, 작업 가능 범위와 동작 유연성을 결정하는 기본 사양입니다."
  },
  {
    "term": "SKU",
    "expansion": "Stock Keeping Unit",
    "description": "재고 관리를 위해 부여된 품목 단위 식별 코드로, 물류·유통에서 품목을 구분하는 가장 기본적인 단위입니다."
  },
  {
    "term": "RaaS",
    "expansion": "Robot as a Service",
    "description": "로봇을 구매하지 않고 구독·임대 형태로 이용하는 사업 모델로, 초기 투자 부담을 줄여 도입 확산을 가속하는 핵심 비즈니스 모델입니다."
  },
  {
    "term": "LiDAR",
    "expansion": "Light Detection and Ranging",
    "description": "레이저로 거리를 측정해 3차원 공간 정보를 얻는 센서로, 자율 주행과 정밀 측위의 핵심 부품입니다."
  },
  {
    "term": "PFL",
    "expansion": "Power and Force Limiting",
    "description": "인간과 로봇이 부딪혀도 다치지 않도록 출력과 힘을 제한하는 협동 로봇 안전 기술로, 인간 협업 환경의 필수 안전 기능입니다."
  },
  {
    "term": "KPI",
    "expansion": "Key Performance Indicator",
    "description": "사업·운영 성과를 측정하는 핵심 지표로, 로봇 도입 효과를 정량적으로 평가하고 보고할 때 기준이 됩니다."
  },
  {
    "term": "TSP",
    "expansion": "Traveling Salesman Problem",
    "description": "여러 지점을 가장 짧은 경로로 모두 방문하는 최적 경로 문제로, 피킹·순회 동선 최적화 알고리즘의 이론적 기반입니다."
  },
  {
    "term": "DC",
    "expansion": "Distribution Center",
    "description": "상품의 보관·분류·출하를 담당하는 물류 거점으로, 휴머노이드 로봇 도입의 대표적 적용 시장입니다."
  }
] as const;

export const ACTION_INDEX: Record<string, ActionGlossaryEntry> = Object.fromEntries(
  ACTION_GLOSSARY.map((e) => [e.code, e]),
);

export const ABBR_INDEX: Record<string, AbbreviationEntry> = Object.fromEntries(
  ABBREVIATIONS.map((e) => [e.term, e]),
);

export function lookupAction(code: string): ActionGlossaryEntry | undefined {
  return ACTION_INDEX[code];
}

export function lookupAbbreviation(term: string): AbbreviationEntry | undefined {
  return ABBR_INDEX[term];
}

export const GLOSSARY_GENERATED_META: { generatedAt: string | null; model: string | null; actionCount: number; abbrCount: number } = {
  generatedAt: "2026-05-06T12:37:30.840Z",
  model: "claude-opus-4-7",
  actionCount: 70,
  abbrCount: 20,
};

export function parseActionCode(text: string): { code: string | null; rest: string } {
  const m = text.match(/^(LOC|MAN|PER|COG|NAV|SAF)-\d+\s*/);
  if (!m) return { code: null, rest: text };
  return { code: m[0].trim(), rest: text.slice(m[0].length).trim() };
}

export function findAbbreviationsInText(text: string): AbbreviationEntry[] {
  if (ABBREVIATIONS.length === 0) return [];
  const out = new Set<AbbreviationEntry>();
  for (const a of ABBREVIATIONS) {
    if (text.includes(a.term)) out.add(a);
  }
  return [...out];
}
