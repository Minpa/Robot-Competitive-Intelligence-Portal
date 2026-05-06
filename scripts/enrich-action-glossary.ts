#!/usr/bin/env npx tsx
/**
 * Phase C: Action code + abbreviation glossary enrichment
 *
 * 1. data.ts에서 모든 LOC/MAN/PER/COG/NAV/SAF-NN 코드를 추출.
 * 2. 미리 정의한 약어 후보 리스트(VLA, F/T, IECEx 등)를 추가.
 * 3. Claude Opus 1회 호출로 임원이 즉시 이해할 plain Korean 명칭 + 1~2문장 풀이를 받아옴.
 * 4. action-glossary.generated.ts 재생성.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/enrich-action-glossary.ts
 *
 * Idempotent. Cost: ~1 Claude Opus call (~70 codes + ~20 abbreviations).
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CELLS, type ActionCategory } from '../packages/frontend/src/components/cloid-coverage/data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = 'claude-opus-4-7';
const OUT_PATH = path.resolve(
  __dirname,
  '../packages/frontend/src/components/cloid-coverage/action-glossary.generated.ts',
);

// ── 1. Collect unique action codes from data ────────────────────────
const CODE_RE = /(LOC|MAN|PER|COG|NAV|SAF)-\d+/g;

function collectCodes(): string[] {
  const set = new Set<string>();
  for (const cell of CELLS) {
    for (const sc of cell.subCells) {
      const sources = [...sc.coreActions, sc.thresholds, ...sc.devItems];
      for (const t of sources) {
        const matches = t.match(CODE_RE);
        if (matches) for (const m of matches) set.add(m);
      }
    }
  }
  return [...set].sort();
}

// ── 2. Curated abbreviation candidates ──────────────────────────────
// 데이터 본문에 자주 등장하는 약어. 새 약어는 여기 추가 후 재실행하면 됨.
const ABBR_CANDIDATES = [
  'VLA', 'F/T', 'F-T', 'ZMP', 'IECEx', 'IP65', 'IP67',
  'ISO 10218', 'ISO 13482', 'BOM', 'FPC', 'SLAM', 'DoF',
  'SKU', 'RaaS', 'LiDAR', 'PFL', 'KPI', 'TSP', 'DC',
];

// ── 3. Anthropic setup ──────────────────────────────────────────────
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.');
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey });

const CATEGORY_HINT: Record<ActionCategory, string> = {
  LOC: 'Locomotion (이동·보행·계단·경사)',
  MAN: 'Manipulation (조작·픽업·체결·양손 협조)',
  PER: 'Perception (인지·시각 인식·6D pose)',
  COG: 'Cognition (계획·순서 결정·다 SKU 관리)',
  NAV: 'Navigation (자율 이동·경로 계획·다 창고)',
  SAF: 'Safety (안전·인증·인간 협업)',
};

const SYSTEM_PROMPT = `당신은 산업용 휴머노이드 로봇 도메인 전문가이자 임원 보고 자료 작성자입니다.

당신의 임무는 로봇 동작 코드(예: MAN-02, PER-13)와 산업 약어(예: VLA, F/T, IECEx)에 대해
**경영진 임원이 한 번에 이해할 수 있는 풀이**를 작성하는 것입니다.

원칙:
1. plainName은 5~12자 한글 명칭. 영문·코드·약어 사용 금지. 임원이 한국어 보고서에서 바로 보고 의미를 파악할 수 있어야 함.
2. description은 1~2문장 (50~120자). 동작이 무엇이며 왜 산업 현장에서 중요한지를 설명. 너무 기술적인 용어는 풀어쓰기.
3. 절대 코드를 그대로 쓰지 말 것 ("MAN-02는..."  X, "정형 부품 픽업은..."  O).
4. 약어의 expansion은 영문 풀이(또는 표준 용어), description은 한글로 무엇이고 왜 중요한지.

카테고리별 의미:
${Object.entries(CATEGORY_HINT).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

반드시 submit_glossary 도구로 응답합니다.`;

const TOOL = {
  name: 'submit_glossary',
  description: '동작 코드와 약어 풀이를 제출합니다.',
  input_schema: {
    type: 'object' as const,
    required: ['actions', 'abbreviations'],
    properties: {
      actions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['code', 'category', 'plainName', 'description'],
          properties: {
            code: { type: 'string' },
            category: { type: 'string', enum: ['LOC', 'MAN', 'PER', 'COG', 'NAV', 'SAF'] },
            plainName: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
      abbreviations: {
        type: 'array',
        items: {
          type: 'object',
          required: ['term', 'expansion', 'description'],
          properties: {
            term: { type: 'string' },
            expansion: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
    },
  },
};

interface ActionResult { code: string; category: ActionCategory; plainName: string; description: string }
interface AbbrResult { term: string; expansion: string; description: string }

async function generateGlossary(codes: string[], abbrs: string[]) {
  // 데이터 컨텍스트도 함께 전달 — 어떤 문장에서 쓰이는지 보여주면 정확도↑
  const codeContexts: Record<string, Set<string>> = {};
  for (const code of codes) codeContexts[code] = new Set();
  for (const cell of CELLS) {
    for (const sc of cell.subCells) {
      const sources = [...sc.coreActions, sc.thresholds];
      for (const t of sources) {
        for (const code of codes) {
          if (t.includes(code)) codeContexts[code].add(`${cell.cellNum} ${cell.taskName}: "${t}"`);
        }
      }
    }
  }

  const codeBlock = codes
    .map((code) => {
      const ctxs = [...codeContexts[code]].slice(0, 3);
      return `- ${code}\n  사용 예시:\n${ctxs.map((c) => `    · ${c}`).join('\n')}`;
    })
    .join('\n');

  const userMessage = `# 동작 코드 ${codes.length}개

${codeBlock}

# 약어 ${abbrs.length}개

${abbrs.map((a) => `- ${a}`).join('\n')}

위 ${codes.length}개 동작 코드와 ${abbrs.length}개 약어를 모두 submit_glossary로 풀이해 제출하세요.
임원 보고용이므로 정확하고 보수적으로 작성합니다.`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16384,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...TOOL, cache_control: { type: 'ephemeral' } }],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolUse = res.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool_use in response');
  const input = toolUse.input as { actions: ActionResult[]; abbreviations: AbbrResult[] };

  // Validation: ensure all codes/abbrs returned
  const returnedCodes = new Set(input.actions.map((a) => a.code));
  const missingCodes = codes.filter((c) => !returnedCodes.has(c));
  if (missingCodes.length > 0) {
    console.warn(`⚠️  Missing codes from response: ${missingCodes.join(', ')}`);
  }
  return input;
}

function emitGeneratedFile(actions: ActionResult[], abbrs: AbbrResult[], generatedAt: string) {
  const content = `// AUTO-GENERATED. Do not edit by hand.
// Regenerate with: ANTHROPIC_API_KEY=... npx tsx scripts/enrich-action-glossary.ts
//                  (or: npx tsx scripts/enrich-all.ts)
// Source: scripts/enrich-action-glossary.ts (Claude ${MODEL})
// Generated: ${generatedAt}

import type { ActionGlossaryEntry, AbbreviationEntry } from './data';

export const ACTION_GLOSSARY: ActionGlossaryEntry[] = ${JSON.stringify(actions, null, 2)} as const;

export const ABBREVIATIONS: AbbreviationEntry[] = ${JSON.stringify(abbrs, null, 2)} as const;

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
  generatedAt: ${JSON.stringify(generatedAt)},
  model: ${JSON.stringify(MODEL)},
  actionCount: ${actions.length},
  abbrCount: ${abbrs.length},
};

export function parseActionCode(text: string): { code: string | null; rest: string } {
  const m = text.match(/^(LOC|MAN|PER|COG|NAV|SAF)-\\d+\\s*/);
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
`;

  fs.writeFileSync(OUT_PATH, content, 'utf8');
}

async function main() {
  const codes = collectCodes();
  console.log(`📋 ${codes.length}개 동작 코드 + ${ABBR_CANDIDATES.length}개 약어 분류 시작`);

  const result = await generateGlossary(codes, ABBR_CANDIDATES);

  const generatedAt = new Date().toISOString();
  emitGeneratedFile(result.actions, result.abbreviations, generatedAt);

  console.log(`✅ ${result.actions.length}개 동작 + ${result.abbreviations.length}개 약어 글로서리 생성`);
  console.log(`   ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
