"""
Convert cloid_gap_data_v13.py → TypeScript data file for the cloid-coverage page.
Imports the Python module and serializes its dicts as TS literals.
"""
import json
import sys
import os
sys.path.insert(0, '/tmp/cloid-import')
import cloid_gap_data_v13 as d

OUT = '/workspaces/Robot-Competitive-Intelligence-Portal/packages/frontend/src/components/cloid-coverage/data-v13.ts'

# Map cell number → matrix taskIdx (12 tasks); user's matrix uses 0-indexed
CELL_TO_TASK = {
    '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4, '⑥': 5,
    '⑦': 6, '⑧': 7, '⑨': 8, '⑩': 9, '⑪': 10, '⑫': 11,
}
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
}
CELL_SCORE = {
    ('⑧', '물류'): 9.2,
    ('②', '물류'): 8.3,
    ('⑥', '배터리'): 8.3,
    ('⑩', '물류'): 8.3,
    ('⑪', '조선'): 8.3,
    ('①', '물류'): 7.5,
    ('⑤', '전자가전'): 7.5,
    ('⑥', '전자가전'): 7.5,
    ('⑦', '배터리'): 7.5,
    ('⑦', '조선'): 7.5,
    ('⑧', '자동차BCG'): 7.5,
    ('⑨', '물류'): 7.5,
    ('⑫', '조선'): 7.5,
}


def js(v):
    """JSON-encode a value (TS-compatible since TS reads JSON literals)."""
    return json.dumps(v, ensure_ascii=False)


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

ts_header = '''// Auto-generated from cloid_gap_data_v13.py (Phase 4 import).
// Do NOT edit by hand — regenerate via py_to_ts.py.
//
// 52 sub-cells + 7 LG 자산 + 5 한국 협업 + 6 dev clusters + 9 EE categories.

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

export const PRIORITY_LABEL: Record<Priority, {{ color: string; bg: string }}> = {{
  High: {{ color: '#a01020', bg: '#FBEAF0' }},
  Mid:  {{ color: '#9a6500', bg: '#FFF4D6' }},
  Low:  {{ color: '#5F5E5A', bg: '#F0EEE8' }},
}};

export function findCellV13(id: string): CloidCoverageCellV13 | undefined {{
  return CELLS_V13.find(c => c.id === id);
}}

export function getStatsV13() {{
  let cw = {{ cover: 0, partial: 0, gap: 0 }};
  let cb = {{ cover: 0, partial: 0, gap: 0 }};
  let highCount = 0;
  let cellsWithLgAssets = 0;
  let totalSubcells = 0;
  for (const cell of CELLS_V13) {{
    let hasLg = false;
    for (const sc of cell.subCells) {{
      totalSubcells++;
      cw[sc.cloidW.verdict]++;
      cb[sc.cloidB.verdict]++;
      if (sc.priority === 'High') highCount++;
      if (sc.lgAssets && sc.lgAssets.length > 0) hasLg = true;
    }}
    if (hasLg) cellsWithLgAssets++;
  }}
  return {{ totalSubcells, cw, cb, highCount, cellsWithLgAssets, lgAssetRatio: Math.round(cellsWithLgAssets * 100 / CELLS_V13.length) + '%' }};
}}
''')

print(f'Wrote {OUT}')
print(f'Cells: {len(cells)}')
print(f'Total sub-cells: {sum(len(c["subCells"]) for c in cells)}')
print(f'LG_ASSETS: {len(d.LG_ASSETS)}')
print(f'KOREA_PARTNERS: {len(d.KOREA_PARTNERS)}')
print(f'CLUSTERS: {len(d.CLUSTERS)}')
print(f'EE categories: {len(d.END_EFFECTOR_CATEGORIES)}')
