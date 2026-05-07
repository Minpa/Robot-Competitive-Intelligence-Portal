"""
CLOiD W/B Capability Gap Analysis v1.3 - 데이터 모듈
============================================================
변경 이력
- v1.0: 13개 셀 × 4Lv = 52 sub-cells, CLOiD W/B 추정 스펙
- v1.1: EE 9-카테고리 분리, Tier 시스템, 그리퍼 교체식 가정
- v1.2: Gap 정의 명시화 (Cover/Partial/개발필요), 톤 순화, 4종 분류 (A/B/C/D)
- v1.3: 'Gap'->'개발필요' 표기 통일, LG 자체 자산 매핑, 한국 생태계 협업,
        임원용 한국어 병기, 6개 클러스터 LG 관점 보강

신뢰도 등급
[A] 공식 1차 출처  [B] 2개 이상 독립 매체  [C] 단일 출처  [D] 데이터 기반 추정
[E] 미확인/루머   [F] AI 학습 데이터 기반 추론

* 모든 CLOiD 스펙은 [F추정] - ARGOS 휴머노이드 스펙 페이지 입력 후 Phase 4 정밀화
* '개발필요' = X Gap의 한국어 표기 (v1.3 통일)
"""

# ============================================================
# 0. 판정 표기 정의 (v1.2 명시화 -> v1.3 한국어 통일)
# ============================================================
GAP_DEFINITION = {
    'cover':   {'symbol': '✓', 'label': 'Cover',    'kr': '학습 후 가능',
                'time': '3~6개월',   'work': '양산 라인 데이터 학습'},
    'partial': {'symbol': '△', 'label': 'Partial',  'kr': '부분 가능',
                'time': '6~12개월',  'work': '일부 기능 보강 (HW 변경 없음)'},
    'gap':     {'symbol': '✗', 'label': '개발필요', 'kr': '신규 개발',
                'time': '12~24개월+', 'work': 'HW·인증·Skill 신규 개발'},
}

DEV_TYPES = {
    'A': {'desc': 'Form factor 변경 (휠->양족, 베이스폭 축소)', 'time': '24~36개월', 'priority': ''},
    'B': {'desc': 'HW 보강 (도달 높이, 페이로드, 정밀도)',      'time': '12~18개월', 'priority': ''},
    'C': {'desc': '인증 취득 (IECEx, IP65+)',                  'time': '18~24개월', 'priority': '★ 우선 검토'},
    'D': {'desc': '신규 Skill·도구 인터페이스 (NDE, swap)',    'time': '6~12개월',  'priority': ''},
}

# 본 분석은 Capability Gap 차원에 집중 (5개 다른 차원은 후속 분석)
GAP_DIMENSIONS = {
    'covered':     'Capability Gap (할 수 있나?)',
    'not_covered': ['Performance Gap (얼마나 잘하나?)',
                    'Maturity Gap (시제품 vs 양산?)',
                    'Cost Gap (비용 경쟁력?)',
                    'Time-to-Market Gap (양산 시점?)',
                    'Ecosystem Gap (협업·인증·SI 인프라?)'],
}

# ============================================================
# 1. End-effector 9-카테고리 (v1.1 + v1.3 한국어 병기)
# ============================================================
END_EFFECTOR_CATEGORIES = {
    'dex_5f': {'kr': '5지 정밀 손',      'en': '5-finger dexterous',  'dof': '11~22 DoF',
               'examples': 'Tesla Optimus / Figure 03 / UBTech / Agibot / Xiaomi'},
    'dex_4f': {'kr': '4지 손',           'en': '4-finger',            'dof': '11 DoF',
               'examples': 'Apptronik Apollo / Allegro Hand / Mercedes Apollo'},
    'dex_3f': {'kr': '3지 손',           'en': '3-finger',            'dof': '6~7 DoF',
               'examples': 'Boston Dynamics Atlas / Unitree G1 / Schunk SDH'},
    'jaw_2f': {'kr': '2지 평행 그리퍼',  'en': '2-finger parallel',   'dof': '1~2 DoF',
               'examples': '산업R 50년 검증 / 일부 휴머노이드'},
    'vac':    {'kr': '진공 흡착 그리퍼', 'en': 'Vacuum suction',      'dof': 'N/A',
               'examples': '박스 핸들링 / DC packing 표준'},
    'hook':   {'kr': '후크형 그리퍼',    'en': 'Hook end-effector',   'dof': '1 DoF',
               'examples': 'Tote 전용, Digit (Agility) GXO/Spanx 상용 RaaS'},
    'tool':   {'kr': '도구 직접 운용',   'en': 'Tool end-of-arm',     'dof': 'N/A',
               'examples': '토치·스프레이·드라이버·게이지 (HD현대 + Persona AI)'},
    'soft':   {'kr': '유연 그리퍼',      'en': 'Soft gripper',        'dof': 'N/A',
               'examples': '비정형 SKU - Soft Robotics / 의류·잡화'},
    'swap':   {'kr': '자동 교체 시스템', 'en': 'Tool changer',        'dof': 'N/A',
               'examples': 'AEON Hexagon / BMW Leipzig 파일럿 2026 여름'},
}

# 약어 -> 임원용 한국어 매핑 (v1.3)
TERM_MAPPING = {
    'EE':       '그리퍼·도구 (End-Effector)',
    'DoF':      '자유도 (Degree of Freedom)',
    'tactile':  '촉각 센서',
    'RaaS':     '로봇 구독 서비스 (Robot-as-a-Service)',
    'PFL':      '충돌 감지 안전 모드 (Power & Force Limiting)',
    'SLAM':     '자율 주행·위치 인식',
    'VLA':      '시각-언어-행동 AI 모델 (Vision-Language-Action)',
    'F/T':      '힘·토크 센서 (Force/Torque)',
    'NDE':      '비파괴 검사 (Non-Destructive Evaluation)',
    'IECEx':    '국제 방폭 인증',
    'FPC':      '연성 회로 케이블 (Flexible PCB)',
    'ICP':      '이상적 고객 유형 (Ideal Customer Profile)',
    'GTM':      '시장 진입 전략 (Go-to-Market)',
    'PoC':      '개념 검증 (Proof of Concept)',
    'BOM':      '부품 명세서 (Bill of Materials)',
    'Lv1~4':    '난이도 등급 (단순 -> Frontier)',
}

# ============================================================
# 2. CLOiD W / B 추정 스펙 (v1.1 ee_options 통합)
# ============================================================
CLOID_W_SPEC = {
    'name': 'CLOiD W',
    'form_factor': '휠형 양팔 (Mobile Manipulator)',
    'note': '아래 모든 수치 [F추정] - ARGOS 입력 후 Phase 4 정밀화',
    'ee_options': {
        'dex_5f': True,  'dex_4f': True,    'dex_3f': True,
        'jaw_2f': True,  'vac': True,
        'hook':   False, 'tool': 'partial', 'soft': False,
        'swap':   True,
    },
    'finger_dof_5f': 16,
    'palm_camera': False,
    'tactile_sensor': False,
    'gripper_change_time_sec': 30,
    'locomotion_type': '휠 (4륜 또는 차륜)',
    'max_speed_ms': 1.5,
    'stair_climbing': False,
    'slope_max_deg': 10,
    'base_width_mm': 600,
    'battery_runtime_hr': 5.0,
    'auto_docking': True,
    'payload_single_kg': 5.0,
    'payload_dual_kg': 10.0,
    'arm_reach_mm': 750,
    'reach_height_max_mm': 1900,
    'reach_height_low_mm': 200,
    'grip_force_n': 50.0,
    'grip_precision_mm': 1.0,
    'force_torque_control': True,
    'bimanual_coordination': True,
    'rgb_camera_count': 4,
    'depth_sensor': 'Stereo + ToF',
    'lidar': True,
    'pose_estimation_mm': 3.0,
    'slam_capable': True,
    'vla_onboard': 'hybrid',
    'multistep_autonomous': True,
    'iso_10218': '진행 중',
    'human_collab_mode': 'PFL',
    'cleanroom_compatible': False,
}

CLOID_B_SPEC = {
    'name': 'CLOiD B',
    'form_factor': '양족 양팔 (Biped Humanoid)',
    'note': '아래 모든 수치 [F추정] - CLOiD W와 동일 손 + 보행 능력 추가',
    'ee_options': dict(CLOID_W_SPEC['ee_options']),
    'finger_dof_5f': 16,
    'palm_camera': False,
    'tactile_sensor': False,
    'gripper_change_time_sec': 30,
    'locomotion_type': '양족 보행',
    'max_speed_ms': 1.0,
    'stair_climbing': True,
    'stair_height_max_cm': 17,
    'slope_max_deg': 15,
    'battery_runtime_hr': 4.0,
    'payload_single_kg': 5.0,
    'payload_dual_kg': 10.0,
    'arm_reach_mm': 750,
    'reach_height_max_mm': 2000,
    'reach_height_low_mm': 100,
    'grip_force_n': 50.0,
    'grip_precision_mm': 1.0,
    'force_torque_control': True,
    'bimanual_coordination': True,
    'rgb_camera_count': 4,
    'depth_sensor': 'Stereo + ToF',
    'lidar': True,
    'pose_estimation_mm': 3.0,
    'slam_capable': True,
    'vla_onboard': 'hybrid',
    'multistep_autonomous': True,
    'iso_10218': '진행 중',
    'human_collab_mode': 'PFL',
    'cleanroom_compatible': False,
}

# ============================================================
# 3. LG 자체 자산 매핑 (v1.3 신규) - 모두 [F추정]
# ============================================================
LG_ASSETS = {
    'LGE_Axium': {
        'category': '액추에이터',
        'covers': ['dex_5f', 'dex_4f', 'dex_3f'],
        'rationale': '자체 액추에이터 -> Tesla/Figure/UBTech 5지 라이선스 회피',
        'reliability': '[F추정]',
        'note': 'ARGOS 입력 후 정확한 사양 확인 필요',
    },
    'LG_Innotek_Camera': {
        'category': '카메라/비전',
        'covers': ['palm_camera', 'tactile_vision'],
        'rationale': '손바닥/손끝 ToF·tactile 비전 자체 공급',
        'reliability': '[F추정]',
    },
    'LG_Chem_Material': {
        'category': '소재',
        'covers': ['soft', 'tactile_pad'],
        'rationale': 'Soft 그리퍼 실리콘·고무 / tactile 패드 자체 공급',
        'reliability': '[F추정]',
    },
    'LG_Energy_Solution': {
        'category': '배터리',
        'covers': ['battery_runtime'],
        'rationale': '24/7 운영 배터리 (4h -> 8h 향상 가능)',
        'reliability': '[F추정]',
    },
    'Bear_Robotics': {
        'category': 'CLOiD W base + SLAM',
        'covers': ['locomotion_wheel', 'slam', 'service_robot_skill'],
        'rationale': '2024 LGE 인수 - CLOiD W 기반 + 서비스 로봇 노하우',
        'reliability': '[A]',
    },
    'LG_CNS_AI': {
        'category': 'AI 인프라',
        'covers': ['vla_training', 'cloud_compute'],
        'rationale': 'VLA 모델 학습·배포 인프라',
        'reliability': '[F추정]',
    },
    'LG_Group_Lines': {
        'category': '양산 라인 데이터',
        'covers': ['LGE_가전', 'LG디스플레이', 'LG에너지솔루션', 'LG화학'],
        'rationale': '자사 라인에서 양산 데이터 직접 수집·VLA 학습',
        'reliability': '[F추정]',
    },
}

# ============================================================
# 4. 한국 생태계 협업 후보 (v1.3 신규)
# ============================================================
KOREA_PARTNERS = {
    'HD현대': {
        'category': '조선 통합',
        'covers_cells': [('11', '조선'), ('12', '조선'), ('07', '조선')],
        'covers_ee': ['tool'],
        'status': '시제품 (Persona AI 협업), 2027 commercial 목표',
        'rationale': '조선 환경 + NDE + IECEx 인증 통합',
        'reliability': '[C]',
    },
    'Robotis': {
        'category': '서보 모터',
        'covers_ee': ['dex_3f', 'jaw_2f'],
        'status': '양산 (Dynamixel 시리즈)',
        'rationale': '한국 산업R 표준 모터 - 라이선스 부담 없음',
        'reliability': '[A]',
    },
    'KAIST': {
        'category': '연구 협업',
        'covers': ['tactile_sensor', 'VLA_research'],
        'status': '연구 협업',
        'rationale': '촉각 센서 / VLA 학습 알고리즘 공동 연구',
        'reliability': '[B]',
    },
    'POSTECH': {
        'category': '연구 협업',
        'covers': ['tactile_sensor', 'manipulation_research'],
        'status': '연구 협업',
        'rationale': '정밀 매니퓰레이션 알고리즘 공동 연구',
        'reliability': '[B]',
    },
    '한국_산업R_부품': {
        'category': '기성 부품',
        'covers_ee': ['jaw_2f', 'vac', 'tool'],
        'status': '기성품 활용',
        'rationale': '라이선스 부담 없는 산업R toolset 직접 활용',
        'reliability': '[A]',
    },
}

# ============================================================
# 5. 작업 카테고리 / 셀 순서
# ============================================================
TASK_NAMES = {
    '①': 'Bin Picking',     '②': 'Kitting',        '⑤': '나사 체결',
    '⑥': '커넥터 체결',     '⑦': '케이블 라우팅',  '⑧': 'Tote 이송',
    '⑨': 'Tote·박스 적재', '⑩': '박스 마감',      '⑪': '용접·도장',
    '⑫': '점검·계측',
}

CELL_ORDER = [
    ('⑧', '물류',      9.2), ('②', '물류',      8.3), ('⑥', '배터리',   8.3),
    ('⑩', '물류',      8.3), ('⑪', '조선',      8.3), ('①', '물류',      7.5),
    ('⑤', '전자가전',  7.5), ('⑥', '전자가전',  7.5), ('⑦', '배터리',   7.5),
    ('⑦', '조선',      7.5), ('⑧', '자동차BCG', 7.5), ('⑨', '물류',      7.5),
    ('⑫', '조선',      7.5),
]

# ============================================================
# 6. 13개 셀 × 4Lv = 52 sub-cells (v1.0 그대로 + EE 요구 + LG 매핑)
# ============================================================
CELLS = {}

# ---------- 1위: ⑧ Tote 이송 × 물류 (9.2점) ----------
CELLS[('⑧', '물류', 1)] = {
    'task_short': 'AMR Tote 정형 이송 (DC 평면)',
    'actions': ['LOC-01 평지 정속 이동', 'LOC-03 정적 장애물 회피',
                'MAN-01 양손 Tote 들기 (<=10kg)', 'PER-01 마커 인식',
                'NAV-01 SLAM 기반 자율 주행'],
    'requirements': '평지 1.0+ m/s, 페이로드 양손 10kg, SLAM, 24/7 운영',
    'cloid_w': ('✓', '평지 이동·페이로드·SLAM 모두 cover. 베어로보틱스 결합 시 단기 진입 가능 (학습 후)'),
    'cloid_b': ('△', '보행 속도 1.0 m/s 한계, 24/7 배터리 부족 가능. 평지에서 휠 대비 비효율'),
    'dev_priority': 'Low',
    'dev_items': ['배터리 24/7 운영 (스왑 또는 빠른 충전 도킹)', 'DC 통로 폭 적응'],
    'benchmark': 'Digit @ GXO/Spanx (상용 RaaS 다년 운영, 16kg payload, 6 ft reach, 4시간 배터리)',
    'ee_req': {'tier1': ['hook', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': ['vac']},
    'lg_assets': ['Bear_Robotics', 'LG_Energy_Solution'],
}
CELLS[('⑧', '물류', 2)] = {
    'task_short': 'DC 다 라인 Tote 순회 (Digit @ GXO 누적 10만 Tote 처리)',
    'actions': ['LOC-01 평지 정속', 'LOC-04 동적 장애물 회피', 'MAN-01 양손 Tote',
                'MAN-04 컨베이어 to AMR 이재', 'PER-02 다종 SKU 인식', 'NAV-02 다 위치 순회'],
    'requirements': '동적 환경 (사람·카트), 다종 컨베이어 인터페이스, 다 위치 순회 자율 계획',
    'cloid_w': ('✓', '동적 회피·SLAM 가능. 컨베이어 인터페이스 Skill 학습 필요'),
    'cloid_b': ('△', '보행 속도 한계 + 배터리 한계. 다 라인 동시 커버 시 휠 대비 효율 떨어짐'),
    'dev_priority': 'Mid',
    'dev_items': ['컨베이어 to AMR 이재 Skill', '다 라인 작업 큐 자율 계획', '24/7 배터리 운영'],
    'benchmark': 'Digit (GXO Spanx 100,000+ Tote 처리, Flowery Branch 상용 RaaS)',
    'ee_req': {'tier1': ['hook', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': ['vac']},
    'lg_assets': ['Bear_Robotics', 'LG_CNS_AI'],
}
CELLS[('⑧', '물류', 3)] = {
    'task_short': '계단·다층 Tote 이송 (Digit 6 ft reach)',
    'actions': ['LOC-07 계단 등반 (단높이 17cm)', 'LOC-09 경사 보행 15도', 'MAN-01 양손 Tote',
                'MAN-05 도달 높이 1830mm (6 ft)', 'BAL-01 보행 중 양손 협조 균형'],
    'requirements': '계단 등반 + 페이로드 운반, 6 ft (1830mm) 도달, 양족 균형 제어',
    'cloid_w': ('✗', '계단 불가. 휠은 평면 한정'),
    'cloid_b': ('△', '계단 가능 [F추정]. 그러나 페이로드 들고 계단 등반 검증 필요. 6 ft reach 미달 가능'),
    'dev_priority': 'High',
    'dev_items': ['Tote 들고 계단 등반 안정성 검증', '도달 높이 1900mm -> 1830mm reach 확보',
                  '추락 안전 인증 (ISO 13482)', '양손 페이로드 균형 제어'],
    'benchmark': 'Digit (6 ft reach, 16kg payload, 양족 계단 demo 검증; Spanx/GXO 단층 DC RaaS)',
    'ee_req': {'tier1': ['hook'], 'tier2': ['jaw_2f', 'dex_5f', 'dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium'],
}
CELLS[('⑧', '물류', 4)] = {
    'task_short': '협소 랙 Tote 진입',
    'actions': ['LOC-06 협소 통로 (60cm 이하)', 'MAN-06 협소 공간 매니퓰레이션',
                'PER-03 협소 SLAM', 'BAL-02 비대칭 자세'],
    'requirements': '베이스 폭 55cm 이하, 깊이 600mm 랙 진입, 비대칭 reach',
    'cloid_w': ('✗', '베이스 폭 600mm -> 협소 통로 진입 불가'),
    'cloid_b': ('△', '양족이 좁은 폭 가능하나 비대칭 reach 한계'),
    'dev_priority': 'Low',
    'dev_items': ['(★ 사업 우선순위 낮음 - Lv4는 시장 small)'],
    'benchmark': "Digit 5'9 폼팩터도 한계 - 시장 자체가 small",
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['hook']},
    'lg_assets': [],
}

# ---------- 2위: ② Kitting × 물류 (8.3점) ----------
CELLS[('②', '물류', 1)] = {
    'task_short': 'DC Order Kitting (정형)',
    'actions': ['MAN-02 단일 SKU 픽업', 'MAN-03 정위치 배치',
                'PER-04 BOM 인식', 'COG-01 BOM 매칭'],
    'requirements': 'BOM 단일 모델, 픽 정확도 1mm, 처리량 시간당 200~300 pick',
    'cloid_w': ('✓', '단일 SKU 픽 -> 정위치 배치 cover. 처리량은 검증 필요'),
    'cloid_b': ('✓', '동일 cover 가능. 다만 휠 대비 처리량 약함'),
    'dev_priority': 'Low',
    'dev_items': ['처리량 최적화 (시간당 pick 횟수)'],
    'benchmark': 'GXO × Digit Order Picking (상용 RaaS), Apollo Jabil Pilot',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines'],
}
CELLS[('②', '물류', 2)] = {
    'task_short': 'DC 다 SKU Kitting',
    'actions': ['MAN-02 다 SKU 구분 픽', 'PER-05 Visual SKU 분류',
                'COG-02 다 BOM 동시 처리', 'NAV-02 다 위치 순회'],
    'requirements': '다종 SKU (수십~수백 종) Visual 인식, BOM 다 모델 관리',
    'cloid_w': ('△', 'VLA 모델 다 SKU 인식 가능 [F추정] - 그러나 정확도 검증 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['VLA 모델 SKU 분류 정확도 (>=99%)', 'BOM 자율 관리 시스템 통합'],
    'benchmark': 'Toyota TMMC Digit 7대 commercial (RAV4 plant), Mercedes Apollo',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier2': ['vac', 'jaw_2f'], 'tier3': []},
    'lg_assets': ['LG_CNS_AI', 'LG_Group_Lines'],
}
CELLS[('②', '물류', 3)] = {
    'task_short': '다 SKU·다 창고 동선 Kit',
    'actions': ['NAV-03 다 창고 동선 계획', 'MAN-02 다 SKU 픽',
                'COG-03 동선 최적화 (TSP)', 'LOC-04 동적 환경'],
    'requirements': '다 창고·다 라인 자율 동선 계획, 1시간+ 연속 작업',
    'cloid_w': ('△', '동선 계획·SLAM cover. 그러나 1시간+ 연속 안정성 검증 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['장시간 (1시간+) 연속 안정성', '동선 최적화 알고리즘'],
    'benchmark': 'Digit GXO (다 라인 연속 운영 검증)',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LG_Energy_Solution'],
}
CELLS[('②', '물류', 4)] = {
    'task_short': '실시간 주문 변경 한정',
    'actions': ['COG-04 실시간 BOM 재계획', 'MAN-02 다 SKU 픽'],
    'requirements': '실시간 주문 변경 중 작업 중단 없이 BOM 재계획',
    'cloid_w': ('✗', '실시간 재계획 능력 [F추정] 없음'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small - 우선순위 낮음)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': [],
}

# ---------- 3위: ⑥ 커넥터 체결 × 배터리 (8.3점) - CATL Xiaomo ----------
CELLS[('⑥', '배터리', 1)] = {
    'task_short': '셀 단계 BMS 커넥터',
    'actions': ['MAN-07 정밀 커넥터 삽입 (<=1mm)', 'MAN-09 토크 제어',
                'PER-06 6D pose estimation', 'COG-05 삽입 성공 확인'],
    'requirements': '0.5mm 정밀 정렬, 토크 제어, 삽입 성공 확인 (Force feedback)',
    'cloid_w': ('△', '1mm 정밀도 [F추정] - 0.5mm 미달 가능. F/T 제어 cover'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['정밀도 1mm -> 0.5mm 향상 (손바닥 카메라 추가 권장)', 'F/T 손목 정밀화'],
    'benchmark': 'CATL Xiaomo (Spirit AI) 99% 성공률, 일일 워크로드 사람 3배',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_Innotek_Camera'],
}
CELLS[('⑥', '배터리', 2)] = {
    'task_short': '모듈 BMS 커넥터 체결',
    'actions': ['MAN-07 다종 커넥터 삽입', 'MAN-09 토크 제어',
                'PER-06 다종 커넥터 인식', 'COG-06 다종 BOM 매칭'],
    'requirements': '다종 커넥터 (수~십 종) 인식·삽입, 각도 변동 적응',
    'cloid_w': ('△', '다종 인식 VLA 가능. 정밀도는 미달 가능'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['다종 커넥터 라이브러리 학습', '정밀도 향상'],
    'benchmark': 'CATL Xiaomo 모듈 라인 투입',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_Innotek_Camera', 'LG_CNS_AI'],
}
CELLS[('⑥', '배터리', 3)] = {
    'task_short': 'Pack 다 위치 고전압 체결 (Xiaomo 99% 라인 투입)',
    'actions': ['MAN-08 고전압 안전 체결', 'MAN-10 양손 협조 체결',
                'PER-07 비정형 위치 인식', 'BAL-03 굽힘 자세 안정', 'SAF-01 절연 작업'],
    'requirements': '고전압 (400V+) 절연 안전, 비정형 위치 양손 협조, IECEx 인증 가능성',
    'cloid_w': ('△', '양손 협조 cover. 그러나 굽힘 자세에서 안정성·고전압 안전 인증 필요'),
    'cloid_b': ('△', '굽힘 자세 양족이 유리. 그러나 고전압 안전 인증 미보유 [F추정]'),
    'dev_priority': 'High',
    'dev_items': ['고전압 작업 절연 안전 인증', '비정형 위치 6D pose 정확도', '양손 협조 정밀 작업 검증'],
    'benchmark': 'CATL Xiaomo (대규모 배치 최초 사례 2025.12, Luoyang Zhongzhou, 99% 성공률)',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_Energy_Solution'],
}
CELLS[('⑥', '배터리', 4)] = {
    'task_short': 'EOL/DCR 미세 정밀 체결',
    'actions': ['MAN-11 미세 (0.1mm) 정밀 체결', 'PER-08 sub-mm 정렬'],
    'requirements': '0.1mm 정밀도, 광학 sub-mm 정렬',
    'cloid_w': ('✗', '정밀도 한계 (1mm -> 0.1mm 불가)'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(휴머노이드 진입 한계 영역, 산업R 영역)'],
    'benchmark': '양산 사례 부재 (전용 정밀 자동화 영역)',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
}

# ---------- 4위: ⑩ 박스 마감 × 물류 (8.3점) ----------
CELLS[('⑩', '물류', 1)] = {
    'task_short': 'DC 정형 Packing',
    'actions': ['MAN-12 정형 박스 접기·테이프', 'MAN-03 정위치 SKU 배치',
                'COG-07 패킹 순서 계획'],
    'requirements': '표준 박스 (DC L/M/S 3종) 접기·테이핑, 시간당 100~150 박스',
    'cloid_w': ('✓', '정형 패킹 cover'),
    'cloid_b': ('✓', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['처리량 최적화'],
    'benchmark': 'GXO × Digit 상용 RaaS',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['Bear_Robotics'],
}
CELLS[('⑩', '물류', 2)] = {
    'task_short': 'DC 다 SKU Packing',
    'actions': ['MAN-12 다 사이즈 박스 적응', 'MAN-13 보호재 채우기',
                'COG-08 SKU별 패킹 순서'],
    'requirements': '다 사이즈 박스 (수~십 종), 보호재 채우기 자율 판단',
    'cloid_w': ('△', '다 사이즈 적응 VLA cover. 보호재 채우기 Skill 추가 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['보호재 채우기 Skill (양 판단)', '다 사이즈 박스 라이브러리'],
    'benchmark': 'GXO 상용 RaaS',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['LG_CNS_AI'],
}
CELLS[('⑩', '물류', 3)] = {
    'task_short': 'DC 부정형 박스 마감 (Figure 03식)',
    'actions': ['MAN-14 부정형 박스 접기', 'MAN-15 비정형 SKU 패킹',
                'PER-09 부정형 형상 인식'],
    'requirements': '부정형 박스 즉석 접기, 비정형 SKU (의류 등) 패킹',
    'cloid_w': ('△', 'VLA 부정형 인식 cover. 그러나 부정형 박스 접기 Skill 미보유 [F추정]'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['부정형 박스 접기 Skill', '비정형 SKU 패킹 학습 데이터'],
    'benchmark': 'Figure 03 의류 패킹 시연',
    'ee_req': {'tier1': ['dex_5f', 'soft'], 'tier2': ['dex_4f', 'dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LG_Chem_Material'],
}
CELLS[('⑩', '물류', 4)] = {
    'task_short': '맞춤 포장 한정',
    'actions': ['MAN-16 맞춤 리본·포장지'],
    'requirements': '맞춤 포장 (선물 등) 자율 수행',
    'cloid_w': ('✗', '맞춤 포장 능력 미보유'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small - 우선순위 낮음)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': [],
}

# ---------- 5위: ⑪ 용접·도장 × 조선 (8.3점) - HD현대 + Persona AI 시제품 ----------
CELLS[('⑪', '조선', 1)] = {
    'task_short': '내업 평면 용접',
    'actions': ['MAN-17 용접 토치 운용', 'MAN-09 토크 제어'],
    'requirements': '평면 용접 토치 운용, 산업R 영역',
    'cloid_w': ('✗', '산업R 영역. 휴머노이드 진입 의미 없음'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(산업R 영역 - 휴머노이드 진입 비효율)'],
    'benchmark': '산업R 50년 검증 (KUKA, ABB, FANUC)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑪', '조선', 2)] = {
    'task_short': '곡면 외판 용접 (HD현대 + Persona AI 시제품)',
    'actions': ['MAN-17 용접 토치', 'MAN-18 곡면 추종', 'PER-10 곡면 path 인식',
                'BAL-04 비정형 자세'],
    'requirements': '곡면 path tracking, 추종 정밀도 1mm, 용접 인증 (KS/AWS)',
    'cloid_w': ('✗', '곡면 path 추종 능력 [F추정] 없음 - 신규 개발 필요'),
    'cloid_b': ('△', '비정형 자세 가능. 그러나 용접 Skill·인증 미보유'),
    'dev_priority': 'High',
    'dev_items': ['용접 토치 운용 Skill', '곡면 path tracking', '용접 인증 (KS/AWS)',
                  '용접 환경 IP 등급 (스파크·열) 향상'],
    'benchmark': 'HD현대 + Persona AI 시제품 완료, 2027 commercial 예정',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑪', '조선', 3)] = {
    'task_short': '협소 블록 내부 용접 (HD현대)',
    'actions': ['LOC-06 협소 진입', 'MAN-17 용접', 'BAL-04 비정형 자세',
                'PER-11 협소 path 인식', 'SAF-02 IECEx (방폭)'],
    'requirements': '협소 (60cm 이하) 진입, IECEx 방폭 인증, 추종 정밀도',
    'cloid_w': ('✗', '협소 진입 + 용접 모두 미보유'),
    'cloid_b': ('△', '협소 진입 양족 유리. 용접 Skill 미보유'),
    'dev_priority': 'High',
    'dev_items': ['IECEx 방폭 인증', '협소 진입 + 용접 결합', 'Persona AI 협업 또는 자체 개발'],
    'benchmark': 'HD현대 (Persona AI 시제품)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑪', '조선', 4)] = {
    'task_short': '선체 도장 (한화오션 2030 100%)',
    'actions': ['MAN-19 도장 스프레이', 'PER-12 도장 면적 인식',
                'BAL-04 비정형 자세', 'SAF-03 IECEx + IP65'],
    'requirements': '도장 스프레이 운용, IECEx 방폭, IP65 (페인트 분진)',
    'cloid_w': ('✗', '도장 Skill·IECEx 미보유'),
    'cloid_b': ('△', '비정형 자세 cover. 도장 Skill·인증 미보유'),
    'dev_priority': 'High',
    'dev_items': ['도장 스프레이 Skill', 'IECEx + IP65 인증', '한화오션 협업 가능성'],
    'benchmark': '한화오션 2030 도장 100% 자동화 목표',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}

# ---------- 6위: ① Bin Picking × 물류 (7.5점) ----------
CELLS[('①', '물류', 1)] = {
    'task_short': 'DC 정형 Bin Staging',
    'actions': ['MAN-02 정형 Bin 픽', 'PER-13 Bin 위치 인식', 'COG-09 픽 순서 계획'],
    'requirements': '정형 Bin (LxWxH 표준) 픽업, 시간당 200+ pick',
    'cloid_w': ('✓', '정형 Bin 픽 cover'),
    'cloid_b': ('✓', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['처리량 최적화'],
    'benchmark': 'Apollo Jabil Pilot, Apollo @ Mercedes',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['Bear_Robotics'],
}
CELLS[('①', '물류', 2)] = {
    'task_short': 'DC 다 SKU Bin Picking',
    'actions': ['MAN-02 다 SKU 픽', 'PER-05 Visual SKU 분류', 'COG-10 다 SKU 픽 순서'],
    'requirements': '다종 SKU 인식·픽, Visual SKU 분류 정확도 99%+',
    'cloid_w': ('△', 'VLA 다 SKU 인식 cover. 정확도 검증 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['VLA 정확도 >=99%', '다 SKU 픽 학습 데이터'],
    'benchmark': 'Apollo Jabil sub-assembly Pilot',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier2': ['vac', 'jaw_2f'], 'tier3': []},
    'lg_assets': ['LG_CNS_AI'],
}
CELLS[('①', '물류', 3)] = {
    'task_short': '비정형 SKU Bin Picking',
    'actions': ['MAN-15 비정형 SKU 픽', 'PER-09 비정형 인식', 'MAN-20 Soft 그리퍼'],
    'requirements': '비정형 SKU (의류·잡화), Soft 그리퍼 또는 multi 그리퍼',
    'cloid_w': ('△', '비정형 픽 가능 [F추정]. Soft 그리퍼 옵션 미보유'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['Soft 그리퍼 모듈', '비정형 SKU 학습'],
    'benchmark': 'Figure 03 의류 시연 (시제품 단계)',
    'ee_req': {'tier1': ['soft', 'dex_5f'], 'tier2': ['dex_4f', 'dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LG_Chem_Material'],
}
CELLS[('①', '물류', 4)] = {
    'task_short': '랙 상단·반사 SKU 한정',
    'actions': ['MAN-21 랙 상단 (2m+) 픽', 'PER-14 반사 surface 인식'],
    'requirements': '도달 높이 2m+, 반사 surface 6D pose',
    'cloid_w': ('✗', '도달 높이 1900mm 한계'),
    'cloid_b': ('△', '발돋움 가능 시 2m+ 가능. 반사 인식 Skill 미보유'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['vac']},
    'lg_assets': [],
}

# ---------- 7위: ⑤ 나사 체결 × 전자가전 (7.5점) - Xiaomi EV 90.2% ----------
CELLS[('⑤', '전자가전', 1)] = {
    'task_short': '가전 정형 나사 체결',
    'actions': ['MAN-22 토크 드라이버 운용', 'MAN-09 토크 제어', 'PER-15 나사 위치 인식'],
    'requirements': '토크 드라이버 운용, +-0.5Nm 정밀도, 정위치 체결',
    'cloid_w': ('△', '토크 드라이버 운용 가능 [F추정]. 토크 정밀도 검증 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['토크 정밀도 향상', '드라이버 도구 인터페이스'],
    'benchmark': '산업R 영역 (가전 라인 표준)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines', '한국_산업R_부품'],
}
CELLS[('⑤', '전자가전', 2)] = {
    'task_short': 'Self-tapping nut 다 위치 (Xiaomi EV 3시간 자율 trial, 90.2%)',
    'actions': ['MAN-22 토크 드라이버', 'MAN-23 self-tapping nut 운용',
                'PER-16 다 위치 인식', 'BAL-03 굽힘 자세'],
    'requirements': 'Self-tapping nut 운용, 다 위치 (수~십 위치), line cycle (3분 이내)',
    'cloid_w': ('△', '다 위치 작업 cover. self-tapping nut Skill 학습 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['Self-tapping nut Skill', 'Line cycle 처리량 최적화', 'LGE 자사 라인 PoC 우선'],
    'benchmark': 'Xiaomi EV plant (3시간 자율 trial, 90.2% 성공률, 76초 cycle 충족 - pilot 단계)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines', 'LG_CNS_AI'],
}
CELLS[('⑤', '전자가전', 3)] = {
    'task_short': 'LGE 자사 협소 체결 PoC',
    'actions': ['LOC-06 협소 진입', 'MAN-22 토크 드라이버', 'MAN-24 협소 손목 회전',
                'PER-15 협소 위치 인식'],
    'requirements': '협소 (300mm 이하) 진입, 손목 자유도 7+ 필요',
    'cloid_w': ('△', '베이스 폭 한계로 일부 라인 진입 불가'),
    'cloid_b': ('△', '양족이 좁은 폭 가능. 손목 자유도 검증 필요'),
    'dev_priority': 'High',
    'dev_items': ['협소 손목 7+ DoF 확보', 'LGE 자사 라인 적용 Skill'],
    'benchmark': 'LGE 자사 PoC 검토 단계',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines'],
}
CELLS[('⑤', '전자가전', 4)] = {
    'task_short': '내부 한정',
    'actions': ['MAN-25 내부 정밀 체결'],
    'requirements': '제품 내부 (PCB 등) 0.5mm 정밀',
    'cloid_w': ('✗', '정밀도 한계'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(전용 자동화 영역)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['tool'], 'tier2': [], 'tier3': []},
    'lg_assets': [],
}

# ---------- 8위: ⑥ 커넥터 체결 × 전자가전 (7.5점) - Foxconn deployment ----------
CELLS[('⑥', '전자가전', 1)] = {
    'task_short': '표준 가전 커넥터',
    'actions': ['MAN-07 정밀 커넥터 삽입', 'MAN-09 토크 제어', 'PER-06 6D pose'],
    'requirements': '표준 가전 커넥터 (USB/HDMI 등), 1mm 정밀',
    'cloid_w': ('△', '1mm 정밀도 cover 가능. 검증 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['커넥터 라이브러리 (가전용)'],
    'benchmark': '산업R + 일부 휴머노이드 PoC',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines'],
}
CELLS[('⑥', '전자가전', 2)] = {
    'task_short': '가전 다종 하네스 체결 (Foxconn deployment)',
    'actions': ['MAN-07 다종 커넥터', 'MAN-26 하네스 라우팅 전 체결',
                'PER-06 다종 pose', 'COG-06 다 BOM'],
    'requirements': '다종 하네스 (Foxconn 3C 라인), 시간당 처리량',
    'cloid_w': ('△', 'VLA 다종 인식 cover'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['다종 하네스 라이브러리', 'Foxconn 3C 라인 학습'],
    'benchmark': 'UBTech Walker S2 mass delivery 시작 (2025-11) + Foxconn 3C deployment',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_CNS_AI'],
}
CELLS[('⑥', '전자가전', 3)] = {
    'task_short': 'LGE 자사 PCB FPC 체결',
    'actions': ['MAN-27 FPC (Flexible PCB) 삽입', 'MAN-09 정밀 토크',
                'PER-08 sub-mm 정렬', 'MAN-11 미세 작업'],
    'requirements': 'FPC 정밀 정합 0.5mm, FPC 손상 없는 force 제어',
    'cloid_w': ('△', 'F/T 제어 cover. 0.5mm 정밀도는 미달 가능'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['FPC 전용 그리퍼 또는 손바닥 카메라', '0.5mm 정밀화', 'LGE 자사 라인 PoC'],
    'benchmark': 'LGE 자사 PoC 검토',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium', 'LG_Innotek_Camera', 'LG_Group_Lines'],
}
CELLS[('⑥', '전자가전', 4)] = {
    'task_short': '협소 내부 한정',
    'actions': ['LOC-06 협소', 'MAN-25 내부 정밀'],
    'requirements': '제품 내부 협소 + 정밀',
    'cloid_w': ('✗', '협소 진입 불가'),
    'cloid_b': ('✗', '협소 + 정밀 모두 한계'),
    'dev_priority': 'Low',
    'dev_items': ['(전용 자동화 영역)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
}

# ---------- 9위: ⑦ 케이블 라우팅 × 배터리 (7.5점) - CATL Xiaomo ----------
CELLS[('⑦', '배터리', 1)] = {
    'task_short': 'BMS 단순 케이블',
    'actions': ['MAN-26 케이블 라우팅', 'MAN-28 케이블 결속'],
    'requirements': '단거리·정형 경로 라우팅',
    'cloid_w': ('△', '정형 라우팅 cover. 결속 Skill 검증 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['케이블 결속 Skill', '케이블 형상 인식'],
    'benchmark': '산업R + 휴머노이드 PoC',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium'],
}
CELLS[('⑦', '배터리', 2)] = {
    'task_short': '모듈 와이어 하네스 라우팅 (CATL)',
    'actions': ['MAN-26 다발 케이블 라우팅', 'MAN-28 다 결속점',
                'PER-17 케이블 다발 인식', 'MAN-10 양손 협조'],
    'requirements': '다발 케이블 동시 라우팅, 다 결속점 (5~10 점)',
    'cloid_w': ('△', '양손 협조 cover. 다발 처리 Skill 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['다발 케이블 처리 Skill', 'CATL Xiaomo 라인 학습'],
    'benchmark': 'CATL Xiaomo 모듈 라인 투입',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_CNS_AI'],
}
CELLS[('⑦', '배터리', 3)] = {
    'task_short': 'Pack 다 위치 케이블·결속 (Xiaomo flexible)',
    'actions': ['MAN-26 비정형 라우팅', 'MAN-29 동적 force 조절',
                'PER-17 비정형 케이블', 'BAL-03 굽힘 자세', 'MAN-10 양손'],
    'requirements': '비정형 위치, dynamic force (케이블 장력에 따라), 굽힘 자세',
    'cloid_w': ('△', '동적 force 제어 cover. 굽힘 자세 한계'),
    'cloid_b': ('△', '굽힘 자세 양족 유리'),
    'dev_priority': 'High',
    'dev_items': ['Dynamic force 제어', '굽힘 자세 안정', 'Xiaomo 99% 벤치마크'],
    'benchmark': 'CATL Xiaomo (flexible wiring 라인 투입)',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium'],
}
CELLS[('⑦', '배터리', 4)] = {
    'task_short': '대형 Pack 내부 한정',
    'actions': ['LOC-06 협소 진입 Pack 내부', 'MAN-30 협소 라우팅'],
    'requirements': '대형 Pack 내부 진입, 협소 라우팅',
    'cloid_w': ('✗', '협소 진입 불가'),
    'cloid_b': ('△', '양족 진입 가능성'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': [],
}

# ---------- 10위: ⑦ 케이블 라우팅 × 조선 (7.5점) ----------
CELLS[('⑦', '조선', 1)] = {
    'task_short': '내업 평면 케이블 부설',
    'actions': ['MAN-26 케이블 라우팅', 'MAN-28 결속'],
    'requirements': '평면 케이블 부설, 산업R 영역',
    'cloid_w': ('△', '평면 라우팅 cover. 그러나 산업R 효율 더 높음'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(산업R 영역)'],
    'benchmark': '산업R 영역',
    'ee_req': {'tier1': ['jaw_2f'], 'tier2': ['dex_3f'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑦', '조선', 2)] = {
    'task_short': '선체 다발 케이블 라우팅·결속',
    'actions': ['MAN-26 다발 케이블', 'MAN-28 결속', 'BAL-04 비정형 자세',
                'LOC-09 경사 보행'],
    'requirements': '선체 곡면 + 다발 케이블, 경사 보행 + 작업',
    'cloid_w': ('✗', '경사 보행 불가'),
    'cloid_b': ('△', '경사 보행 cover. 다발 케이블 Skill 필요'),
    'dev_priority': 'High',
    'dev_items': ['HD현대 협업', '경사 + 양손 작업 검증'],
    'benchmark': 'HD현대 + Persona AI 시제품',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': [],
}
CELLS[('⑦', '조선', 3)] = {
    'task_short': '협소 블록 내 비정형 케이블 부설',
    'actions': ['LOC-06 협소 진입', 'MAN-26 비정형 케이블',
                'BAL-04 자세', 'SAF-02 IECEx'],
    'requirements': '협소 진입 + IECEx 인증 + 비정형 작업',
    'cloid_w': ('✗', '협소 진입 불가'),
    'cloid_b': ('△', '협소 진입 양족 유리. IECEx 미보유'),
    'dev_priority': 'High',
    'dev_items': ['IECEx 인증', '협소 작업 검증'],
    'benchmark': 'HD현대 (Persona AI 시제품)',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑦', '조선', 4)] = {
    'task_short': '내부 변동 한정',
    'actions': ['MAN-30 협소 + 동적 변동'],
    'requirements': '협소 + 실시간 동선 변경',
    'cloid_w': ('✗', '한계'),
    'cloid_b': ('✗', '한계'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
}

# ---------- 11위: ⑧ Tote 이송 × 자동차BCG (7.5점) - Mercedes Apollo ----------
CELLS[('⑧', '자동차BCG', 1)] = {
    'task_short': '라인 사이드 자재 Tote 공급',
    'actions': ['LOC-01 평지 이동', 'MAN-01 양손 Tote', 'NAV-01 라인 사이드 SLAM',
                'PER-04 라인 위치 인식'],
    'requirements': '라인 사이드 자재 공급, 시간 정해진 takt',
    'cloid_w': ('✓', '평지 + 양손 + SLAM cover. takt 검증 필요'),
    'cloid_b': ('△', '보행 속도 한계'),
    'dev_priority': 'Mid',
    'dev_items': ['Takt 시간 동기화', 'Mercedes/BMW 라인 인터페이스'],
    'benchmark': 'Mercedes Apollo 파일럿 (Berlin·Kecskemét, 한 자릿수 대수)',
    'ee_req': {'tier1': ['hook', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['Bear_Robotics'],
}
CELLS[('⑧', '자동차BCG', 2)] = {
    'task_short': '다 라인 Tote 순회 공급 (Apollo)',
    'actions': ['NAV-02 다 라인 순회', 'MAN-01 양손 Tote',
                'COG-02 다 라인 작업 큐', 'LOC-04 동적 회피'],
    'requirements': '다 라인 동시 커버, 1시간+ 연속',
    'cloid_w': ('△', 'SLAM·동선 cover. 1시간+ 연속 안정성 검증'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['배터리 운영', '다 라인 작업 큐'],
    'benchmark': 'Mercedes Apollo (Tote delivery 파일럿, Berlin·Kecskemét)',
    'ee_req': {'tier1': ['hook', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['Bear_Robotics', 'LG_Energy_Solution'],
}
CELLS[('⑧', '자동차BCG', 3)] = {
    'task_short': '비정형 동선 부품 운반',
    'actions': ['NAV-04 비정형 동선', 'LOC-09 경사면', 'MAN-01 양손 Tote'],
    'requirements': '비정형 라인 (변동 동선), 경사면 일부',
    'cloid_w': ('✗', '경사면 한계'),
    'cloid_b': ('△', '경사 보행 cover'),
    'dev_priority': 'Low',
    'dev_items': ['(자동차 라인 평면 위주)'],
    'benchmark': '양산 사례 일부',
    'ee_req': {'tier1': ['hook'], 'tier2': ['jaw_2f', 'dex_5f'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑧', '자동차BCG', 4)] = {
    'task_short': '협소 라인 한정',
    'actions': ['LOC-06 협소'],
    'requirements': '협소 라인 진입',
    'cloid_w': ('✗', '협소 불가'),
    'cloid_b': ('△', '양족 협소 가능'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
}

# ---------- 12위: ⑨ Tote·박스 적재 × 물류 (7.5점) ----------
CELLS[('⑨', '물류', 1)] = {
    'task_short': 'DC 정형 Palletizing',
    'actions': ['MAN-01 양손 박스 (<=15kg)', 'MAN-31 적재 패턴',
                'COG-11 적재 순서 계획'],
    'requirements': '단일 SKU·정형 적재, 페이로드 15kg, 적재 패턴 계획',
    'cloid_w': ('△', '15kg 페이로드 한계 (양손 10kg)'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['양손 페이로드 15kg 확보', '적재 패턴 라이브러리'],
    'benchmark': '산업R + Apollo Pilot',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium'],
}
CELLS[('⑨', '물류', 2)] = {
    'task_short': 'DC 다 SKU 박스 적재',
    'actions': ['MAN-01 다 SKU 적재', 'COG-12 다 SKU 적재 패턴', 'PER-05 SKU 분류'],
    'requirements': '다 SKU 적재 패턴 자율 계획, 페이로드 15kg',
    'cloid_w': ('△', '페이로드 한계'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['페이로드 향상', 'SKU별 적재 자율'],
    'benchmark': 'GXO 상용 RaaS',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium', 'LG_CNS_AI'],
}
CELLS[('⑨', '물류', 3)] = {
    'task_short': 'DC 부정형 적재·랙 진입',
    'actions': ['MAN-15 부정형 박스', 'LOC-05 협소 통로 (~80cm)', 'MAN-21 랙 진입'],
    'requirements': '부정형 박스, 협소 통로, 랙 진입',
    'cloid_w': ('△', '협소 통로 cover. 부정형 적재 Skill 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['부정형 박스 적재 Skill'],
    'benchmark': 'GXO 상용 RaaS',
    'ee_req': {'tier1': ['dex_5f', 'soft'], 'tier2': ['dex_4f'], 'tier3': ['vac']},
    'lg_assets': ['LG_Chem_Material'],
}
CELLS[('⑨', '물류', 4)] = {
    'task_short': '협소·고층 적재',
    'actions': ['LOC-06 협소', 'MAN-21 고층 (2m+) 적재'],
    'requirements': '협소 + 도달 높이 2m+',
    'cloid_w': ('✗', '협소 + 도달 한계'),
    'cloid_b': ('△', '발돋움 가능성'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['jaw_2f']},
    'lg_assets': [],
}

# ---------- 13위: ⑫ 점검·계측 × 조선 (7.5점) - HD현대 ----------
CELLS[('⑫', '조선', 1)] = {
    'task_short': '의장 점검',
    'actions': ['NAV-05 의장 위치 이동', 'PER-18 외관 검사 RGB', 'COG-13 anomaly 검출'],
    'requirements': '의장 외관·치수 점검, RGB + 측정',
    'cloid_w': ('△', '평지 의장 cover. 그러나 조선 환경 IP 등급 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['IP65+ 환경 인증', 'HD현대 협업'],
    'benchmark': 'HD현대 시제품 단계 (Persona AI)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LG_Innotek_Camera'],
}
CELLS[('⑫', '조선', 2)] = {
    'task_short': '블록 순회 점검 (HD현대)',
    'actions': ['NAV-06 블록 순회', 'LOC-09 경사', 'PER-18 외관 검사',
                'COG-13 anomaly 검출'],
    'requirements': '블록 다 위치 자율 순회, 경사 보행, IP65+',
    'cloid_w': ('✗', '경사 한계'),
    'cloid_b': ('△', '경사 cover. IP65+ 인증 필요'),
    'dev_priority': 'High',
    'dev_items': ['IP65+ 인증', '경사 + 작업 검증', 'HD현대 시제품 라인 학습'],
    'benchmark': 'HD현대 시제품 (Persona AI 휴머노이드 + Spot 4족 활용)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LG_Innotek_Camera'],
}
CELLS[('⑫', '조선', 3)] = {
    'task_short': '블록 내부 협소 점검 (HD현대)',
    'actions': ['LOC-06 협소', 'BAL-04 자세', 'PER-19 협소 SLAM', 'SAF-02 IECEx'],
    'requirements': '협소 진입, IECEx 방폭, 비정형 자세',
    'cloid_w': ('✗', '협소 불가'),
    'cloid_b': ('△', '양족 협소 가능. IECEx 미보유'),
    'dev_priority': 'High',
    'dev_items': ['IECEx 인증', '협소 + 비정형 자세 검증'],
    'benchmark': 'HD현대 (Persona AI 시제품)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑫', '조선', 4)] = {
    'task_short': 'NDE 보조 작업',
    'actions': ['MAN-32 NDE 도구 운용', 'PER-20 NDE 데이터 수집'],
    'requirements': 'NDE (Non-Destructive Examination) 도구 운용, 정밀 데이터 수집',
    'cloid_w': ('✗', 'NDE 도구 미보유'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(전문 NDE 영역)'],
    'benchmark': 'NDE 전용 자동화 영역',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}

# ============================================================
# 7. 6개 클러스터 (v1.2 유지 + LG 관점 보강 - v1.3)
# ============================================================
CLUSTERS = [
    {'id': 1, 'name': 'Tool-swap 인터페이스 표준화',
     'description': 'AEON Hexagon식 자동 그리퍼 교체 + Hook은 옵션 하나',
     'dev_type': 'D', 'time': '6~12개월', 'priority': '★ 우선 검토',
     'lg_angle': 'LG 자체 swap 표준 -> Digit V6·AEON 흐름과 같은 방향',
     'covers_cells': ['⑧/물류', '⑧/자동차BCG', '⑤/전자가전', '⑪/조선']},
    {'id': 2, 'name': 'Hook End-Effector 자체/협업',
     'description': 'Tote 영역 효율 극대화 (Digit Hook tier1)',
     'dev_type': 'D', 'time': '1~2개월 (Tote 전용 자체 설계)', 'priority': '단기 진입',
     'lg_angle': '자체 hook 설계 또는 Digit 협업 - Bear Robotics 베이스 활용',
     'covers_cells': ['⑧/물류', '⑧/자동차BCG']},
    {'id': 3, 'name': '정밀도 향상 (1mm -> 0.5mm)',
     'description': '손바닥 카메라 + tactile 추가, F/T 정밀화',
     'dev_type': 'B', 'time': '12~18개월', 'priority': '중기 추진',
     'lg_angle': 'LG이노텍 카메라 + LG화학 tactile 패드 자체 활용',
     'covers_cells': ['⑥/배터리', '⑥/전자가전', '⑤/전자가전']},
    {'id': 4, 'name': '인증 취득 (IECEx, IP65+)',
     'description': '조선·배터리 진입 필수 - 한국 인증 (KCs, KOSHA) 우선',
     'dev_type': 'C', 'time': '18~24개월', 'priority': '★ 우선 검토',
     'lg_angle': 'HD현대 협업 + 한국 인증 통과로 글로벌 인증 가속화',
     'covers_cells': ['⑪/조선', '⑫/조선', '⑦/조선']},
    {'id': 5, 'name': '처리량·24/7 운영',
     'description': '배터리 스왑/도킹, line cycle 최적화',
     'dev_type': 'B', 'time': '12~18개월', 'priority': '중기 추진',
     'lg_angle': 'LG에너지솔루션 4h -> 8h 배터리 + LG CNS 작업 큐 자동화',
     'covers_cells': ['⑧/물류', '⑧/자동차BCG', '②/물류', '⑩/물류']},
    {'id': 6, 'name': 'LG 그룹 라인 데이터 + VLA 학습',
     'description': '자사 양산 라인에서 데이터 직접 수집·학습',
     'dev_type': 'D', 'time': '6~12개월', 'priority': '단기 진입',
     'lg_angle': 'LGE 가전·LG디스플레이·LG에너지솔루션·LG화학 라인 = 자사 PoC 우선',
     'covers_cells': ['⑤/전자가전', '⑥/전자가전', '⑥/배터리']},
]

# ============================================================
# 8. 통계 함수
# ============================================================
def stats():
    total = len(CELLS)
    cloid_w_cover = {'✓': 0, '△': 0, '✗': 0}
    cloid_b_cover = {'✓': 0, '△': 0, '✗': 0}
    high_priority = 0
    cells_with_lg_assets = 0
    for key, cell in CELLS.items():
        cloid_w_cover[cell['cloid_w'][0]] += 1
        cloid_b_cover[cell['cloid_b'][0]] += 1
        if cell['dev_priority'] == 'High':
            high_priority += 1
        if cell.get('lg_assets'):
            cells_with_lg_assets += 1
    return {
        'total': total,
        'cloid_w': cloid_w_cover,
        'cloid_b': cloid_b_cover,
        'high_priority_count': high_priority,
        'lg_asset_coverage': cells_with_lg_assets,
        'lg_asset_ratio': f"{cells_with_lg_assets * 100 // total}%",
    }


def stats_ee():
    """그리퍼 교체식 가정에서 EE 매칭 평가 (각 셀의 tier1/2 옵션 보유 여부)"""
    w_options = {ee for ee, has in CLOID_W_SPEC['ee_options'].items() if has is True}
    b_options = {ee for ee, has in CLOID_B_SPEC['ee_options'].items() if has is True}
    ee_w = {'cover': 0, 'partial': 0, 'gap': 0}
    ee_b = {'cover': 0, 'partial': 0, 'gap': 0}
    for cell in CELLS.values():
        ee_req = cell.get('ee_req', {})
        t1, t2 = set(ee_req.get('tier1', [])), set(ee_req.get('tier2', []))
        if t1 & w_options:
            ee_w['cover'] += 1
        elif t2 & w_options:
            ee_w['partial'] += 1
        else:
            ee_w['gap'] += 1
        if t1 & b_options:
            ee_b['cover'] += 1
        elif t2 & b_options:
            ee_b['partial'] += 1
        else:
            ee_b['gap'] += 1
    return {'ee_w': ee_w, 'ee_b': ee_b}


if __name__ == '__main__':
    s = stats()
    e = stats_ee()
    print(f'Total sub-cells: {s["total"]}')
    print(f'CLOiD W 종합: cover {s["cloid_w"]["✓"]} / partial {s["cloid_w"]["△"]} / 개발필요 {s["cloid_w"]["✗"]}')
    print(f'CLOiD B 종합: cover {s["cloid_b"]["✓"]} / partial {s["cloid_b"]["△"]} / 개발필요 {s["cloid_b"]["✗"]}')
    print(f'EE 매칭 W: cover {e["ee_w"]["cover"]} / partial {e["ee_w"]["partial"]} / gap {e["ee_w"]["gap"]}')
    print(f'EE 매칭 B: cover {e["ee_b"]["cover"]} / partial {e["ee_b"]["partial"]} / gap {e["ee_b"]["gap"]}')
    print(f'High priority dev items: {s["high_priority_count"]}')
    print(f'LG 자체 자산 매핑된 셀: {s["lg_asset_coverage"]}/{s["total"]} ({s["lg_asset_ratio"]})')
