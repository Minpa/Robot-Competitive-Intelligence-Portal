"""
CLOiD W/B Capability Gap Analysis v1.3.1 r2 - 데이터 모듈
============================================================
변경 이력
- v1.0: 13개 셀 × 4Lv = 52 sub-cells, CLOiD W/B 추정 스펙
- v1.1: EE 9-카테고리 분리, Tier 시스템, 그리퍼 교체식 가정
- v1.2: Gap 정의 명시화, 톤 순화, 4종 분류 (A/B/C/D)
- v1.3: 'Gap'->'개발필요' 통일, LG 자체 자산 매핑, 한국 생태계 협업, 6 클러스터 LG 관점 보강
- v1.3.1: ES사업부 A2동 현장 방문 보고서 (2026-05-10 LG·BCG 합동) 반영
          - ⑬ Insulation·환경유해 작업 카테고리 신규
          - ⑬/전자가전, ⑫/전자가전, ⑧/전자가전, ②/전자가전 신규 4 셀 (총 17 셀, 68 sub-cells)
          - 클러스터 7 신규: LGE 자사 ES 라인 우선 검증
- v1.3.1 r2: 현장 확인 태그 (field_verified, field_verified_source, field_verified_line) 추가
             16 sub-cells에 LG·BCG 합동 현장 직접 관찰 표기. portal UI에 '현장 확인' 배지 노출 가능

신뢰도 등급
[A] 공식 1차 출처  [B] 2개 이상 독립 매체  [C] 단일 출처  [D] 데이터 기반 추정
[E] 미확인/루머   [F] AI 학습 데이터 기반 추론
* CLOiD 스펙 모두 [F추정], v1.3.1 신규 셀 LGE_ES 데이터 [B] 등급 (현장 보고서 + LG/BCG 1차)
"""

# ============================================================
# 0. 판정 표기 정의
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
    'A': {'desc': 'Form factor 변경', 'time': '24~36개월', 'priority': ''},
    'B': {'desc': 'HW 보강',          'time': '12~18개월', 'priority': ''},
    'C': {'desc': '인증 취득',        'time': '18~24개월', 'priority': '★ 우선 검토'},
    'D': {'desc': '신규 Skill·도구',  'time': '6~12개월',  'priority': ''},
}

GAP_DIMENSIONS = {
    'covered': 'Capability Gap',
    'not_covered': ['Performance', 'Maturity', 'Cost', 'Time-to-Market', 'Ecosystem'],
}

# v1.3.1 r2: 현장 확인 메타 (portal UI 배지·필터에 사용)
FIELD_VERIFIED_META = {
    'flag_field': 'field_verified',
    'source_field': 'field_verified_source',
    'line_field': 'field_verified_line',
    'badge_label_kr': '현장 확인',
    'badge_label_en': 'Field Verified',
    'description': 'LG·BCG 합동 ES사업부 A2동 직접 관찰 (2026-05-10)',
}

# ============================================================
# 1. End-effector 9-카테고리
# ============================================================
END_EFFECTOR_CATEGORIES = {
    'dex_5f': {'kr': '5지 정밀 손', 'en': '5-finger', 'dof': '11~22 DoF',
               'examples': 'Tesla Optimus / Figure 03 / UBTech / Agibot / Xiaomi'},
    'dex_4f': {'kr': '4지 손', 'en': '4-finger', 'dof': '11 DoF',
               'examples': 'Apptronik Apollo / Allegro Hand'},
    'dex_3f': {'kr': '3지 손', 'en': '3-finger', 'dof': '6~7 DoF',
               'examples': 'Boston Dynamics Atlas / Unitree G1 / Schunk SDH'},
    'jaw_2f': {'kr': '2지 평행 그리퍼', 'en': '2-finger parallel', 'dof': '1~2 DoF',
               'examples': '산업R 50년 검증'},
    'vac':    {'kr': '진공 흡착 그리퍼', 'en': 'Vacuum suction', 'dof': 'N/A',
               'examples': '박스 핸들링 / DC packing'},
    'hook':   {'kr': '후크형 그리퍼', 'en': 'Hook end-effector', 'dof': '1 DoF',
               'examples': 'Tote 전용, Digit GXO/Spanx'},
    'tool':   {'kr': '도구 직접 운용', 'en': 'Tool end-of-arm', 'dof': 'N/A',
               'examples': '토치·스프레이·드라이버·게이지·Insulation 노즐'},
    'soft':   {'kr': '유연 그리퍼', 'en': 'Soft gripper', 'dof': 'N/A',
               'examples': '비정형 SKU / 의류 / Insulation 단열재'},
    'swap':   {'kr': '자동 교체 시스템', 'en': 'Tool changer', 'dof': 'N/A',
               'examples': 'AEON Hexagon / BMW Leipzig 2026 여름'},
}

TERM_MAPPING = {
    'EE': '그리퍼·도구',
    'DoF': '자유도',
    'tactile': '촉각 센서',
    'RaaS': '로봇 구독 서비스',
    'PFL': '충돌 감지 안전 모드',
    'SLAM': '자율 주행·위치 인식',
    'VLA': '시각-언어-행동 AI 모델',
    'F/T': '힘·토크 센서',
    'NDE': '비파괴 검사',
    'IECEx': '국제 방폭 인증',
    'IP65': '방진·방수 등급',
    'FPC': '연성 회로 케이블',
    'ICP': '이상적 고객 유형',
    'GTM': '시장 진입 전략',
    'PoC': '개념 검증',
    'BOM': '부품 명세서',
    'Lv1~4': '난이도 등급',
    'LGE_ES': 'LG전자 ES사업부 (에어컨/실외기/쿠킹 - A2동)',
}

# ============================================================
# 2. CLOiD W / B 추정 스펙
# ============================================================
CLOID_W_SPEC = {
    'name': 'CLOiD W',
    'form_factor': '휠형 양팔',
    'note': '[F추정] - ARGOS 입력 후 정밀화',
    'ee_options': {'dex_5f': True, 'dex_4f': True, 'dex_3f': True,
                   'jaw_2f': True, 'vac': True,
                   'hook': False, 'tool': 'partial', 'soft': False, 'swap': True},
    'finger_dof_5f': 16, 'palm_camera': False, 'tactile_sensor': False, 'gripper_change_time_sec': 30,
    'locomotion_type': '휠', 'max_speed_ms': 1.5,
    'stair_climbing': False, 'slope_max_deg': 10, 'base_width_mm': 600,
    'battery_runtime_hr': 5.0, 'auto_docking': True,
    'payload_single_kg': 5.0, 'payload_dual_kg': 10.0,
    'arm_reach_mm': 750, 'reach_height_max_mm': 1900, 'reach_height_low_mm': 200,
    'grip_force_n': 50.0, 'grip_precision_mm': 1.0,
    'force_torque_control': True, 'bimanual_coordination': True,
    'rgb_camera_count': 4, 'depth_sensor': 'Stereo + ToF', 'lidar': True,
    'pose_estimation_mm': 3.0, 'slam_capable': True,
    'vla_onboard': 'hybrid', 'multistep_autonomous': True,
    'iso_10218': '진행 중', 'human_collab_mode': 'PFL', 'cleanroom_compatible': False,
}

CLOID_B_SPEC = {
    'name': 'CLOiD B', 'form_factor': '양족 양팔',
    'note': '[F추정] - W와 동일 손 + 보행',
    'ee_options': dict(CLOID_W_SPEC['ee_options']),
    'finger_dof_5f': 16, 'palm_camera': False, 'tactile_sensor': False, 'gripper_change_time_sec': 30,
    'locomotion_type': '양족', 'max_speed_ms': 1.0,
    'stair_climbing': True, 'stair_height_max_cm': 17, 'slope_max_deg': 15,
    'battery_runtime_hr': 4.0,
    'payload_single_kg': 5.0, 'payload_dual_kg': 10.0,
    'arm_reach_mm': 750, 'reach_height_max_mm': 2000, 'reach_height_low_mm': 100,
    'grip_force_n': 50.0, 'grip_precision_mm': 1.0,
    'force_torque_control': True, 'bimanual_coordination': True,
    'rgb_camera_count': 4, 'depth_sensor': 'Stereo + ToF', 'lidar': True,
    'pose_estimation_mm': 3.0, 'slam_capable': True,
    'vla_onboard': 'hybrid', 'multistep_autonomous': True,
    'iso_10218': '진행 중', 'human_collab_mode': 'PFL', 'cleanroom_compatible': False,
}

# ============================================================
# 3. LG 자체 자산 매핑
# ============================================================
LG_ASSETS = {
    'LGE_Axium': {'category': '액추에이터', 'covers': ['dex_5f', 'dex_4f', 'dex_3f'],
                  'rationale': '자체 액추에이터 - 라이선스 회피', 'reliability': '[F추정]'},
    'LG_Innotek_Camera': {'category': '카메라/비전', 'covers': ['palm_camera', 'tactile_vision'],
                  'rationale': '손바닥/손끝 ToF·tactile 비전', 'reliability': '[F추정]'},
    'LG_Chem_Material': {'category': '소재', 'covers': ['soft', 'tactile_pad', 'insulation_material'],
                  'rationale': 'Soft 그리퍼 + 단열재 자체 공급 (v1.3.1)', 'reliability': '[F추정]'},
    'LG_Energy_Solution': {'category': '배터리', 'covers': ['battery_runtime'],
                  'rationale': '24/7 배터리 (4h -> 8h)', 'reliability': '[F추정]'},
    'Bear_Robotics': {'category': 'CLOiD W base + SLAM',
                  'covers': ['locomotion_wheel', 'slam', 'service_robot_skill'],
                  'rationale': '2024 LGE 인수', 'reliability': '[A]'},
    'LG_CNS_AI': {'category': 'AI 인프라', 'covers': ['vla_training', 'cloud_compute'],
                  'rationale': 'VLA 모델 학습·배포', 'reliability': '[F추정]'},
    'LG_Group_Lines': {'category': '양산 라인 데이터',
                  'covers': ['LGE_가전', 'LGE_ES_A2동', 'LG디스플레이', 'LG에너지솔루션', 'LG화학'],
                  'rationale': '자사 라인 양산 데이터 (v1.3.1: ES A2동 명시)', 'reliability': '[B]'},
}

# ============================================================
# 4. 한국 생태계 협업 후보
# ============================================================
KOREA_PARTNERS = {
    'HD현대': {'category': '조선 통합',
              'covers_cells': [('11', '조선'), ('12', '조선'), ('07', '조선')],
              'covers_ee': ['tool'], 'status': '시제품 (Persona AI)',
              'rationale': '조선 환경 + NDE + IECEx', 'reliability': '[C]'},
    'Robotis': {'category': '서보 모터', 'covers_ee': ['dex_3f', 'jaw_2f'],
              'status': '양산 (Dynamixel)', 'rationale': '한국 산업R 표준',
              'reliability': '[A]'},
    'KAIST': {'category': '연구 협업', 'covers': ['tactile_sensor', 'VLA_research'],
              'status': '연구', 'rationale': '촉각·VLA 공동 연구', 'reliability': '[B]'},
    'POSTECH': {'category': '연구 협업', 'covers': ['tactile_sensor', 'manipulation_research'],
              'status': '연구', 'rationale': '정밀 매니퓰레이션 공동 연구', 'reliability': '[B]'},
    '한국_산업R_부품': {'category': '기성 부품', 'covers_ee': ['jaw_2f', 'vac', 'tool'],
              'status': '기성품', 'rationale': '라이선스 부담 없음', 'reliability': '[A]'},
}

# ============================================================
# 5. 작업 카테고리 / 셀 순서
# ============================================================
TASK_NAMES = {
    '①': 'Bin Picking', '②': 'Kitting', '⑤': '나사 체결',
    '⑥': '커넥터 체결', '⑦': '케이블 라우팅', '⑧': 'Tote 이송',
    '⑨': 'Tote·박스 적재', '⑩': '박스 마감', '⑪': '용접·도장',
    '⑫': '점검·계측',
    '⑬': 'Insulation·환경유해',
}

CELL_ORDER = [
    ('⑧', '물류',      9.2), ('②', '물류',      8.3), ('⑥', '배터리',   8.3),
    ('⑩', '물류',      8.3), ('⑪', '조선',      8.3), ('①', '물류',      7.5),
    ('⑤', '전자가전',  7.5), ('⑥', '전자가전',  7.5), ('⑦', '배터리',   7.5),
    ('⑦', '조선',      7.5), ('⑧', '자동차BCG', 7.5), ('⑨', '물류',      7.5),
    ('⑫', '조선',      7.5),
    ('⑬', '전자가전',  8.0), ('⑫', '전자가전',  8.0),
    ('⑧', '전자가전',  7.7), ('②', '전자가전',  7.5),
]

FIELD_VERIFIED_SOURCE = 'LG·BCG 합동 ES사업부 A2동 방문 2026-05-10'

# ============================================================
# 6. 셀 × 4Lv = 68 sub-cells
# ============================================================
CELLS = {}

# ============================================================
# v1.3 기존 셀 (52 sub-cells)
# ============================================================

# ---------- ⑧ Tote × 물류 (9.2) ----------
CELLS[('⑧', '물류', 1)] = {
    'task_short': 'AMR Tote 정형 이송 (DC 평면)',
    'actions': ['LOC-01 평지 정속', 'LOC-03 정적 회피', 'MAN-01 양손 Tote (<=10kg)', 'PER-01 마커', 'NAV-01 SLAM'],
    'requirements': '평지 1.0+ m/s, 페이로드 양손 10kg, SLAM, 24/7',
    'cloid_w': ('✓', '평지·페이로드·SLAM cover. 베어로보틱스 결합 단기 진입 (학습 후)'),
    'cloid_b': ('△', '보행 1.0 m/s 한계, 24/7 배터리 부족'),
    'dev_priority': 'Low',
    'dev_items': ['배터리 24/7 (스왑 또는 도킹)', 'DC 통로 폭 적응'],
    'benchmark': 'Digit @ GXO/Spanx (상용 RaaS, 16kg, 6 ft, 4시간)',
    'ee_req': {'tier1': ['hook', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': ['vac']},
    'lg_assets': ['Bear_Robotics', 'LG_Energy_Solution'],
}
CELLS[('⑧', '물류', 2)] = {
    'task_short': 'DC 다 라인 Tote 순회 (Digit @ GXO 누적 10만)',
    'actions': ['LOC-01 평지', 'LOC-04 동적 회피', 'MAN-01 양손 Tote',
                'MAN-04 컨베이어 이재', 'PER-02 다종 SKU', 'NAV-02 다 위치 순회'],
    'requirements': '동적 환경, 다종 컨베이어, 다 위치 자율 계획',
    'cloid_w': ('✓', '동적 회피·SLAM cover. 컨베이어 Skill 학습 필요'),
    'cloid_b': ('△', '보행 + 배터리 한계. 다 라인 시 휠 대비 효율 떨어짐'),
    'dev_priority': 'Mid',
    'dev_items': ['컨베이어 to AMR 이재 Skill', '다 라인 작업 큐', '24/7 배터리'],
    'benchmark': 'Digit (GXO Spanx 100,000+ Tote, Flowery Branch 상용 RaaS)',
    'ee_req': {'tier1': ['hook', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': ['vac']},
    'lg_assets': ['Bear_Robotics', 'LG_CNS_AI'],
}
CELLS[('⑧', '물류', 3)] = {
    'task_short': '계단·다층 Tote 이송 (Digit 6 ft reach)',
    'actions': ['LOC-07 계단 (단높이 17cm)', 'LOC-09 경사 15도', 'MAN-01 양손 Tote',
                'MAN-05 도달 1830mm', 'BAL-01 보행 중 균형'],
    'requirements': '계단 + 페이로드, 6 ft 도달, 양족 균형',
    'cloid_w': ('✗', '계단 불가. 휠은 평면 한정'),
    'cloid_b': ('△', '계단 가능 [F추정]. 페이로드 검증 필요. 6 ft reach 미달 가능'),
    'dev_priority': 'High',
    'dev_items': ['Tote 들고 계단 등반 검증', '도달 1900 -> 1830mm', '추락 안전 (ISO 13482)', '양손 페이로드 균형'],
    'benchmark': 'Digit (6 ft, 16kg, 양족 계단 demo; Spanx/GXO 단층 DC RaaS)',
    'ee_req': {'tier1': ['hook'], 'tier2': ['jaw_2f', 'dex_5f', 'dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium'],
}
CELLS[('⑧', '물류', 4)] = {
    'task_short': '협소 랙 Tote 진입',
    'actions': ['LOC-06 협소 (60cm 이하)', 'MAN-06 협소 매니퓰레이션', 'PER-03 협소 SLAM', 'BAL-02 비대칭 자세'],
    'requirements': '베이스 폭 55cm 이하, 깊이 600mm 랙',
    'cloid_w': ('✗', '베이스 폭 600mm -> 협소 통로 진입 불가'),
    'cloid_b': ('△', '양족 좁은 폭 가능. 비대칭 reach 한계'),
    'dev_priority': 'Low',
    'dev_items': ['(★ 시장 small)'],
    'benchmark': "Digit 5'9 폼팩터도 한계",
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['hook']},
    'lg_assets': [],
}

# ---------- ② Kitting × 물류 (8.3) ----------
CELLS[('②', '물류', 1)] = {
    'task_short': 'DC Order Kitting (정형)',
    'actions': ['MAN-02 단일 SKU 픽', 'MAN-03 정위치 배치', 'PER-04 BOM', 'COG-01 BOM 매칭'],
    'requirements': 'BOM 단일, 픽 1mm, 시간당 200~300 pick',
    'cloid_w': ('✓', '단일 SKU 픽 cover. 처리량 검증 필요'),
    'cloid_b': ('✓', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['처리량 최적화'],
    'benchmark': 'GXO × Digit Order Picking (RaaS), Apollo Jabil',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines'],
}
CELLS[('②', '물류', 2)] = {
    'task_short': 'DC 다 SKU Kitting',
    'actions': ['MAN-02 다 SKU', 'PER-05 Visual SKU', 'COG-02 다 BOM', 'NAV-02 다 위치 순회'],
    'requirements': '다종 SKU Visual, BOM 다 모델 관리',
    'cloid_w': ('△', 'VLA 다 SKU 인식 [F추정]. 정확도 검증 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['VLA SKU 정확도 >=99%', 'BOM 자율 통합'],
    'benchmark': 'Toyota TMMC Digit 7대 commercial, Mercedes Apollo',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier2': ['vac', 'jaw_2f'], 'tier3': []},
    'lg_assets': ['LG_CNS_AI', 'LG_Group_Lines'],
}
CELLS[('②', '물류', 3)] = {
    'task_short': '다 SKU·다 창고 동선 Kit',
    'actions': ['NAV-03 다 창고 동선', 'MAN-02 다 SKU', 'COG-03 동선 최적화', 'LOC-04 동적 환경'],
    'requirements': '다 창고 자율 동선, 1시간+ 연속',
    'cloid_w': ('△', '동선·SLAM cover. 1시간+ 안정성 검증 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['장시간 안정성', '동선 최적화'],
    'benchmark': 'Digit GXO',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LG_Energy_Solution'],
}
CELLS[('②', '물류', 4)] = {
    'task_short': '실시간 주문 변경 한정',
    'actions': ['COG-04 실시간 BOM 재계획', 'MAN-02 다 SKU 픽'],
    'requirements': '실시간 주문 변경 중 작업 중단 없이 재계획',
    'cloid_w': ('✗', '실시간 재계획 [F추정] 없음'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': [],
}

# ---------- ⑥ 커넥터 × 배터리 (8.3) - CATL Xiaomo ----------
CELLS[('⑥', '배터리', 1)] = {
    'task_short': '셀 단계 BMS 커넥터',
    'actions': ['MAN-07 정밀 삽입 (<=1mm)', 'MAN-09 토크', 'PER-06 6D pose', 'COG-05 삽입 확인'],
    'requirements': '0.5mm 정렬, 토크, Force feedback',
    'cloid_w': ('△', '1mm 정밀도 [F추정] - 0.5mm 미달 가능. F/T cover'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['1mm -> 0.5mm 향상 (손바닥 카메라)', 'F/T 손목 정밀화'],
    'benchmark': 'CATL Xiaomo (Spirit AI) 99% 성공률, 사람 3배',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_Innotek_Camera'],
}
CELLS[('⑥', '배터리', 2)] = {
    'task_short': '모듈 BMS 커넥터 체결',
    'actions': ['MAN-07 다종 커넥터', 'MAN-09 토크', 'PER-06 다종 인식', 'COG-06 다종 BOM'],
    'requirements': '다종 커넥터 인식·삽입, 각도 변동 적응',
    'cloid_w': ('△', '다종 인식 VLA. 정밀도 미달 가능'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['다종 커넥터 라이브러리', '정밀도 향상'],
    'benchmark': 'CATL Xiaomo 모듈 라인',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_Innotek_Camera', 'LG_CNS_AI'],
}
CELLS[('⑥', '배터리', 3)] = {
    'task_short': 'Pack 다 위치 고전압 (Xiaomo 99% 라인 투입)',
    'actions': ['MAN-08 고전압 안전', 'MAN-10 양손 협조', 'PER-07 비정형 위치',
                'BAL-03 굽힘 자세', 'SAF-01 절연'],
    'requirements': '고전압 400V+, 비정형 양손 협조, IECEx 가능성',
    'cloid_w': ('△', '양손 cover. 굽힘 자세 + 고전압 인증 필요'),
    'cloid_b': ('△', '굽힘 자세 양족 유리. 고전압 인증 미보유 [F추정]'),
    'dev_priority': 'High',
    'dev_items': ['고전압 절연 인증', '6D pose 정확도', '양손 협조 검증'],
    'benchmark': 'CATL Xiaomo (2025.12 Luoyang Zhongzhou, 99%)',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_Energy_Solution'],
}
CELLS[('⑥', '배터리', 4)] = {
    'task_short': 'EOL/DCR 미세 정밀 체결',
    'actions': ['MAN-11 미세 (0.1mm)', 'PER-08 sub-mm 정렬'],
    'requirements': '0.1mm, 광학 sub-mm',
    'cloid_w': ('✗', '정밀도 한계'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(산업R 영역)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
}

# ---------- ⑩ 박스 마감 × 물류 (8.3) ----------
CELLS[('⑩', '물류', 1)] = {
    'task_short': 'DC 정형 Packing',
    'actions': ['MAN-12 정형 박스', 'MAN-03 SKU 배치', 'COG-07 패킹 순서'],
    'requirements': '표준 박스 L/M/S, 시간당 100~150',
    'cloid_w': ('✓', '정형 패킹 cover'),
    'cloid_b': ('✓', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['처리량 최적화'],
    'benchmark': 'GXO × Digit RaaS',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['Bear_Robotics'],
}
CELLS[('⑩', '물류', 2)] = {
    'task_short': 'DC 다 SKU Packing',
    'actions': ['MAN-12 다 사이즈', 'MAN-13 보호재', 'COG-08 SKU별 순서'],
    'requirements': '다 사이즈 박스, 보호재 자율',
    'cloid_w': ('△', '다 사이즈 VLA cover. 보호재 Skill 추가'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['보호재 Skill', '다 사이즈 라이브러리'],
    'benchmark': 'GXO RaaS',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['LG_CNS_AI'],
}
CELLS[('⑩', '물류', 3)] = {
    'task_short': 'DC 부정형 박스 (Figure 03식)',
    'actions': ['MAN-14 부정형 박스', 'MAN-15 비정형 SKU', 'PER-09 부정형 인식'],
    'requirements': '부정형 박스 즉석, 비정형 SKU',
    'cloid_w': ('△', 'VLA cover. 박스 접기 Skill 미보유 [F추정]'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['부정형 박스 Skill', '비정형 SKU 학습'],
    'benchmark': 'Figure 03 의류 시연',
    'ee_req': {'tier1': ['dex_5f', 'soft'], 'tier2': ['dex_4f', 'dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LG_Chem_Material'],
}
CELLS[('⑩', '물류', 4)] = {
    'task_short': '맞춤 포장 한정',
    'actions': ['MAN-16 맞춤 리본'],
    'requirements': '맞춤 포장 자율',
    'cloid_w': ('✗', '맞춤 포장 미보유'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': [],
}

# ---------- ⑪ 용접·도장 × 조선 (8.3) - HD현대 + Persona AI ----------
CELLS[('⑪', '조선', 1)] = {
    'task_short': '내업 평면 용접',
    'actions': ['MAN-17 토치', 'MAN-09 토크'],
    'requirements': '평면 용접, 산업R 영역 (※ 보고서: 1000℃·1~3초 cycle - 사람 영역 유지)',
    'cloid_w': ('✗', '산업R 영역. 휴머노이드 진입 의미 없음'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(산업R 영역)'],
    'benchmark': '산업R 50년 (KUKA, ABB, FANUC). LGE ES A2동 보고서: 사람 영역 유지',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑪', '조선', 2)] = {
    'task_short': '곡면 외판 용접 (HD현대 + Persona AI 시제품)',
    'actions': ['MAN-17 토치', 'MAN-18 곡면 추종', 'PER-10 곡면 path', 'BAL-04 비정형'],
    'requirements': '곡면 path, 추종 1mm, 인증 (KS/AWS)',
    'cloid_w': ('✗', '곡면 path 추종 [F추정] 없음'),
    'cloid_b': ('△', '비정형 자세 가능. 용접 Skill·인증 미보유'),
    'dev_priority': 'High',
    'dev_items': ['용접 Skill', '곡면 path tracking', 'KS/AWS 인증', 'IP 등급 향상'],
    'benchmark': 'HD현대 + Persona AI 시제품, 2027 commercial',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑪', '조선', 3)] = {
    'task_short': '협소 블록 내부 용접 (HD현대)',
    'actions': ['LOC-06 협소', 'MAN-17 용접', 'BAL-04 자세', 'PER-11 협소 path', 'SAF-02 IECEx'],
    'requirements': '협소 (60cm 이하) + IECEx',
    'cloid_w': ('✗', '협소 + 용접 모두 미보유'),
    'cloid_b': ('△', '협소 양족 유리. 용접 Skill 미보유'),
    'dev_priority': 'High',
    'dev_items': ['IECEx', '협소 + 용접 결합'],
    'benchmark': 'HD현대 (Persona AI)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑪', '조선', 4)] = {
    'task_short': '선체 도장 (한화오션 2030)',
    'actions': ['MAN-19 스프레이', 'PER-12 면적 인식', 'BAL-04 자세', 'SAF-03 IECEx + IP65'],
    'requirements': '도장 스프레이, IECEx, IP65',
    'cloid_w': ('✗', '도장·IECEx 미보유'),
    'cloid_b': ('△', '비정형 자세 cover. Skill·인증 미보유'),
    'dev_priority': 'High',
    'dev_items': ['도장 Skill', 'IECEx + IP65', '한화오션 협업'],
    'benchmark': '한화오션 2030 100% 자동화 목표',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}

# ---------- ① Bin Picking × 물류 (7.5) ----------
CELLS[('①', '물류', 1)] = {
    'task_short': 'DC 정형 Bin Staging',
    'actions': ['MAN-02 정형 Bin', 'PER-13 위치', 'COG-09 픽 순서'],
    'requirements': '정형 Bin, 시간당 200+',
    'cloid_w': ('✓', '정형 Bin cover'),
    'cloid_b': ('✓', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['처리량'],
    'benchmark': 'Apollo Jabil, Apollo @ Mercedes',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['Bear_Robotics'],
}
CELLS[('①', '물류', 2)] = {
    'task_short': 'DC 다 SKU Bin Picking',
    'actions': ['MAN-02 다 SKU', 'PER-05 Visual', 'COG-10 픽 순서'],
    'requirements': '다종 SKU 99%+',
    'cloid_w': ('△', 'VLA cover. 정확도 검증'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['VLA >=99%', '학습 데이터'],
    'benchmark': 'Apollo Jabil sub-assembly',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier2': ['vac', 'jaw_2f'], 'tier3': []},
    'lg_assets': ['LG_CNS_AI'],
}
CELLS[('①', '물류', 3)] = {
    'task_short': '비정형 SKU Bin Picking',
    'actions': ['MAN-15 비정형', 'PER-09 비정형 인식', 'MAN-20 Soft'],
    'requirements': '비정형 SKU, Soft 또는 multi 그리퍼',
    'cloid_w': ('△', '비정형 가능 [F추정]. Soft 미보유'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['Soft 모듈', '비정형 학습'],
    'benchmark': 'Figure 03 의류 시연',
    'ee_req': {'tier1': ['soft', 'dex_5f'], 'tier2': ['dex_4f', 'dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LG_Chem_Material'],
}
CELLS[('①', '물류', 4)] = {
    'task_short': '랙 상단·반사 SKU 한정',
    'actions': ['MAN-21 랙 상단 (2m+)', 'PER-14 반사 인식'],
    'requirements': '도달 2m+, 반사 6D pose',
    'cloid_w': ('✗', '도달 1900mm 한계'),
    'cloid_b': ('△', '발돋움 가능. 반사 Skill 미보유'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['vac']},
    'lg_assets': [],
}

# ---------- ⑤ 나사 × 전자가전 (7.5) - Xiaomi EV 90.2% ----------
CELLS[('⑤', '전자가전', 1)] = {
    'task_short': '가전 정형 나사 체결',
    'actions': ['MAN-22 토크 드라이버', 'MAN-09 토크', 'PER-15 나사 위치'],
    'requirements': '+-0.5Nm, 정위치',
    'cloid_w': ('△', '드라이버 가능 [F추정]. 토크 정밀도 검증'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['토크 정밀도', '드라이버 인터페이스'],
    'benchmark': '산업R 영역. LGE ES A2동: Screw 체결 자동화 진행 중 (보고서 참조)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines', '한국_산업R_부품'],
}
CELLS[('⑤', '전자가전', 2)] = {
    'task_short': 'Self-tapping nut (Xiaomi EV 3시간 자율, 90.2%)',
    'actions': ['MAN-22 드라이버', 'MAN-23 self-tap nut', 'PER-16 다 위치', 'BAL-03 굽힘'],
    'requirements': 'Self-tap, 다 위치, line cycle 3분',
    'cloid_w': ('△', '다 위치 cover. self-tap Skill 학습'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['Self-tap Skill', 'Line cycle 처리량', 'LGE 자사 PoC 우선'],
    'benchmark': 'Xiaomi EV plant (3시간 자율, 90.2%, 76초 cycle - pilot)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines', 'LG_CNS_AI'],
}
CELLS[('⑤', '전자가전', 3)] = {
    'task_short': 'LGE 자사 협소 체결 PoC',
    'actions': ['LOC-06 협소', 'MAN-22 드라이버', 'MAN-24 협소 손목', 'PER-15 협소 위치'],
    'requirements': '협소 300mm 이하, 손목 7+ DoF',
    'cloid_w': ('△', '베이스 폭 한계로 일부 라인 진입 불가'),
    'cloid_b': ('△', '양족 좁은 폭 가능. 손목 검증'),
    'dev_priority': 'High',
    'dev_items': ['협소 손목 7+ DoF', 'LGE 자사 적용'],
    'benchmark': 'LGE 자사 PoC 검토',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines'],
}
CELLS[('⑤', '전자가전', 4)] = {
    'task_short': '내부 한정',
    'actions': ['MAN-25 내부 정밀'],
    'requirements': '제품 내부 0.5mm',
    'cloid_w': ('✗', '정밀도 한계'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(전용 자동화)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['tool'], 'tier2': [], 'tier3': []},
    'lg_assets': [],
}

# ---------- ⑥ 커넥터 × 전자가전 (7.5) - Foxconn ----------
CELLS[('⑥', '전자가전', 1)] = {
    'task_short': '표준 가전 커넥터',
    'actions': ['MAN-07 정밀 삽입', 'MAN-09 토크', 'PER-06 6D pose'],
    'requirements': 'USB/HDMI, 1mm',
    'cloid_w': ('△', '1mm 정밀도 cover 가능. 검증'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['커넥터 라이브러리'],
    'benchmark': '산업R + 휴머노이드 PoC',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines'],
}
CELLS[('⑥', '전자가전', 2)] = {
    'task_short': '가전 다종 하네스 (Foxconn + LGE ES 결선 0% - 보고서 대표 난제)',
    'actions': ['MAN-07 다종 커넥터', 'MAN-26 하네스 라우팅 전 체결', 'PER-06 다종 pose', 'COG-06 다 BOM'],
    'requirements': '다종 하네스 (Foxconn 3C). ※LGE ES A2동: 결선 자동화 0% - 대표 난제 (보고서)',
    'cloid_w': ('△', 'VLA 다종 인식 cover'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['다종 하네스 라이브러리', 'Foxconn 3C 라인 학습', 'LGE ES A2동 결선 PoC (자동화 0% 진입 가치 큼)'],
    'benchmark': 'UBTech Walker S2 mass delivery (2025-11) + Foxconn 3C',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_CNS_AI', 'LG_Group_Lines'],
}
CELLS[('⑥', '전자가전', 3)] = {
    'task_short': 'LGE 자사 PCB FPC 체결',
    'actions': ['MAN-27 FPC 삽입', 'MAN-09 정밀 토크', 'PER-08 sub-mm', 'MAN-11 미세'],
    'requirements': 'FPC 0.5mm, force 제어',
    'cloid_w': ('△', 'F/T cover. 0.5mm 미달 가능'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['FPC 그리퍼 또는 손바닥 카메라', '0.5mm 정밀화', 'LGE 자사 PoC'],
    'benchmark': 'LGE 자사 PoC',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium', 'LG_Innotek_Camera', 'LG_Group_Lines'],
}
CELLS[('⑥', '전자가전', 4)] = {
    'task_short': '협소 내부 한정',
    'actions': ['LOC-06 협소', 'MAN-25 내부 정밀'],
    'requirements': '내부 협소 + 정밀',
    'cloid_w': ('✗', '협소 진입 불가'),
    'cloid_b': ('✗', '협소 + 정밀 한계'),
    'dev_priority': 'Low',
    'dev_items': ['(전용)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
}

# ---------- ⑦ 케이블 × 배터리 (7.5) - CATL Xiaomo ----------
CELLS[('⑦', '배터리', 1)] = {
    'task_short': 'BMS 단순 케이블',
    'actions': ['MAN-26 라우팅', 'MAN-28 결속'],
    'requirements': '단거리·정형 경로',
    'cloid_w': ('△', '정형 cover. 결속 Skill 검증'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['결속 Skill', '형상 인식'],
    'benchmark': '산업R + 휴머노이드 PoC',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium'],
}
CELLS[('⑦', '배터리', 2)] = {
    'task_short': '모듈 와이어 하네스 (CATL)',
    'actions': ['MAN-26 다발', 'MAN-28 다 결속', 'PER-17 다발 인식', 'MAN-10 양손'],
    'requirements': '다발 케이블, 결속 5~10점',
    'cloid_w': ('△', '양손 cover. 다발 처리 Skill 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['다발 Skill', 'CATL Xiaomo 학습'],
    'benchmark': 'CATL Xiaomo 모듈',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': ['LGE_Axium', 'LG_CNS_AI'],
}
CELLS[('⑦', '배터리', 3)] = {
    'task_short': 'Pack 다 위치 케이블 (Xiaomo flexible)',
    'actions': ['MAN-26 비정형', 'MAN-29 동적 force', 'PER-17 비정형', 'BAL-03 굽힘', 'MAN-10 양손'],
    'requirements': '비정형 + dynamic force, 굽힘',
    'cloid_w': ('△', '동적 force cover. 굽힘 한계'),
    'cloid_b': ('△', '굽힘 양족 유리'),
    'dev_priority': 'High',
    'dev_items': ['Dynamic force', '굽힘 자세 안정', 'Xiaomo 99% 벤치마크'],
    'benchmark': 'CATL Xiaomo flexible wiring',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium'],
}
CELLS[('⑦', '배터리', 4)] = {
    'task_short': '대형 Pack 내부 한정',
    'actions': ['LOC-06 협소 진입', 'MAN-30 협소 라우팅'],
    'requirements': '대형 Pack 내부, 협소',
    'cloid_w': ('✗', '협소 불가'),
    'cloid_b': ('△', '양족 가능성'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': [],
}

# ---------- ⑦ 케이블 × 조선 (7.5) ----------
CELLS[('⑦', '조선', 1)] = {
    'task_short': '내업 평면 케이블',
    'actions': ['MAN-26 라우팅', 'MAN-28 결속'],
    'requirements': '평면, 산업R',
    'cloid_w': ('△', '평면 cover. 산업R 효율 더 높음'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(산업R 영역)'],
    'benchmark': '산업R',
    'ee_req': {'tier1': ['jaw_2f'], 'tier2': ['dex_3f'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑦', '조선', 2)] = {
    'task_short': '선체 다발 케이블',
    'actions': ['MAN-26 다발', 'MAN-28 결속', 'BAL-04 비정형', 'LOC-09 경사'],
    'requirements': '곡면 + 다발, 경사 + 작업',
    'cloid_w': ('✗', '경사 불가'),
    'cloid_b': ('△', '경사 cover. 다발 Skill 필요'),
    'dev_priority': 'High',
    'dev_items': ['HD현대 협업', '경사 + 양손'],
    'benchmark': 'HD현대 + Persona AI',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': ['jaw_2f']},
    'lg_assets': [],
}
CELLS[('⑦', '조선', 3)] = {
    'task_short': '협소 블록 비정형 케이블',
    'actions': ['LOC-06 협소', 'MAN-26 비정형', 'BAL-04 자세', 'SAF-02 IECEx'],
    'requirements': '협소 + IECEx + 비정형',
    'cloid_w': ('✗', '협소 불가'),
    'cloid_b': ('△', '협소 양족 유리. IECEx 미보유'),
    'dev_priority': 'High',
    'dev_items': ['IECEx', '협소 검증'],
    'benchmark': 'HD현대',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f'], 'tier2': ['dex_3f'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑦', '조선', 4)] = {
    'task_short': '내부 변동 한정',
    'actions': ['MAN-30 협소 + 변동'],
    'requirements': '협소 + 실시간 변경',
    'cloid_w': ('✗', '한계'),
    'cloid_b': ('✗', '한계'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
}

# ---------- ⑧ Tote × 자동차BCG (7.5) - Mercedes Apollo ----------
CELLS[('⑧', '자동차BCG', 1)] = {
    'task_short': '라인 사이드 자재 Tote 공급',
    'actions': ['LOC-01 평지', 'MAN-01 양손 Tote', 'NAV-01 SLAM', 'PER-04 라인 위치'],
    'requirements': '라인 사이드, takt',
    'cloid_w': ('✓', '평지 + 양손 + SLAM cover'),
    'cloid_b': ('△', '보행 한계'),
    'dev_priority': 'Mid',
    'dev_items': ['Takt 동기화', 'Mercedes/BMW 인터페이스'],
    'benchmark': 'Mercedes Apollo (Berlin·Kecskemét, 한 자릿수 대수)',
    'ee_req': {'tier1': ['hook', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['Bear_Robotics'],
}
CELLS[('⑧', '자동차BCG', 2)] = {
    'task_short': '다 라인 Tote 순회 (Apollo)',
    'actions': ['NAV-02 다 라인', 'MAN-01 양손', 'COG-02 작업 큐', 'LOC-04 동적'],
    'requirements': '다 라인, 1시간+',
    'cloid_w': ('△', 'SLAM cover. 1시간+ 검증'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['배터리', '작업 큐'],
    'benchmark': 'Mercedes Apollo',
    'ee_req': {'tier1': ['hook', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['Bear_Robotics', 'LG_Energy_Solution'],
}
CELLS[('⑧', '자동차BCG', 3)] = {
    'task_short': '비정형 동선',
    'actions': ['NAV-04 비정형', 'LOC-09 경사', 'MAN-01 양손'],
    'requirements': '변동 동선, 경사',
    'cloid_w': ('✗', '경사 한계'),
    'cloid_b': ('△', '경사 cover'),
    'dev_priority': 'Low',
    'dev_items': ['(평면 위주)'],
    'benchmark': '양산 일부',
    'ee_req': {'tier1': ['hook'], 'tier2': ['jaw_2f', 'dex_5f'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑧', '자동차BCG', 4)] = {
    'task_short': '협소 라인 한정',
    'actions': ['LOC-06 협소'],
    'requirements': '협소',
    'cloid_w': ('✗', '협소 불가'),
    'cloid_b': ('△', '양족 가능'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
}

# ---------- ⑨ Tote·박스 적재 × 물류 (7.5) ----------
CELLS[('⑨', '물류', 1)] = {
    'task_short': 'DC 정형 Palletizing',
    'actions': ['MAN-01 양손 (<=15kg)', 'MAN-31 적재 패턴', 'COG-11 적재 순서'],
    'requirements': '단일 SKU, 15kg, 적재 패턴',
    'cloid_w': ('△', '15kg 페이로드 한계'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['양손 15kg 확보', '적재 패턴'],
    'benchmark': '산업R + Apollo',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium'],
}
CELLS[('⑨', '물류', 2)] = {
    'task_short': 'DC 다 SKU 박스 적재',
    'actions': ['MAN-01 다 SKU', 'COG-12 다 적재', 'PER-05 SKU 분류'],
    'requirements': '다 SKU 자율, 15kg',
    'cloid_w': ('△', '페이로드 한계'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['페이로드 향상', 'SKU 적재 자율'],
    'benchmark': 'GXO RaaS',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium', 'LG_CNS_AI'],
}
CELLS[('⑨', '물류', 3)] = {
    'task_short': 'DC 부정형 적재·랙',
    'actions': ['MAN-15 부정형', 'LOC-05 협소 (~80cm)', 'MAN-21 랙'],
    'requirements': '부정형, 협소, 랙',
    'cloid_w': ('△', '협소 cover. 부정형 적재 Skill'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['부정형 적재 Skill'],
    'benchmark': 'GXO RaaS',
    'ee_req': {'tier1': ['dex_5f', 'soft'], 'tier2': ['dex_4f'], 'tier3': ['vac']},
    'lg_assets': ['LG_Chem_Material'],
}
CELLS[('⑨', '물류', 4)] = {
    'task_short': '협소·고층 적재',
    'actions': ['LOC-06 협소', 'MAN-21 고층 (2m+)'],
    'requirements': '협소 + 도달 2m+',
    'cloid_w': ('✗', '협소 + 도달 한계'),
    'cloid_b': ('△', '발돋움 가능성'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['jaw_2f']},
    'lg_assets': [],
}

# ---------- ⑫ 점검·계측 × 조선 (7.5) - HD현대 ----------
CELLS[('⑫', '조선', 1)] = {
    'task_short': '의장 점검',
    'actions': ['NAV-05 의장 위치', 'PER-18 외관 RGB', 'COG-13 anomaly'],
    'requirements': '의장 외관·치수, RGB',
    'cloid_w': ('△', '평지 cover. IP 등급 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['IP65+', 'HD현대 협업'],
    'benchmark': 'HD현대 시제품',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LG_Innotek_Camera'],
}
CELLS[('⑫', '조선', 2)] = {
    'task_short': '블록 순회 점검 (HD현대)',
    'actions': ['NAV-06 블록 순회', 'LOC-09 경사', 'PER-18 외관', 'COG-13 anomaly'],
    'requirements': '블록 순회, 경사, IP65+',
    'cloid_w': ('✗', '경사 한계'),
    'cloid_b': ('△', '경사 cover. IP65+ 필요'),
    'dev_priority': 'High',
    'dev_items': ['IP65+', '경사 + 작업', 'HD현대 학습'],
    'benchmark': 'HD현대 (Persona AI 휴머노이드 + Spot)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': ['LG_Innotek_Camera'],
}
CELLS[('⑫', '조선', 3)] = {
    'task_short': '블록 내부 협소 점검',
    'actions': ['LOC-06 협소', 'BAL-04 자세', 'PER-19 협소 SLAM', 'SAF-02 IECEx'],
    'requirements': '협소, IECEx, 비정형',
    'cloid_w': ('✗', '협소 불가'),
    'cloid_b': ('△', '양족 협소. IECEx 미보유'),
    'dev_priority': 'High',
    'dev_items': ['IECEx', '협소 + 자세 검증'],
    'benchmark': 'HD현대',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}
CELLS[('⑫', '조선', 4)] = {
    'task_short': 'NDE 보조',
    'actions': ['MAN-32 NDE 도구', 'PER-20 NDE 데이터'],
    'requirements': 'NDE 도구, 정밀 수집',
    'cloid_w': ('✗', 'NDE 미보유'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(전문 NDE)'],
    'benchmark': 'NDE 전용',
    'ee_req': {'tier1': ['tool'], 'tier2': ['swap'], 'tier3': []},
    'lg_assets': [],
}

# ============================================================
# v1.3.1 신규 셀 (16 sub-cells, 모두 현장 확인 태그 [v1.3.1 r2])
# ============================================================

# ---------- ⑬ Insulation·환경유해 × 전자가전 (8.0) ★보고서1순위 ----------
CELLS[('⑬', '전자가전', 1)] = {
    'task_short': 'Insulation 정형 도포 (균일면)',
    'actions': ['MAN-33 단열재 도포', 'MAN-34 균일 도포', 'PER-21 도포 면적'],
    'requirements': '균일 두께 도포, 작업복+마스크+고글 환경 (피부 유해)',
    'cloid_w': ('✓', '평면 도포 cover. PFL 모드. 환경 유해 회피 가치 큼'),
    'cloid_b': ('✓', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['단열재 도포 Skill', 'LG_Chem 단열재 인터페이스', 'LGE ES 쿠킹 PoC'],
    'benchmark': 'LGE 자사 PoC (★보고서1순위)',
    'ee_req': {'tier1': ['soft', 'tool'], 'tier2': ['vac', 'jaw_2f'], 'tier3': []},
    'lg_assets': ['LG_Chem_Material', 'LG_Group_Lines'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 쿠킹 라인 - Cavity 조립 공정 Insulation 도포 (정형면)',
}
CELLS[('⑬', '전자가전', 2)] = {
    'task_short': 'Cavity 내부 단열재 (★보고서1순위 - 비산 환경)',
    'actions': ['MAN-33 다면 단열재', 'MAN-34 비균일면', 'BAL-03 굽힘', 'SAF-04 비산 환경'],
    'requirements': '다면 도포, 파우더 비산 IP65, Cavity 내부 굽힘',
    'cloid_w': ('△', 'IP65 미보유. 비산 작업 검증 필요'),
    'cloid_b': ('△', '굽힘 양족 유리. IP65 미보유'),
    'dev_priority': 'High',
    'dev_items': ['IP65 인증 (파우더 비산)', '비산 환경 검증',
                  '보호구 통합 설계 회피 (LG_Chem 소재)', 'LGE ES 쿠킹 PoC 우선'],
    'benchmark': 'LGE 자사 PoC (보고서: 작업환경 열악, 피부 문제 우려 -> 자동화 효과 가장 큼)',
    'ee_req': {'tier1': ['soft', 'tool'], 'tier2': ['vac'], 'tier3': []},
    'lg_assets': ['LG_Chem_Material', 'LG_Group_Lines'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 쿠킹 라인 - Cavity 내부 비산 환경 단열재 (★1순위)',
}
CELLS[('⑬', '전자가전', 3)] = {
    'task_short': 'Insulation + 다부품 결합',
    'actions': ['MAN-33 단열재', 'MAN-26 결선·체결 동시', 'BAL-04 자세'],
    'requirements': '단열 + 다축 결선 동시 (보고서: 가스켓 등 유연물 다수)',
    'cloid_w': ('△', '단열 + 결선 동시 어려움'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['양손 결선 + 단열 통합', '자세 안정성', '유연체 동시 처리'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['soft', 'dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': ['LG_Chem_Material'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 쿠킹 라인 - Insulation + 가스켓 등 유연물 결합 작업',
}
CELLS[('⑬', '전자가전', 4)] = {
    'task_short': '협소 Cavity 내부 한정',
    'actions': ['LOC-06 협소', 'MAN-33 비산 + 단열'],
    'requirements': '협소 + 비산 동시',
    'cloid_w': ('✗', '협소 + 비산 모두 한계'),
    'cloid_b': ('△', '양족 협소 일부'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['soft'], 'tier2': ['dex_5f'], 'tier3': []},
    'lg_assets': [],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 쿠킹 라인 - 협소 Cavity 내부 한계 영역 (관찰 범위)',
}

# ---------- ⑫ 점검·계측 × 전자가전 (8.0) ★보고서2순위 ----------
CELLS[('⑫', '전자가전', 1)] = {
    'task_short': '부품 정형 육안 검사',
    'actions': ['PER-18 외관 RGB', 'COG-13 anomaly'],
    'requirements': '정형 부품, 처리량',
    'cloid_w': ('✓', '평지 + 비전 cover. LGE 자사 즉시 진입'),
    'cloid_b': ('✓', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['처리량', 'LG_Innotek 통합'],
    'benchmark': 'LGE 자사 PoC (★보고서2순위 - 즉시 적용 가능)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['jaw_2f'], 'tier3': []},
    'lg_assets': ['LG_Innotek_Camera', 'LG_Group_Lines'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 부품 포장 라인 - 부품 육안 검사 (정형)',
}
CELLS[('⑫', '전자가전', 2)] = {
    'task_short': '다종 부품 육안 검사 (★보고서2순위 - 즉시 적용 가능)',
    'actions': ['PER-18 다종 부품', 'COG-13 anomaly', 'NAV-01 라인 사이드'],
    'requirements': '다종 SKU 분류, 비전 + DL (보고서: 비전+DL 자동화 일부 영역 있음)',
    'cloid_w': ('✓', 'VLA + LG_Innotek cover. LGE 자사 학습 즉시 진입'),
    'cloid_b': ('△', '동일하나 휠 대비 효율 낮음'),
    'dev_priority': 'High',
    'dev_items': ['LGE ES 자사 라인 비전 학습', 'VLA + LG_Innotek 통합', 'takt 적합성'],
    'benchmark': 'LGE 자사 PoC (★ 보고서 우선순위 2위)',
    'ee_req': {'tier1': ['tool'], 'tier2': ['jaw_2f'], 'tier3': []},
    'lg_assets': ['LG_Innotek_Camera', 'LG_Group_Lines', 'LG_CNS_AI'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 부품 포장 라인 - 다종 부품 육안 검사 (★2순위 즉시 적용)',
}
CELLS[('⑫', '전자가전', 3)] = {
    'task_short': '다 위치 라인 사이드 검사',
    'actions': ['NAV-02 다 위치 순회', 'PER-18 외관', 'COG-13 다 SKU'],
    'requirements': '다 위치 자율, 1시간+ (보고서: 헬륨 누설 검사 등 검사 Point 다수)',
    'cloid_w': ('△', '다 위치 cover. 1시간+ 검증'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['연속 운영 안정성', 'LG_Energy_Solution 8h'],
    'benchmark': 'LGE 자사 PoC',
    'ee_req': {'tier1': ['tool'], 'tier2': ['jaw_2f'], 'tier3': []},
    'lg_assets': ['LG_Innotek_Camera', 'LG_Energy_Solution'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 다 위치 검사 - 헬륨 누설 검사 등 다수 Point 순회',
}
CELLS[('⑫', '전자가전', 4)] = {
    'task_short': '미세 결함 sub-mm 한정',
    'actions': ['PER-08 sub-mm 정렬'],
    'requirements': 'sub-mm (보고서: 한 Point 체류 < 1초 누수 검사 - 사람 영역 유지)',
    'cloid_w': ('✗', 'sub-mm + 1초 미만 한계'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(전용 검사 - 보고서: 사람 대응 권장)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['tool'], 'tier2': [], 'tier3': []},
    'lg_assets': [],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 실외기 라인 - 누수 검사 1초 미만 cycle (사람 영역 유지)',
}

# ---------- ⑧ Tote × 전자가전 (7.7) ★보고서3순위 ----------
CELLS[('⑧', '전자가전', 1)] = {
    'task_short': '부품 컨베이어 단순 이재 (LGE ES 포장)',
    'actions': ['LOC-01 평지', 'MAN-01 양손 부품', 'NAV-01 라인 사이드 SLAM'],
    'requirements': '평지 양손 운반, takt',
    'cloid_w': ('✓', '평지 양손 + SLAM cover. 베어로보틱스'),
    'cloid_b': ('△', '보행 한계'),
    'dev_priority': 'Mid',
    'dev_items': ['Takt 동기화', '컨베이어 인터페이스 학습'],
    'benchmark': 'LGE 자사 PoC (보고서 ★3순위)',
    'ee_req': {'tier1': ['hook', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': ['vac']},
    'lg_assets': ['Bear_Robotics', 'LG_Group_Lines'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 부품 포장 라인 - 부품 컨베이어 단순 이재',
}
CELLS[('⑧', '전자가전', 2)] = {
    'task_short': '컴프 관 컨베이어 이재 (★보고서3순위 - 컨베이어 측만)',
    'actions': ['MAN-01 양손 컴프 관', 'MAN-04 트롤리->컨베이어', 'PER-01 위치'],
    'requirements': '컴프 관 양손 운반, 컨베이어 측 정형 (★보고서: 트롤리 측 위치 가변 -> 사람 유지)',
    'cloid_w': ('△', '컨베이어 측 cover. 트롤리 측 위치 가변 -> 사람 협업'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'High',
    'dev_items': ['컴프 관 양손 검증 (중량)', '컨베이어 위치 학습',
                  '트롤리 측 사람-Humanoid 협업 (인력 2~3명 -> 1명 + Humanoid)'],
    'benchmark': 'LGE 자사 PoC (★ 보고서: 트롤리 최난이도, 컨베이어 측 검토 가능)',
    'ee_req': {'tier1': ['jaw_2f', 'dex_4f'], 'tier2': ['dex_5f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['Bear_Robotics', 'LG_Group_Lines'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 부품 포장 라인 - 컴프 관 컨베이어 이재 (★3순위 컨베이어 측)',
}
CELLS[('⑧', '전자가전', 3)] = {
    'task_short': '트롤리 위치 가변 환경 (보고서: 현장 최난이도 - 사람 영역)',
    'actions': ['MAN-04 위치 가변 추적', 'PER-22 동적 위치'],
    'requirements': '트롤리 흔들림·위치 가변 (★보고서 명시 최난이도, 인력 2~3명)',
    'cloid_w': ('✗', '위치 가변 추적 한계'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(★ 보고서: 사람 영역 유지 권장)'],
    'benchmark': '양산 사례 부재 (보고서: 사람 영역)',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': ['jaw_2f']},
    'lg_assets': [],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 부품 포장 라인 - 컴프 관 트롤리 걸기 (현장 최난이도, 사람 영역)',
}
CELLS[('⑧', '전자가전', 4)] = {
    'task_short': '협소 LGE ES 라인 한정',
    'actions': ['LOC-06 협소'],
    'requirements': '협소 라인',
    'cloid_w': ('✗', '협소 불가'),
    'cloid_b': ('△', '양족 일부'),
    'dev_priority': 'Low',
    'dev_items': ['(시장 small)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 부품 포장 라인 - 협소 영역 한계 (관찰 범위)',
}

# ---------- ② Kitting × 전자가전 (7.5) ★보고서4순위 ----------
CELLS[('②', '전자가전', 1)] = {
    'task_short': '부품 단일 적재 (LGE ES 포장)',
    'actions': ['MAN-02 단일 SKU', 'MAN-03 정위치', 'PER-04 BOM'],
    'requirements': '단일 부품 정위치 적재',
    'cloid_w': ('✓', '단일 SKU 정위치 cover'),
    'cloid_b': ('✓', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['처리량 최적화'],
    'benchmark': 'LGE 자사 PoC (보고서 ★4순위 - Pick & Place)',
    'ee_req': {'tier1': ['vac', 'jaw_2f'], 'tier2': ['dex_5f', 'dex_4f', 'dex_3f'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 부품 포장 라인 - 부품 단일 적재 Pick & Place',
}
CELLS[('②', '전자가전', 2)] = {
    'task_short': '케이스 Zig 안착 (★보고서4순위)',
    'actions': ['MAN-02 부품 픽', 'MAN-03 Zig 정위치', 'MAN-09 정밀 토크'],
    'requirements': 'Zig 1mm, 토크 (보고서: 사람 대응, Pick & Place 검토 가능)',
    'cloid_w': ('△', 'Zig 안착 cover. 1mm 검증 필요'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['Zig 라이브러리 (LGE 자사)', '정밀도 검증', 'LGE ES 자사 PoC'],
    'benchmark': 'LGE 자사 PoC (★ 보고서 4순위)',
    'ee_req': {'tier1': ['jaw_2f', 'dex_4f'], 'tier2': ['vac', 'dex_5f'], 'tier3': ['dex_3f']},
    'lg_assets': ['LGE_Axium', 'LG_Group_Lines'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 부품 포장 라인 - 케이스 Zig 안착 (★4순위)',
}
CELLS[('②', '전자가전', 3)] = {
    'task_short': '다 SKU 케이스 Zig + 다 라인',
    'actions': ['MAN-02 다 SKU', 'MAN-03 Zig 안착', 'NAV-02 다 라인'],
    'requirements': '다 SKU, 다 라인',
    'cloid_w': ('△', 'VLA cover. 정확도 검증'),
    'cloid_b': ('△', '동일'),
    'dev_priority': 'Mid',
    'dev_items': ['VLA >=99%', 'LG_CNS_AI 학습'],
    'benchmark': 'LGE 자사 PoC',
    'ee_req': {'tier1': ['dex_5f', 'dex_4f', 'jaw_2f'], 'tier2': ['vac', 'dex_3f'], 'tier3': []},
    'lg_assets': ['LGE_Axium', 'LG_CNS_AI', 'LG_Group_Lines'],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 부품 포장 라인 - 다 SKU 케이스 Zig (확장 시나리오)',
}
CELLS[('②', '전자가전', 4)] = {
    'task_short': '미세 정밀 한정',
    'actions': ['MAN-25 내부 정밀'],
    'requirements': '내부 0.5mm (보고서: 공차 이슈 사람 대응)',
    'cloid_w': ('✗', '정밀도 한계'),
    'cloid_b': ('✗', '동일'),
    'dev_priority': 'Low',
    'dev_items': ['(전용 자동화)'],
    'benchmark': '양산 사례 부재',
    'ee_req': {'tier1': ['dex_5f'], 'tier2': ['dex_4f'], 'tier3': []},
    'lg_assets': [],
    'field_verified': True,
    'field_verified_source': FIELD_VERIFIED_SOURCE,
    'field_verified_line': 'A2동 - 공차 민감 영역 (보고서: 사람 영역 유지)',
}

# ============================================================
# 7. 클러스터 (v1.3 6개 + v1.3.1 7번 신규)
# ============================================================
CLUSTERS = [
    {'id': 1, 'name': 'Tool-swap 인터페이스 표준화',
     'description': 'AEON Hexagon식 자동 그리퍼 교체 + Hook 옵션',
     'dev_type': 'D', 'time': '6~12개월', 'priority': '★ 우선 검토',
     'lg_angle': 'LG 자체 swap 표준 -> Digit V6·AEON 흐름',
     'covers_cells': ['⑧/물류', '⑧/자동차BCG', '⑤/전자가전', '⑪/조선'],
     'field_verified': False},
    {'id': 2, 'name': 'Hook End-Effector 자체/협업',
     'description': 'Tote 영역 효율 (Digit Hook tier1)',
     'dev_type': 'D', 'time': '1~2개월 (자체 설계)', 'priority': '단기 진입',
     'lg_angle': '자체 hook 또는 Digit 협업 - Bear Robotics 베이스',
     'covers_cells': ['⑧/물류', '⑧/자동차BCG', '⑧/전자가전'],
     'field_verified': False},
    {'id': 3, 'name': '정밀도 향상 (1mm -> 0.5mm)',
     'description': '손바닥 카메라 + tactile, F/T 정밀화',
     'dev_type': 'B', 'time': '12~18개월', 'priority': '중기 추진',
     'lg_angle': 'LG이노텍 카메라 + LG화학 tactile',
     'covers_cells': ['⑥/배터리', '⑥/전자가전', '⑤/전자가전', '②/전자가전'],
     'field_verified': False},
    {'id': 4, 'name': '인증 취득 (IECEx, IP65+)',
     'description': '조선·배터리·쿠킹 진입 필수',
     'dev_type': 'C', 'time': '18~24개월', 'priority': '★ 우선 검토',
     'lg_angle': 'HD현대 협업 + 한국 인증. v1.3.1: 쿠킹 IP65 추가',
     'covers_cells': ['⑪/조선', '⑫/조선', '⑦/조선', '⑬/전자가전'],
     'field_verified': False},
    {'id': 5, 'name': '처리량·24/7 운영',
     'description': '배터리 스왑/도킹, line cycle 최적화',
     'dev_type': 'B', 'time': '12~18개월', 'priority': '중기 추진',
     'lg_angle': 'LG에너지 4h -> 8h + LG CNS 작업 큐',
     'covers_cells': ['⑧/물류', '⑧/자동차BCG', '②/물류', '⑩/물류', '⑫/전자가전'],
     'field_verified': False},
    {'id': 6, 'name': 'LG 그룹 라인 데이터 + VLA 학습',
     'description': '자사 양산 라인 데이터 직접 수집',
     'dev_type': 'D', 'time': '6~12개월', 'priority': '단기 진입',
     'lg_angle': 'LGE 가전·디스플레이·에너지·화학 라인 자사 PoC',
     'covers_cells': ['⑤/전자가전', '⑥/전자가전', '⑥/배터리', '⑫/전자가전', '②/전자가전'],
     'field_verified': False},
    {'id': 7, 'name': 'LGE 자사 ES 라인 우선 검증 (v1.3.1 신규, 현장 확인)',
     'description': 'ES사업부 A2동 4종 우선 검토 - 환경 유해·자사 라인 데이터 직접 학습 (현장 보고서 2026-05-10)',
     'dev_type': 'D', 'time': '6~12개월', 'priority': '★ 우선 검토',
     'lg_angle': '자사 라인 데이터 직접 학습 + 환경 유해 영역 회피 (Insulation 피부 유해, 비산 환경). LG·BCG 합동 현장 검증 완료',
     'covers_cells': ['⑬/전자가전', '⑫/전자가전', '⑧/전자가전', '②/전자가전'],
     'field_verified': True,
     'field_verified_source': FIELD_VERIFIED_SOURCE},
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
    field_verified = 0
    for key, cell in CELLS.items():
        cloid_w_cover[cell['cloid_w'][0]] += 1
        cloid_b_cover[cell['cloid_b'][0]] += 1
        if cell['dev_priority'] == 'High':
            high_priority += 1
        if cell.get('lg_assets'):
            cells_with_lg_assets += 1
        if cell.get('field_verified'):
            field_verified += 1
    return {
        'total': total,
        'cloid_w': cloid_w_cover,
        'cloid_b': cloid_b_cover,
        'high_priority_count': high_priority,
        'lg_asset_coverage': cells_with_lg_assets,
        'lg_asset_ratio': f"{cells_with_lg_assets * 100 // total}%",
        'field_verified': field_verified,
        'field_verified_ratio': f"{field_verified * 100 // total}%",
    }


def stats_ee():
    w_options = {ee for ee, has in CLOID_W_SPEC['ee_options'].items() if has is True}
    b_options = {ee for ee, has in CLOID_B_SPEC['ee_options'].items() if has is True}
    ee_w = {'cover': 0, 'partial': 0, 'gap': 0}
    ee_b = {'cover': 0, 'partial': 0, 'gap': 0}
    for cell in CELLS.values():
        ee_req = cell.get('ee_req', {})
        t1, t2 = set(ee_req.get('tier1', [])), set(ee_req.get('tier2', []))
        if t1 & w_options:    ee_w['cover'] += 1
        elif t2 & w_options:  ee_w['partial'] += 1
        else:                 ee_w['gap'] += 1
        if t1 & b_options:    ee_b['cover'] += 1
        elif t2 & b_options:  ee_b['partial'] += 1
        else:                 ee_b['gap'] += 1
    return {'ee_w': ee_w, 'ee_b': ee_b}


def list_field_verified():
    """현장 확인 sub-cells 목록 반환 (UI 필터·배지용)"""
    return [
        {'task': k[0], 'industry': k[1], 'lv': k[2],
         'task_short': v['task_short'],
         'line': v.get('field_verified_line', ''),
         'source': v.get('field_verified_source', '')}
        for k, v in CELLS.items() if v.get('field_verified')
    ]


if __name__ == '__main__':
    s = stats()
    e = stats_ee()
    print(f'Total sub-cells: {s["total"]} (v1.3 52 + v1.3.1 16 신규)')
    print(f'CLOiD W: cover {s["cloid_w"]["✓"]} / partial {s["cloid_w"]["△"]} / 개발필요 {s["cloid_w"]["✗"]}')
    print(f'CLOiD B: cover {s["cloid_b"]["✓"]} / partial {s["cloid_b"]["△"]} / 개발필요 {s["cloid_b"]["✗"]}')
    print(f'EE W: cover {e["ee_w"]["cover"]} / partial {e["ee_w"]["partial"]} / gap {e["ee_w"]["gap"]}')
    print(f'EE B: cover {e["ee_b"]["cover"]} / partial {e["ee_b"]["partial"]} / gap {e["ee_b"]["gap"]}')
    print(f'High priority: {s["high_priority_count"]}')
    print(f'LG 자산 매핑: {s["lg_asset_coverage"]}/{s["total"]} ({s["lg_asset_ratio"]})')
    print(f'★ 현장 확인 sub-cells: {s["field_verified"]}/{s["total"]} ({s["field_verified_ratio"]}) - LG·BCG 2026-05-10')
    print(f'Total cells: {len(CELL_ORDER)}, Clusters: {len(CLUSTERS)}')
