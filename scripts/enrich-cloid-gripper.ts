#!/usr/bin/env npx tsx
/**
 * Phase B: CLOiD Coverage `requiredGripper` enrichment
 *
 * For each of the 52 sub-cells in `packages/frontend/src/components/cloid-coverage/data.ts`,
 * call Claude Opus to classify the required gripper (category / detail / confidence).
 *
 * Output: `packages/frontend/src/components/cloid-coverage/gripper-data.generated.ts`
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/enrich-cloid-gripper.ts
 *
 * Idempotent: re-running overwrites the generated file. Costs ~13 Claude Opus calls
 * (one per cell, 4 sub-cells per call) with prompt caching on system prompt + tools.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CELLS, type SubCell, type GripperConfidence } from '../packages/frontend/src/components/cloid-coverage/data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = 'claude-opus-4-7';
const OUT_PATH = path.resolve(
  __dirname,
  '../packages/frontend/src/components/cloid-coverage/gripper-data.generated.ts',
);

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.');
  console.error('   ANTHROPIC_API_KEY=sk-... npx tsx scripts/enrich-cloid-gripper.ts');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });

interface GripperResult {
  lv: 1 | 2 | 3 | 4;
  category: string;
  detail: string;
  confidence: GripperConfidence;
}

const GRIPPER_TAXONOMY = `
그리퍼 카테고리 (이 중 가장 적합한 1개를 선택. 필요 시 "+ 손바닥 카메라" 등 옵션 명시):
- "평행 그리퍼"        — 정형 SKU, 부품 픽업·배치 (1mm 정밀도면 충분)
- "평행 + 손바닥 카메라" — 0.5mm 이하 정밀도, FPC·커넥터·나사 정합 등 비전 보강 필요
- "Soft 그리퍼"         — 비정형 SKU(의류·잡화), 물체 손상 위험, 변형 가능 형상
- "Multi-그리퍼 (교체식)" — 한 작업장에서 여러 형상 SKU 처리, 자동 툴 체인저 필요
- "흡착·진공 그리퍼"     — 평면 박스·시트·플라스틱, 가벼운 평면 SKU
- "F/T 정밀 그리퍼"     — 케이블 라우팅·조립 force feedback 핵심
- "양손 협조 그리퍼"     — 큰 박스/Tote/공구 양손 들기, 양손 균형 제어 필수
- "토크 드라이버·임팩트" — 나사 체결, 너트 러너
- "용접 토치·도장 노즐"  — 용접·도장 등 산업 공구 결합
- "커스텀 (산업 전용)"   — 위 카테고리에 안 맞는 도메인 특화 (예: FPC 전용, 케이블 클램프, 점검 프로브)
`.trim();

const CONFIDENCE_RUBRIC = `
confidence 평가:
- "high"   — coreActions/thresholds에 그리퍼 종류가 명시 또는 표준 양산 케이스
- "medium" — 동작 패턴으로 합리적 추론 가능하나 다른 옵션도 가능
- "low"    — 텍스트 단서가 모호하거나 산업 도메인 추가 조사 필요
`.trim();

const SYSTEM_PROMPT = `당신은 산업용 휴머노이드 로봇의 그리퍼·엔드이펙터 설계 전문가입니다.
주어진 셀(과업 × 산업 섹터)의 4개 Lv(레벨) 동작을 분석해, 각 Lv마다 **필요한 그리퍼 카테고리**를 결정합니다.
임원 보고용 자료이므로 **정확성과 보수성**이 중요합니다 — 단서가 부족하면 confidence를 낮추세요.

${GRIPPER_TAXONOMY}

${CONFIDENCE_RUBRIC}

각 Lv 응답:
- category: 위 분류 중 하나의 정확한 문자열 (옵션 추가 가능)
- detail: 1~2 문장. 핵심 스펙(정밀도/페이로드/DoF/특수 요구) 포함
- confidence: high/medium/low

반드시 submit_gripper_classifications 도구로 4개 Lv 모두를 한 번에 응답합니다.`;

const TOOL = {
  name: 'submit_gripper_classifications',
  description: '4개 Lv의 필요 그리퍼 분류 결과를 제출합니다.',
  input_schema: {
    type: 'object' as const,
    required: ['classifications'],
    properties: {
      classifications: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: {
          type: 'object',
          required: ['lv', 'category', 'detail', 'confidence'],
          properties: {
            lv: { type: 'integer', enum: [1, 2, 3, 4] },
            category: { type: 'string' },
            detail: { type: 'string' },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
        },
      },
    },
  },
};

function buildUserMessage(
  cellNum: string,
  taskName: string,
  sectorName: string,
  subCells: readonly SubCell[],
): string {
  const lvBlocks = subCells
    .map(
      (sc) =>
        `## Lv${sc.lv}: ${sc.taskName}
- 핵심 동작: ${sc.coreActions.join(' / ')}
- 요구 임계값: ${sc.thresholds}
- CLOiD W verdict: ${sc.cloidW.verdict} — ${sc.cloidW.note}
- CLOiD B verdict: ${sc.cloidB.verdict} — ${sc.cloidB.note}
- 양산 벤치마크: ${sc.benchmark}
- 개발 필요 항목: ${sc.devItems.join(' / ') || '(없음)'}
- 우선순위: ${sc.priority}`,
    )
    .join('\n\n');

  return `# 셀: ${cellNum} ${taskName} × ${sectorName}

${lvBlocks}

위 4개 Lv 각각에 필요한 그리퍼를 분류해 submit_gripper_classifications로 제출하세요.`;
}

async function classifyCell(cell: (typeof CELLS)[number]): Promise<GripperResult[]> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...TOOL, cache_control: { type: 'ephemeral' } }],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [
      {
        role: 'user',
        content: buildUserMessage(cell.cellNum, cell.taskName, cell.sectorName, cell.subCells),
      },
    ],
  });

  const toolUse = res.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(`No tool_use in response for cell ${cell.id}`);
  }
  const input = toolUse.input as { classifications: GripperResult[] };
  if (!input.classifications || input.classifications.length !== 4) {
    throw new Error(`Invalid classifications for cell ${cell.id}: ${JSON.stringify(input)}`);
  }
  return input.classifications;
}

function emitGeneratedFile(
  records: { cellId: string; lv: number; gripper: GripperResult }[],
  generatedAt: string,
) {
  const header = `// AUTO-GENERATED. Do not edit by hand.
// Regenerate with: ANTHROPIC_API_KEY=... npx tsx scripts/enrich-cloid-gripper.ts
// Source: scripts/enrich-cloid-gripper.ts (Claude ${MODEL})
// Generated: ${generatedAt}

import type { RequiredGripper } from './data';

export interface GripperRecord {
  generatedAt: string;
  model: string;
  cellId: string;
  lv: 1 | 2 | 3 | 4;
  gripper: RequiredGripper;
}

export const GRIPPER_DATA: GripperRecord[] = ${JSON.stringify(
    records.map((r) => ({
      generatedAt,
      model: MODEL,
      cellId: r.cellId,
      lv: r.lv,
      gripper: { category: r.gripper.category, detail: r.gripper.detail, confidence: r.gripper.confidence },
    })),
    null,
    2,
  )} as const;

export const GRIPPER_INDEX: Record<string, RequiredGripper> = Object.fromEntries(
  GRIPPER_DATA.map((r) => [\`\${r.cellId}-Lv\${r.lv}\`, r.gripper]),
);

export function lookupRequiredGripper(
  cellId: string,
  lv: number,
): RequiredGripper | undefined {
  return GRIPPER_INDEX[\`\${cellId}-Lv\${lv}\`];
}

export const GRIPPER_GENERATED_META: { generatedAt: string | null; model: string | null; count: number } = {
  generatedAt: ${JSON.stringify(generatedAt)},
  model: ${JSON.stringify(MODEL)},
  count: ${records.length},
};
`;

  fs.writeFileSync(OUT_PATH, header, 'utf8');
}

async function main() {
  console.log(`📋 ${CELLS.length}개 셀 × 4 Lv = ${CELLS.length * 4}개 sub-cell 분류 시작`);
  const records: { cellId: string; lv: number; gripper: GripperResult }[] = [];

  for (let i = 0; i < CELLS.length; i++) {
    const cell = CELLS[i];
    process.stdout.write(`[${i + 1}/${CELLS.length}] ${cell.cellNum} ${cell.taskName} × ${cell.sectorName} ... `);
    try {
      const classifications = await classifyCell(cell);
      for (const c of classifications) {
        records.push({ cellId: cell.id, lv: c.lv, gripper: c });
      }
      console.log('✓');
    } catch (e) {
      console.error('✗', (e as Error).message);
      throw e;
    }
  }

  const generatedAt = new Date().toISOString();
  emitGeneratedFile(records, generatedAt);

  console.log(`\n✅ ${records.length}개 sub-cell 그리퍼 분류 완료`);
  console.log(`   ${OUT_PATH}`);

  // Confidence distribution
  const dist = { high: 0, medium: 0, low: 0 };
  for (const r of records) dist[r.gripper.confidence]++;
  console.log(`   confidence: high ${dist.high} / medium ${dist.medium} / low ${dist.low}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
