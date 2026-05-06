// AUTO-GENERATED. Do not edit by hand.
// Regenerate with: ANTHROPIC_API_KEY=... npx tsx scripts/enrich-cloid-gripper.ts
// Source: scripts/enrich-cloid-gripper.ts (Claude claude-opus-4-7)
// Generated: 2026-05-06T12:39:48.167Z

import type { RequiredGripper } from './data';

export interface GripperRecord {
  generatedAt: string;
  model: string;
  cellId: string;
  lv: 1 | 2 | 3 | 4;
  gripper: RequiredGripper;
}

export const GRIPPER_DATA: GripperRecord[] = [
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "tote-logistics",
    "lv": 1,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "양손으로 표준 Tote(≤10kg)를 들어 AMR/컨베이어 간 이재. 양손 균형 제어와 Tote 핸들/측면 그립 형상이 핵심이며 정밀도 요구는 낮음(±5mm).",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "tote-logistics",
    "lv": 2,
    "gripper": {
      "category": "양손 협조 그리퍼 + 손바닥 카메라",
      "detail": "다종 컨베이어 인터페이스에서 Tote 위치/자세 인식이 필요해 손바닥 카메라로 비전 보강. 양손 10kg+ Tote 그립과 컨베이어 이재 Skill 지원.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "tote-logistics",
    "lv": 3,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "계단·경사 등반 중 양손으로 16kg Tote를 안정 파지. 동적 균형 보정을 위한 그립 force 유지와 낙하 방지 lock 기구가 핵심(ISO 13482 안전 인증 대응).",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "tote-logistics",
    "lv": 4,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "깊이 600mm 협소 랙 진입을 위한 슬림형·비대칭 reach 전용 그리퍼. 협소 공간 SLAM과 결합한 단일/편측 Tote 인출 메커니즘 필요(시장 small, 커스텀 설계).",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "kitting-logistics",
    "lv": 1,
    "gripper": {
      "category": "평행 그리퍼",
      "detail": "단일 SKU 정형 부품을 1mm 정밀도로 픽-배치하는 표준 케이스. 시간당 200~300 pick 처리량 확보를 위한 경량·고속 평행 그리퍼(페이로드 ~3kg)면 충분.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "kitting-logistics",
    "lv": 2,
    "gripper": {
      "category": "Multi-그리퍼 (교체식)",
      "detail": "수십~수백 종 다 SKU(박스·파우치·소형 부품 혼재)를 처리해야 하므로 평행+흡착 툴 체인저 구성이 적합. Visual SKU 분류 위해 손바닥 카메라 옵션 권장.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "kitting-logistics",
    "lv": 3,
    "gripper": {
      "category": "Multi-그리퍼 (교체식)",
      "detail": "다 창고·다 라인 동선상에서 다양한 SKU 형상을 1시간+ 연속 처리. 평행+흡착 듀얼 툴체인저로 SKU별 적응, 내구성·MTBF가 핵심 스펙.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "kitting-logistics",
    "lv": 4,
    "gripper": {
      "category": "Multi-그리퍼 (교체식)",
      "detail": "실시간 BOM 재계획에 따라 변경되는 SKU 조합에 즉시 대응해야 하므로 Lv2/3과 동일한 다목적 교체식 그리퍼 구성 유지. 그리퍼 자체보다 SW(재계획) 측 gap이 본질.",
      "confidence": "low"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "connector-battery",
    "lv": 1,
    "gripper": {
      "category": "평행 + 손바닥 카메라",
      "detail": "BMS 커넥터 0.5mm 정밀 정렬 및 삽입 확인을 위해 손바닥 카메라 비전 보강과 F/T 손목 피드백이 필요. 토크 제어 가능한 평행 그리퍼 + in-hand camera 구성, 페이로드 1~2kg급.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "connector-battery",
    "lv": 2,
    "gripper": {
      "category": "Multi-그리퍼 (교체식)",
      "detail": "수~십 종의 모듈 BMS 커넥터(형상·각도 다양) 대응을 위해 자동 툴 체인저 기반 다종 그리퍼 또는 손바닥 카메라 + F/T 통합형 평행 그리퍼 라이브러리. 0.5mm 정밀도 + 토크 제어 필수.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "connector-battery",
    "lv": 3,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "Pack 단 고전압(400V+) 비정형 위치 체결을 양손 협조로 수행. 절연 코팅·IECEx 인증 손목/그리퍼 + F/T 피드백 필수, 양손 균형 제어 및 굽힘 자세 안정성 요구.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "connector-battery",
    "lv": 4,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "0.1mm sub-mm 광학 정렬은 휴머노이드 표준 그리퍼 한계 초과. 전용 정밀 정렬 스테이지·광학 프로브 결합 커스텀 엔드이펙터 또는 산업R 전용 자동화 영역.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "box-closing-logistics",
    "lv": 1,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "DC 표준 박스(L/M/S) 접기·테이핑은 양손 협조로 박스 플랩을 잡고 테이프 디스펜서를 운용해야 하며, 정형 SKU 배치는 평행 그리퍼 수준으로 충분. 페이로드 5~10kg, 시간당 100~150박스 처리량 요구.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "box-closing-logistics",
    "lv": 2,
    "gripper": {
      "category": "양손 협조 그리퍼 + 흡착·진공 그리퍼",
      "detail": "다 사이즈 박스 접기·테이핑은 양손 협조 필수, 보호재(에어백·완충재) 채우기는 가벼운 시트형 보호재를 다루기 위해 흡착·진공 옵션 또는 Soft 보조 필요. 다 사이즈 적응을 위한 비전 인식 결합.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "box-closing-logistics",
    "lv": 3,
    "gripper": {
      "category": "Soft 그리퍼",
      "detail": "부정형 박스 즉석 접기와 의류 등 비정형 SKU 패킹은 변형 가능 형상을 손상 없이 다뤄야 하므로 Soft 그리퍼(다관절 핑거) + 양손 협조 필요. 부정형 형상 인식을 위한 손바닥 카메라 권장.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "box-closing-logistics",
    "lv": 4,
    "gripper": {
      "category": "F/T 정밀 그리퍼",
      "detail": "맞춤 리본 묶기·포장지 접기는 얇은 종이/리본의 정밀 force feedback 제어가 핵심이며 양손 협조와 고DoF 손가락이 요구됨. 양산 사례 부재로 커스텀 영역에 가까움.",
      "confidence": "low"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "welding-shipbuilding",
    "lv": 1,
    "gripper": {
      "category": "용접 토치·도장 노즐",
      "detail": "평면 용접 토치 운용 전용. 산업용 로봇 영역으로 휴머노이드 진입 비효율이나, 그리퍼 관점에서는 표준 MIG/TIG 용접 토치 엔드이펙터(토크 제어 포함) 결합이 표준.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "welding-shipbuilding",
    "lv": 2,
    "gripper": {
      "category": "용접 토치·도장 노즐",
      "detail": "곡면 외판 추종 용접용 토치 엔드이펙터. 1mm path tracking 정밀도, KS/AWS 용접 인증, 스파크·열 대응 IP 등급 향상 필요. 손목 force/torque 센서로 곡면 추종 보강.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "welding-shipbuilding",
    "lv": 3,
    "gripper": {
      "category": "용접 토치·도장 노즐",
      "detail": "협소 블록(60cm 이하) 내부 진입용 컴팩트 용접 토치. IECEx 방폭 인증 필수, 비정형 자세에서도 추종 정밀도 유지, 좁은 공간 진입을 위한 슬림형 토치 헤드 커스터마이징 필요.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "welding-shipbuilding",
    "lv": 4,
    "gripper": {
      "category": "용접 토치·도장 노즐",
      "detail": "선체 도장용 스프레이 노즐 엔드이펙터. IECEx 방폭 + IP65(페인트 분진) 인증, 도장 면적 인식과 연동된 분사 압력·패턴 제어, 비정형 자세 도장 지원 필요.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "binpicking-logistics",
    "lv": 1,
    "gripper": {
      "category": "평행 그리퍼",
      "detail": "정형 Bin (표준 LxWxH) 픽업으로 1mm 정밀도 평행 그리퍼면 충분. 시간당 200+ pick 처리량을 위해 페이로드 5kg급 고속 평행 그리퍼 권장.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "binpicking-logistics",
    "lv": 2,
    "gripper": {
      "category": "평행 + 손바닥 카메라",
      "detail": "다종 SKU 인식·픽을 위해 Visual SKU 분류(99%+ 정확도) 보강이 필수이므로 평행 그리퍼에 손바닥 카메라(in-hand vision) 결합. 그립 직전 6D pose 재확인으로 오픽률 저감.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "binpicking-logistics",
    "lv": 3,
    "gripper": {
      "category": "Soft 그리퍼",
      "detail": "비정형 SKU(의류·잡화) 손상 방지와 변형 형상 대응을 위한 Soft 그리퍼 필수. 임계값에 명시되어 있으며, 다양한 SKU 혼합 라인이면 Multi-그리퍼(교체식) + Soft 모듈 조합도 고려.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "binpicking-logistics",
    "lv": 4,
    "gripper": {
      "category": "흡착·진공 그리퍼",
      "detail": "랙 상단(2m+) 도달 시 팔 신장 한계로 가벼운 평면·박스형 SKU를 위한 진공 그리퍼가 유리(접근 각도 자유도 ↑, 그립 정밀도 요구 ↓). 반사 surface 6D pose 대응 비전은 별도 필요. 양산 사례 부재로 도메인 검토 필요.",
      "confidence": "low"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "screw-electronics",
    "lv": 1,
    "gripper": {
      "category": "토크 드라이버·임팩트",
      "detail": "가전 정형 나사 체결용 토크 드라이버 엔드이펙터, ±0.5Nm 토크 정밀도 제어 필수. 표준 도구 인터페이스로 결합.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "screw-electronics",
    "lv": 2,
    "gripper": {
      "category": "토크 드라이버·임팩트",
      "detail": "Self-tapping nut 운용 가능한 토크 드라이버, 다 위치(수~십 위치) 체결을 3분 line cycle 내 처리. nut feeder 통합 또는 자동 비트 교체 옵션 고려.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "screw-electronics",
    "lv": 3,
    "gripper": {
      "category": "토크 드라이버·임팩트 + 협소 손목 7+ DoF",
      "detail": "300mm 이하 협소 공간 진입을 위한 슬림형 토크 드라이버 + 7축 이상 손목 자유도 결합. 협소부 자세 제어가 핵심.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "screw-electronics",
    "lv": 4,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "PCB 등 제품 내부 0.5mm 정밀 체결용 미니어처 토크 드라이버 + 손바닥 카메라 비전 정합. 현재 양산 사례 부재로 전용 자동화 영역.",
      "confidence": "low"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "connector-electronics",
    "lv": 1,
    "gripper": {
      "category": "평행 + 손바닥 카메라",
      "detail": "USB/HDMI 등 표준 커넥터 1mm 정밀 삽입 + 토크 제어. 6D pose 인식과 삽입 시 시각 보강을 위해 손바닥 카메라 권장, F/T 센서 통합 필요.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "connector-electronics",
    "lv": 2,
    "gripper": {
      "category": "Multi-그리퍼 (교체식) + 손바닥 카메라",
      "detail": "Foxconn 3C 라인의 다종 하네스/커넥터 처리 위해 자동 툴 체인저 기반 교체식 그리퍼 + 다종 pose 인식용 손바닥 카메라. 시간당 처리량 확보를 위한 빠른 교체 메커니즘 필수.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "connector-electronics",
    "lv": 3,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "FPC 전용 그리퍼 (sub-mm 0.5mm 정합, FPC 손상 방지 force 제어 <1N급). 손바닥 카메라 + F/T 센서 통합한 LGE PCB 라인 전용 커스텀 엔드이펙터 필요.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "connector-electronics",
    "lv": 4,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "제품 내부 협소 공간 진입을 위한 슬림형 롱리치 프로브형 엔드이펙터 필요. 휴머노이드 일반 그리퍼로는 cover 불가, 전용 자동화 영역으로 도메인 특화 설계 요구.",
      "confidence": "low"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "cable-battery",
    "lv": 1,
    "gripper": {
      "category": "F/T 정밀 그리퍼",
      "detail": "BMS 단거리 정형 케이블 라우팅·결속 작업으로 케이블 장력 제어를 위한 force feedback이 필요. 1~2축 F/T 센싱과 0.5~1mm 정밀도 평행 핑거 조합 (페이로드 ~1kg).",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "cable-battery",
    "lv": 2,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "CATL 모듈 와이어 하네스 다발(5~10 결속점) 동시 라우팅으로 한 손 고정 + 한 손 결속의 양손 균형 제어가 필수. 양손 모두 F/T 센싱 통합 평행 핑거 + 케이블 다발 인식용 손바닥/손목 카메라 권장.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "cable-battery",
    "lv": 3,
    "gripper": {
      "category": "F/T 정밀 그리퍼",
      "detail": "Xiaomo flexible wiring의 비정형 라우팅에서 dynamic force(장력 적응) 제어가 핵심 요구사항. 6축 F/T 센서 기반 임피던스 제어와 굽힘 자세에서도 안정적 그립 유지 필요 (force 분해능 ~0.1N).",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "cable-battery",
    "lv": 4,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "대형 Pack 내부 협소 진입 라우팅으로 일반 그리퍼 형상 진입 불가. 슬림형 케이블 클램프·삽입 프로브 형태의 도메인 전용 엔드이펙터 필요하나 시장이 작아 양산 사례 부재.",
      "confidence": "low"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "cable-shipbuilding",
    "lv": 1,
    "gripper": {
      "category": "F/T 정밀 그리퍼",
      "detail": "평면 케이블 부설·결속은 케이블 텐션 제어와 경로 추종이 핵심이므로 force/torque 피드백 기반 그리퍼가 적합. 페이로드 5kg 내외, 결속(타이) 작업을 위한 양손 협조 옵션 가능.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "cable-shipbuilding",
    "lv": 2,
    "gripper": {
      "category": "양손 협조 그리퍼 + F/T 정밀",
      "detail": "선체 곡면 위 다발 케이블(수십 kg) 라우팅·결속은 한 손 지지 + 한 손 결속의 양손 협조 필수. F/T 센싱으로 다발 텐션·곡면 추종 제어, 경사 자세에서도 균형 유지 필요.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "cable-shipbuilding",
    "lv": 3,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "협소 블록 내 IECEx(방폭) 인증 필수 환경에서 비정형 케이블 부설을 위한 방폭형 슬림 케이블 클램프 그리퍼 필요. F/T 피드백 + 좁은 폼팩터 + 본질안전 설계가 핵심.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "cable-shipbuilding",
    "lv": 4,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "협소 + 실시간 동선 변경에 대응하는 컴팩트 적응형 그리퍼 필요. 손바닥 카메라·근접 센서 통합으로 동적 환경 인식, 다만 양산 사례 부재로 R&D 단계.",
      "confidence": "low"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "tote-automotive-bcg",
    "lv": 1,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "라인 사이드 자재 Tote(약 10~15kg, 600x400mm급 표준 물류 박스)를 양손으로 들어 공급하는 작업으로, 양손 균형 제어와 Tote 손잡이 파지가 핵심. 정밀도보다는 페이로드와 안정성이 중요.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "tote-automotive-bcg",
    "lv": 2,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "다 라인 순회로 동선은 길어지나 핸들링 대상은 동일한 표준 Tote. 1시간+ 연속 작동을 위한 양손 그리퍼 내구성과 손잡이 재파지 신뢰성이 요구됨.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "tote-automotive-bcg",
    "lv": 3,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "비정형 동선·경사면에서도 Tote 양손 운반은 동일하므로 그리퍼 자체는 양손 협조형이 적합. 단 경사면 자세 변화에 대응한 손목 컴플라이언스(±수도 기울임 보정) 추가 필요.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "tote-automotive-bcg",
    "lv": 4,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "협소 라인 진입이 핵심 제약이며 핸들링 대상(Tote)은 동일. 그리퍼 자체보다는 팔·몸통 폭 축소가 관건이라 그리퍼는 컴팩트 양손 협조형이면 충분.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "palletize-logistics",
    "lv": 1,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "정형 박스(≤15kg)를 양손으로 들어 팔레타이징; 양손 페이로드 합산 15kg, 박스 측면 마찰 그립과 양손 균형 제어가 핵심.",
      "confidence": "high"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "palletize-logistics",
    "lv": 2,
    "gripper": {
      "category": "양손 협조 그리퍼 + 손바닥 카메라",
      "detail": "다 SKU 박스 식별·적재 위해 양손 15kg 그립 + 손바닥 비전으로 SKU 라벨/크기 인식 및 적재 패턴 자율 계획 보조.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "palletize-logistics",
    "lv": 3,
    "gripper": {
      "category": "양손 협조 그리퍼 + 손바닥 카메라",
      "detail": "부정형 박스 형상 인식과 랙 진입 시 좁은 공간 그립 정렬을 위해 양손 협조 + 손바닥 카메라 필수; 가변 그립폭 대응.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "palletize-logistics",
    "lv": 4,
    "gripper": {
      "category": "양손 협조 그리퍼",
      "detail": "2m+ 고층·협소 적재; 양손으로 박스를 머리 위로 올려 적재하므로 양손 균형·자세 안정화 제어 핵심, 컴팩트 그립 폼팩터 필요.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "inspection-shipbuilding",
    "lv": 1,
    "gripper": {
      "category": "평행 + 손바닥 카메라",
      "detail": "의장 외관·치수 점검을 위한 RGB 카메라 보강 그리퍼. 측정 프로브·게이지 그립용 1mm 정밀도, IP65+ 환경 대응 필요.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "inspection-shipbuilding",
    "lv": 2,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "블록 순회 점검용 점검 프로브·휴대형 검사 장비 운용 엔드이펙터. IP65+ 환경 인증과 경사 보행 중 안정 그립 필요, 페이로드 2~5kg 수준.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "inspection-shipbuilding",
    "lv": 3,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "협소 공간 SLAM 센서·점검 프로브 통합 엔드이펙터. IECEx 방폭 인증 필수, 비정형 자세에서도 작동하는 컴팩트·경량 설계 필요.",
      "confidence": "medium"
    }
  },
  {
    "generatedAt": "2026-05-06T12:39:48.167Z",
    "model": "claude-opus-4-7",
    "cellId": "inspection-shipbuilding",
    "lv": 4,
    "gripper": {
      "category": "커스텀 (산업 전용)",
      "detail": "NDE 전용 도구(UT 프로브, 페이즈드 어레이, MT/PT 장비) 운용 도메인 특화 엔드이펙터. 정밀 데이터 수집을 위한 F/T 피드백 및 표면 컨택 제어 필요.",
      "confidence": "low"
    }
  }
] as const;

export const GRIPPER_INDEX: Record<string, RequiredGripper> = Object.fromEntries(
  GRIPPER_DATA.map((r) => [`${r.cellId}-Lv${r.lv}`, r.gripper]),
);

export function lookupRequiredGripper(
  cellId: string,
  lv: number,
): RequiredGripper | undefined {
  return GRIPPER_INDEX[`${cellId}-Lv${lv}`];
}

export const GRIPPER_GENERATED_META: { generatedAt: string | null; model: string | null; count: number } = {
  generatedAt: "2026-05-06T12:39:48.167Z",
  model: "claude-opus-4-7",
  count: 52,
};
