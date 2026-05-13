// LGE 세탁기 라인 공정 데이터 — 실제 라인 공정 기준 (25 공정).
// 각 공정은 (1) 동작 분류 (단순 이재 / 정밀 조작 / 도구 운용) (2) 매트릭스 셀 매핑
// 으로 분류돼 CLOiD W/B 커버리지와 연결됨.

import type { TaskCategory } from './data-v13';

export type EeNeeded = 'gripper' | 'hand' | 'tool';

export interface LgeProcess {
  id: number;
  name: string;        // 공정명 (예: "Bush 조립, Base 체결")
  work: string;        // 작업내용 1~2문장
  category: TaskCategory; // 단순 이재 / 정밀 조작 / 도구 운용
  ee: EeNeeded;        // 필요 EE 종류
  // 매트릭스 셀로 mapping (cellNum) — 어느 task 카테고리에 속하는지
  // ⑤ 나사 체결 / ⑥ 커넥터 / ⑦ 케이블 / ⑨ Tote·박스 적재 / ⑪ 용접·도장
  cellNum: '⑤' | '⑥' | '⑦' | '⑨' | '⑪' | null;
  notes?: string;
}

export const LGE_WASHER_PROCESSES: LgeProcess[] = [
  {
    id: 1,
    name: 'Bush 조립, Base 체결',
    work: 'Bush를 방향성 확인하여 Cabinet 후면 하부 Hole에 눌러서 고정, Base 미체결부 Screw 체결',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
    notes: 'Screw 체결 (드라이버 도구 운용)',
  },
  {
    id: 2,
    name: '전면 Earth 체결',
    work: 'Screw를 Earth Wire Ring에 끼운 후 Lower Frame의 Earth 각인부에 체결. Pump Drain의 Inlet Hose 조립부와 환형 유로 Hose 조립부에 비눗물 도포. Harness를 정리하여 Base Rib에 고정',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 3,
    name: '하부 Harness 결선 정리',
    work: 'Tie를 Tub 하부의 Hole에 끼우고 Harness의 백색 Tape 중앙부를 누름. Housing Hook이 아래로 향하게 Base Rib에 올린 후 Tie를 Base Guide 아래로 넣고 Housing과 Sensor Harness를 함께 묶어 고정',
    category: '정밀 조작', ee: 'hand', cellNum: '⑦',
    notes: 'Harness 다발 정리 + Tie 묶기 (양손 협조)',
  },
  {
    id: 4,
    name: 'Gasket Clamp 조립',
    work: 'Clamp Ass\'y 걸이부 Hole에 Jig를 끼워 Spring을 벌려서 Gasket 홈에 걸어 안착시킨 후 Locking Part가 하부로 향하도록 하고 Jig를 분리 조립',
    category: '정밀 조작', ee: 'hand', cellNum: null,
    notes: 'Jig 활용 + Clamp 안착 (양손 정밀)',
  },
  {
    id: 5,
    name: '후면 Earth 체결',
    work: 'Screw를 후면 하부 Hole에 Earth Wire Ring과 함께 체결. Holder를 Cabinet 후면 하부 정면, 좌측 2개소 조립',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 6,
    name: 'Pump Case 조립',
    work: 'Screw를 Cabinet Cover 좌측 하부 Hole에 1점 체결. Pump Case를 Cabinet Cover 좌측 하부에 조립. Hose Connector를 Case Guide Rib 중앙에 밀어넣어 고정',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 7,
    name: 'Cap Cover 조립',
    work: 'Screw를 Cabinet Cover 하부 Cap고정부에 1점 체결. Hose Connector를 Case Guide Rib 중앙에 밀어넣어 고정. Cap Cover의 Pusher를 Case Hole에 끼워 조립 후 닫음',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 8,
    name: 'Bush 조립, Base 체결 (2)',
    work: 'Bush를 방향성 확인하여 Cabinet 후면 하부 Hole에 눌러서 고정. Base 미체결부 Screw 체결',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 9,
    name: '전면 Hinge 가조립',
    work: 'Hinge 끝단에 Grease를 도포한 후 Base 좌, 우 Rib에 끼워 우 고정',
    category: '정밀 조작', ee: 'hand', cellNum: null,
    notes: 'Grease 도포 + 끼움 고정',
  },
  {
    id: 10,
    name: 'Pump Housing 결선',
    work: 'Door S/W Harness의 Tie를 Lower Frame Hole에 밀어 넣음. Multi Harness Housing을 Pump Housing에 딸각 소리가 날때까지 밀어서 결선 조립',
    category: '정밀 조작', ee: 'hand', cellNum: '⑥',
    notes: '커넥터 삽입 (딸깍 결합 확인)',
  },
  {
    id: 11,
    name: 'Lower Frame Earth 체결',
    work: 'Customized Screw를 Earth WireRing에 끼운 후 Lower Frame의 Earth 각인부에 체결. Drain Pump의 Inlet Hose 조립부에 물비누 도포',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 12,
    name: 'Pump Bellows 고정',
    work: 'Tub Bellows Clamp를 Clamp Jig로 벌린 후 Bellows를 Pump에 삽입 후 Clamp로 고정. Drain Hose를 Pump 후면에 조립 후 Clamp로 고정',
    category: '정밀 조작', ee: 'hand', cellNum: null,
    notes: 'Bellows + Clamp 양손 조작',
  },
  {
    id: 13,
    name: '응축수 Hose 조립, 고정',
    work: '응축수 배수 Hose를 Pump에 조립하여 Clamp로 고정',
    category: '정밀 조작', ee: 'hand', cellNum: '⑦',
    notes: 'Hose 라우팅 + Clamp 고정',
  },
  {
    id: 14,
    name: 'Pump Bellows 조립, 고정',
    work: 'Tub Bellows Clamp를 Clamp Jig로 벌린 후 Bellows를 Pump에 삽입 후 Clamp로 고정. Drain Hose를 Base Hook 2점에 고정',
    category: '정밀 조작', ee: 'hand', cellNum: null,
  },
  {
    id: 15,
    name: 'Harness, Hose 고정',
    work: '응축수 Hose Holder, Pump Harness Holder를 Cabinet Cover 안쪽에서 바깥쪽으로 조립',
    category: '정밀 조작', ee: 'hand', cellNum: '⑦',
    notes: 'Holder 끼움 (양손 정렬)',
  },
  {
    id: 16,
    name: 'Comp Housing 결선',
    work: 'Connector Housing 3점 결선 조립. 조립된 Housing을 비닐로 씌운 후 Tie로 묶음',
    category: '정밀 조작', ee: 'hand', cellNum: '⑥',
    notes: '커넥터 3점 + Tie 묶기',
  },
  {
    id: 17,
    name: 'Gasket Clamp 조립 (2)',
    work: 'Clamp Ass\'y 걸이부 Hole에 Jig를 끼워 Spring을 벌려서 Gasket 홈에 걸어 안착시킨 후 Locking Part가 하부로 향하도록 하고 Jig를 분리 조립',
    category: '정밀 조작', ee: 'hand', cellNum: null,
  },
  {
    id: 18,
    name: '후면 Earth 체결 (2)',
    work: 'Screw를 후면 하부 Hole에 Earth Wire Ring과 함께 체결. Holder를 Cabinet 후면 하부 정면, 좌측 2개소 조립',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 19,
    name: 'Pump Case 조립 (2)',
    work: 'Screw를 Cabinet Cover 좌측 하부 Hole에 1점 체결. Pump Case를 Cabinet Cover 좌측 하부에 조립. Case 조립 후 하부 Screw 1점 체결',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 20,
    name: 'Base Lead Wire 정리',
    work: 'Insulator Sheet를 Side Cabinet 하단에 부착. Main Harness Tie Holder를 내부 Base Hole에 끼우고, Main Harness를 Holder에 끼움',
    category: '정밀 조작', ee: 'hand', cellNum: '⑦',
    notes: 'Wire 라우팅 + Holder 끼움',
  },
  {
    id: 21,
    name: 'Motor, Funnel 체결',
    work: 'Motor Bracket에 Screw 2점 체결 고정. Funnel에 Screw 2점 체결 고정',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 22,
    name: 'Nipple 조립',
    work: 'Burner에 장착된 마개를 Pallet에 고정. Pipe 끝부분에 Grease를 도포하고 Nipple을 가조립, Power Cord를 콘센트에 꽂고 선정리',
    category: '정밀 조작', ee: 'hand', cellNum: null,
    notes: 'Grease 도포 + 조립 + 결선',
  },
  {
    id: 23,
    name: 'Gas 커플러 체결',
    work: 'Nipple에 Gas 검사 커플러를 장착, Duct에 Tape 1ea 부착, Valve에 Screw 1점 체결',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
    notes: 'Coupler 체결 + Tape 부착',
  },
  {
    id: 24,
    name: 'Harness 선정리',
    work: 'Tie Holder를 Rear Cover Hole 1개소, Base Hole 2개소에 조립 후 Harness를 Holder에 고정',
    category: '정밀 조작', ee: 'hand', cellNum: '⑦',
  },
  {
    id: 25,
    name: 'Motor Heater 체결',
    work: 'Motor Bracket에 Screw 2점 체결 고정, Heater Bracket에 Screw 2점 체결 고정',
    category: '도구 운용', ee: 'tool', cellNum: '⑤',
  },
  {
    id: 26,
    name: 'Heater 단자 결선',
    work: 'Heater Harness의 Terminal(파,노)을 Heater 단자에 끼워 결선. Base부 사각 Holder 중앙 2개소에 Harness 고정 정리',
    category: '정밀 조작', ee: 'hand', cellNum: '⑥',
    notes: 'Terminal 정밀 삽입',
  },
  {
    id: 27,
    name: 'Cabinet 전면 하부 Tape 부착',
    work: 'Cabinet Cover 하부 전면, 측면부 2개소에 Polyester Tape를 부착',
    category: '도구 운용', ee: 'tool', cellNum: null,
    notes: 'Tape 부착 (도구 마운트 또는 양손 그리퍼)',
  },
];

export function getWasherProcessStats() {
  const total = LGE_WASHER_PROCESSES.length;
  const byCategory = { '단순 이재': 0, '정밀 조작': 0, '도구 운용': 0 } as Record<TaskCategory, number>;
  const byEe = { gripper: 0, hand: 0, tool: 0 } as Record<EeNeeded, number>;
  const byCell: Record<string, number> = {};
  for (const p of LGE_WASHER_PROCESSES) {
    byCategory[p.category]++;
    byEe[p.ee]++;
    if (p.cellNum) byCell[p.cellNum] = (byCell[p.cellNum] || 0) + 1;
  }
  return { total, byCategory, byEe, byCell };
}
