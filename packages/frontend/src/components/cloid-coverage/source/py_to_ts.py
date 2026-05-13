"""
Convert cloid_gap_data_v13.py → TypeScript data file for the cloid-coverage page.
Imports the Python module and serializes its dicts as TS literals.
"""
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cloid_gap_data_v13 as d

OUT = '/workspaces/Robot-Competitive-Intelligence-Portal/packages/frontend/src/components/cloid-coverage/data-v13.ts'

# Map cell number → matrix taskIdx (12 tasks); user's matrix uses 0-indexed
CELL_TO_TASK = {
    '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4, '⑥': 5,
    '⑦': 6, '⑧': 7, '⑨': 8, '⑩': 9, '⑪': 10, '⑫': 11,
    '⑬': 12,  # v1.3.1: Insulation·환경유해
}
# Python 원본 데이터는 옛 라벨('자동차BCG'/'자동차LG')로 키가 박혀 있어
# 매핑 시에는 그대로 사용하고, 출력 단계에서만 신규 라벨로 rename.
SECTOR_RENAME = {
    '자동차BCG': '자동차',
    '자동차LG': '자동차 부품(전장)',
}
def rename_sector(s):
    return SECTOR_RENAME.get(s, s)

SECTOR_TO_IDX = {
    '자동차BCG': 0, '자동차LG': 1, '배터리': 2, '물류': 3, '전자가전': 4,
    '반도체': 5, '조선': 6, '제약': 7, '식품': 8, '화학': 9, '의류': 10, 'Frontier': 11,
}

# Per-cell URL slug (matches existing data.ts ids for cross-link compatibility)
CELL_ID = {
    ('⑧', '물류'): 'tote-logistics',
    ('②', '물류'): 'kitting-logistics',
    ('⑥', '배터리'): 'connector-battery',
    ('⑩', '물류'): 'box-closing-logistics',
    ('⑪', '조선'): 'welding-shipbuilding',
    ('①', '물류'): 'binpicking-logistics',
    ('⑤', '전자가전'): 'screw-electronics',
    ('⑥', '전자가전'): 'connector-electronics',
    ('⑦', '배터리'): 'cable-battery',
    ('⑦', '조선'): 'cable-shipbuilding',
    ('⑧', '자동차BCG'): 'tote-automotive-bcg',
    ('⑨', '물류'): 'palletize-logistics',
    ('⑫', '조선'): 'inspection-shipbuilding',
    # v1.3.1 r2 신규 (LG·BCG 합동 ES사업부 A2동 2026-05-10)
    ('⑬', '전자가전'): 'insulation-electronics',
    ('⑫', '전자가전'): 'inspection-electronics',
    ('⑧', '전자가전'): 'tote-electronics',
    ('②', '전자가전'): 'kitting-electronics',
}
# Score는 데이터 모듈의 CELL_ORDER에서 직접 차용 (v1.3.1 r2 추가 4셀 포함)
CELL_SCORE = {(cell, sector): score for cell, sector, score in d.CELL_ORDER}


def js(v):
    """JSON-encode a value (TS-compatible since TS reads JSON literals).
    Python source still uses 옛 sector labels ('자동차BCG'/'자동차LG') as dict keys;
    rename to new labels at serialization time so downstream TS sees only neue 라벨.
    """
    s = json.dumps(v, ensure_ascii=False)
    for old, new in SECTOR_RENAME.items():
        s = s.replace(old, new)
    return s


def build_cells_ts():
    """Group sub-cells by (cellNum, sector) and emit a TS array."""
    grouped = {}
    for (cellNum, sector, lv), sub in d.CELLS.items():
        key = (cellNum, sector)
        grouped.setdefault(key, {})[lv] = sub

    cell_objs = []
    for (cellNum, sector), levels in grouped.items():
        cid = CELL_ID.get((cellNum, sector))
        if not cid:
            continue
        score = CELL_SCORE.get((cellNum, sector), 7.5)
        sub_cells = []
        for lv in sorted(levels.keys()):
            s = levels[lv]
            sub_cells.append({
                'lv': lv,
                # Python source uses task_short / actions / requirements
                'taskName': s.get('task_short') or s.get('task') or '',
                'coreActions': s.get('actions') or s.get('core_actions') or [],
                'thresholds': s.get('requirements') or s.get('thresholds') or '',
                'cloidW': {
                    'verdict': {'✓': 'cover', '△': 'partial', '✗': 'gap'}[s['cloid_w'][0]],
                    'note': s['cloid_w'][1] if len(s['cloid_w']) > 1 else '',
                },
                'cloidB': {
                    'verdict': {'✓': 'cover', '△': 'partial', '✗': 'gap'}[s['cloid_b'][0]],
                    'note': s['cloid_b'][1] if len(s['cloid_b']) > 1 else '',
                },
                'priority': s.get('dev_priority', 'Low'),
                'devType': s.get('dev_type', ''),
                'benchmark': s.get('benchmark', ''),
                'devItems': s.get('dev_items', []),
                'eeReq': s.get('ee_req', {}),
                'lgAssets': s.get('lg_assets', []),
                'koreaPartners': s.get('korea_partners', []),
                # v1.3.1 r2 신규 — 현장 확인 (LG·BCG 합동 ES사업부 A2동 2026-05-10)
                'fieldVerified': s.get('field_verified', False),
                'fieldVerifiedSource': s.get('field_verified_source', ''),
                'fieldVerifiedLine': s.get('field_verified_line', ''),
            })
        cell_objs.append({
            'id': cid,
            'cellNum': cellNum,
            'taskName': d.TASK_NAMES.get(cellNum, ''),
            'sectorName': sector,
            'taskIdx': CELL_TO_TASK[cellNum],
            'sectorIdx': SECTOR_TO_IDX[sector],
            'score': score,
            'oneLineInsight': '',  # filled by hand later
            'subCells': sub_cells,
        })
    # Sort by score descending
    cell_objs.sort(key=lambda c: -c['score'])
    return cell_objs


cells = build_cells_ts()

ts_header = '''// Auto-generated from cloid_gap_data_v13.py (v1.3.1 r2).
// Do NOT edit by hand — regenerate via py_to_ts.py.
//
// 17 cells × 4 Lv = 68 sub-cells (v1.3 52 + v1.3.1 신규 16) + 7 dev clusters
// + LG 자산 + 한국 협업 + 9 EE categories.
// v1.3.1 r2: ★ 현장 확인 16 sub-cells (LG·BCG 합동 ES사업부 A2동 2026-05-10)

export type Verdict = 'cover' | 'partial' | 'gap';
export type Priority = 'High' | 'Mid' | 'Low';
export type DevType = 'A' | 'B' | 'C' | 'D' | '';

export interface SubCellAssessment { verdict: Verdict; note: string; }
export interface SubCellV13 {
  lv: 1 | 2 | 3 | 4;
  taskName: string;
  coreActions: string[];
  thresholds: string;
  cloidW: SubCellAssessment;
  cloidB: SubCellAssessment;
  priority: Priority;
  devType: DevType;
  benchmark: string;
  devItems: string[];
  eeReq: { tier1?: string[]; tier2?: string[]; tier3?: string[] };
  lgAssets: string[];
  koreaPartners: string[];
  // v1.3.1 r2 — 현장 확인 (LG·BCG 합동 ES사업부 A2동 2026-05-10)
  fieldVerified?: boolean;
  fieldVerifiedSource?: string;
  fieldVerifiedLine?: string;
}
export interface CloidCoverageCellV13 {
  id: string;
  cellNum: string;
  taskName: string;
  sectorName: string;
  taskIdx: number;
  sectorIdx: number;
  score: number;
  oneLineInsight: string;
  subCells: SubCellV13[];
}

export interface EndEffectorCategory {
  kr: string;
  en: string;
  dof: string;
  examples: string;
}

export interface LgAsset {
  category: string;
  covers: string[];
  rationale: string;
  reliability: string;
  note?: string;
}

export interface KoreaPartner {
  category: string;
  covers?: string[];
  covers_ee?: string[];
  covers_cells?: [string, string][];
  status: string;
  rationale: string;
  reliability: string;
}

// CLUSTERS in v1.3 have varied fields per cluster — keep it loose.
export type DevCluster = Record<string, unknown>;

'''

# CLOID_SPECS — flatten dict-of-dicts to a row list per model
def spec_rows(spec):
    rows = []
    for cat_key, cat_val in spec.items():
        if cat_key == 'ee_options':
            continue
        if isinstance(cat_val, dict):
            for k, v in cat_val.items():
                rows.append([cat_key, k, str(v) if not isinstance(v, bool) else ('✅' if v else '❌')])
        else:
            rows.append([cat_key, '', str(cat_val)])
    return rows


cloid_specs_v13 = {
    'W': {
        'label': 'CLOiD W (휠형 양팔 Mobile Manipulator) — v1.3',
        'spec': d.CLOID_W_SPEC,
        'rows': spec_rows(d.CLOID_W_SPEC),
    },
    'B': {
        'label': 'CLOiD B (양족 양팔 Biped Humanoid) — v1.3',
        'spec': d.CLOID_B_SPEC,
        'rows': spec_rows(d.CLOID_B_SPEC),
    },
}

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(ts_header)
    f.write(f'export const CELLS_V13: CloidCoverageCellV13[] = {js(cells)};\n\n')
    f.write(f'export const CLOID_SPECS_V13 = {js(cloid_specs_v13)} as const;\n\n')
    f.write(f'export const END_EFFECTOR_CATEGORIES: Record<string, EndEffectorCategory> = {js(d.END_EFFECTOR_CATEGORIES)};\n\n')
    f.write(f'export const TERM_MAPPING: Record<string, string> = {js(d.TERM_MAPPING)};\n\n')
    f.write(f'export const LG_ASSETS: Record<string, LgAsset> = {js(d.LG_ASSETS)};\n\n')
    f.write(f'export const KOREA_PARTNERS: Record<string, KoreaPartner> = {js(d.KOREA_PARTNERS)};\n\n')
    f.write(f'export const TASK_NAMES: Record<string, string> = {js(d.TASK_NAMES)};\n\n')
    f.write(f'export const CLUSTERS_V13: DevCluster[] = {js(d.CLUSTERS)};\n\n')
    f.write(f'''export const GAP_DEFINITION = {js(d.GAP_DEFINITION)} as const;
export const DEV_TYPES = {js(d.DEV_TYPES)} as const;

export const VERDICT_LABEL: Record<Verdict, {{ ko: string; emoji: string; color: string; bg: string }}> = {{
  cover:   {{ ko: 'Cover',     emoji: '✅', color: '#1a7a3a', bg: '#E6F4EA' }},
  partial: {{ ko: 'Partial',   emoji: '⚠️', color: '#9a6500', bg: '#FFF4D6' }},
  // Lv 단위 verdict — 작업 항목('개발 필요 N건')과 충돌 회피 위해 '신규 개발'.
  gap:     {{ ko: '신규 개발', emoji: '❌', color: '#a01020', bg: '#FBEAF0' }},
}};

// End-Effector 비용·복잡도 — 임원 보고에서 "주력 N"이 비싼 5지손인지 저가 jaw인지 즉시 보이도록.
export const EE_COST_TIER: Record<string, {{
  cost: '$' | '$$' | '$$$';
  costLabel: string;
  complexity: 'low' | 'mid' | 'high';
  note: string;
}}> = {{
  jaw_2f:  {{ cost: '$',   costLabel: '저가', complexity: 'low',  note: '산업R 50년 표준 · 대부분 단순 픽업·이재 충분' }},
  vac:     {{ cost: '$',   costLabel: '저가', complexity: 'low',  note: '박스·평면 SKU 픽 표준' }},
  hook:    {{ cost: '$',   costLabel: '저가', complexity: 'low',  note: 'Tote 전용 (Digit @ GXO 양산 검증)' }},
  tool:    {{ cost: '$',   costLabel: '저가', complexity: 'low',  note: '드라이버·토치 등 도구 마운트 — 도구 자체 비용 별도' }},
  dex_3f:  {{ cost: '$$',  costLabel: '중가', complexity: 'mid',  note: '6~7 DoF · 산업R + 일부 휴머노이드' }},
  dex_4f:  {{ cost: '$$$', costLabel: '고가', complexity: 'high', note: '11 DoF · Apptronik Apollo 급' }},
  dex_5f:  {{ cost: '$$$', costLabel: '고가', complexity: 'high', note: '11~22 DoF · Tesla/Figure/Xiaomi 급 정밀 손' }},
  soft:    {{ cost: '$$',  costLabel: '중가', complexity: 'mid',  note: '비정형 SKU 전용 (의류·잡화)' }},
  swap:    {{ cost: '$$',  costLabel: '중가', complexity: 'mid',  note: '자동 그리퍼 교체 시스템' }},
}};

export const PRIORITY_LABEL: Record<Priority, {{ color: string; bg: string }}> = {{
  High: {{ color: '#a01020', bg: '#FBEAF0' }},
  Mid:  {{ color: '#9a6500', bg: '#FFF4D6' }},
  Low:  {{ color: '#5F5E5A', bg: '#F0EEE8' }},
}};

// ─────────────────────────────────────────────────────────────────
// 작업 종류 × 공정 복잡도 분류 (2축 매트릭스용)
// ─────────────────────────────────────────────────────────────────

export type TaskCategory = '단순 이재' | '정밀 조작' | '도구 운용';

// cellNum (①~⑬) 기준 작업 종류 매핑.
// - 단순 이재: Tote/Bin/박스/Kitting 등 픽·이재 위주 — 그리퍼로 충분
// - 정밀 조작: 커넥터·케이블·FPC 등 정밀 삽입·라우팅 — 다지 핸드 필수
// - 도구 운용: 용접·도장·점검·나사·Insulation — 토치·드라이버·도포기 등 도구 마운트(tool)
export const TASK_CATEGORY: Record<string, TaskCategory> = {{
  '①': '단순 이재',  // Bin Picking
  '②': '단순 이재',  // Kitting
  '⑤': '도구 운용',  // 나사 체결
  '⑥': '정밀 조작',  // 커넥터 체결
  '⑦': '정밀 조작',  // 케이블 라우팅
  '⑧': '단순 이재',  // Tote 이송
  '⑨': '단순 이재',  // Tote·박스 적재
  '⑩': '단순 이재',  // 박스 마감
  '⑪': '도구 운용',  // 용접·도장
  '⑫': '도구 운용',  // 점검·계측
  '⑬': '도구 운용',  // Insulation·환경유해 (v1.3.1 신규)
}};

export function getTaskCategory(cellNum: string): TaskCategory | undefined {{
  return TASK_CATEGORY[cellNum];
}}

export type ComplexityBucket = 'Lv1~2' | 'Lv3~4';
export function getComplexityBucket(lv: number): ComplexityBucket {{
  return lv <= 2 ? 'Lv1~2' : 'Lv3~4';
}}

export interface TaskMatrixEntry {{
  cellId: string;
  cellNum: string;
  taskName: string;
  sectorName: string;
  lv: 1 | 2 | 3 | 4;
  subTaskName: string; // sub-cell의 task_short
  category: TaskCategory;
  bucket: ComplexityBucket;
  fieldVerified?: boolean;
  fieldVerifiedLine?: string;
}}

// 68 sub-cell 전체를 (category, bucket)로 분류한 평탄화 리스트.
export function buildTaskMatrixEntries(): TaskMatrixEntry[] {{
  const out: TaskMatrixEntry[] = [];
  for (const cell of CELLS_V13) {{
    const cat = getTaskCategory(cell.cellNum);
    if (!cat) continue;
    for (const sc of cell.subCells) {{
      out.push({{
        cellId: cell.id,
        cellNum: cell.cellNum,
        taskName: cell.taskName,
        sectorName: cell.sectorName,
        lv: sc.lv,
        subTaskName: sc.taskName,
        category: cat,
        bucket: getComplexityBucket(sc.lv),
        fieldVerified: sc.fieldVerified,
        fieldVerifiedLine: sc.fieldVerifiedLine,
      }});
    }}
  }}
  return out;
}}

export function findCellV13(id: string): CloidCoverageCellV13 | undefined {{
  return CELLS_V13.find(c => c.id === id);
}}

// v1.3.1 r2 — '현장 확인' 헬퍼들
export function cellHasFieldVerified(cell: CloidCoverageCellV13): boolean {{
  return cell.subCells.some(sc => !!sc.fieldVerified);
}}

export const FIELD_VERIFIED_META = {{
  badgeLabel: '현장 확인',
  defaultSource: 'LG·BCG 합동 ES사업부 A2동 방문 2026-05-10',
}} as const;

export function getStatsV13() {{
  let cw = {{ cover: 0, partial: 0, gap: 0 }};
  let cb = {{ cover: 0, partial: 0, gap: 0 }};
  let highCount = 0;
  let cellsWithLgAssets = 0;
  let totalSubcells = 0;
  let verifiedSubcells = 0;
  for (const cell of CELLS_V13) {{
    let hasLg = false;
    for (const sc of cell.subCells) {{
      totalSubcells++;
      cw[sc.cloidW.verdict]++;
      cb[sc.cloidB.verdict]++;
      if (sc.priority === 'High') highCount++;
      if (sc.lgAssets && sc.lgAssets.length > 0) hasLg = true;
      if (sc.fieldVerified) verifiedSubcells++;
    }}
    if (hasLg) cellsWithLgAssets++;
  }}
  return {{
    totalSubcells,
    cw, cb,
    highCount,
    cellsWithLgAssets,
    lgAssetRatio: Math.round(cellsWithLgAssets * 100 / CELLS_V13.length) + '%',
    verifiedSubcells,
    verifiedRatio: Math.round(verifiedSubcells * 100 / Math.max(totalSubcells, 1)) + '%',
  }};
}}
''')

print(f'Wrote {OUT}')
print(f'Cells: {len(cells)}')
print(f'Total sub-cells: {sum(len(c["subCells"]) for c in cells)}')
verified_count = sum(1 for c in cells for sc in c['subCells'] if sc.get('fieldVerified'))
print(f'Field-verified sub-cells: {verified_count}')
print(f'LG_ASSETS: {len(d.LG_ASSETS)}')
print(f'KOREA_PARTNERS: {len(d.KOREA_PARTNERS)}')
print(f'CLUSTERS: {len(d.CLUSTERS)}')
print(f'EE categories: {len(d.END_EFFECTOR_CATEGORIES)}')
