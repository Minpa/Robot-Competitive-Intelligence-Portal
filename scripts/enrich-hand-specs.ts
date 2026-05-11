#!/usr/bin/env npx tsx
/**
 * Hand Benchmark Spec Enrichment Pipeline
 *
 * 다지형 핸드 8종의 6축 스펙을 Claude Opus(웹 검색 도구) 로 수집·정규화해
 * `packages/backend/src/db/seed-data/hand-benchmark-v1.json` 을 생성합니다.
 *
 * 6축: dof, payload, gripForce, responseSpeed, tactileChannels, weightEfficiency
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/enrich-hand-specs.ts
 *
 * Idempotent: 재실행 시 출력 파일 overwrite. 백엔드 부팅 시 idempotent seed 로
 * DB 에 자동 반영 (handBenchmarkService.seedFromFile).
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL = 'claude-opus-4-7';
const OUT_PATH = path.resolve(
  __dirname,
  '../packages/backend/src/db/seed-data/hand-benchmark-v1.json'
);

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다.');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });

// 비교 대상 핸드 8종 (slug, name, manufacturer, country, category)
const HANDS = [
  { slug: 'shadow-e3m5', name: 'Shadow Hand E3M5', manufacturer: 'Shadow Robot Company', country: '영국', category: 'dexterous' },
  { slug: 'allegro-v4', name: 'Allegro Hand v4', manufacturer: 'Wonik Robotics', country: '한국', category: 'dexterous' },
  { slug: 'tesollo-dg5f', name: 'Tesollo DG-5F', manufacturer: 'Tesollo', country: '한국', category: 'dexterous' },
  { slug: 'inspire-rh56dfx', name: 'Inspire RH56DFX', manufacturer: 'Inspire Robotics', country: '중국', category: 'dexterous' },
  { slug: 'paxini-dexh13', name: 'PaXini DexH13', manufacturer: 'PaXini Tech', country: '중국', category: 'dexterous' },
  { slug: 'linkerhand-l20', name: 'LinkerHand L20', manufacturer: 'LinkerHand', country: '중국', category: 'dexterous' },
  { slug: 'sanctuary-phoenix', name: 'Phoenix Hand', manufacturer: 'Sanctuary AI', country: '캐나다', category: 'dexterous' },
  { slug: 'schunk-svh', name: 'Schunk SVH', manufacturer: 'Schunk', country: '독일', category: 'industrial-5f' },
] as const;

const AXES = [
  { key: 'dof', label: 'DoF (자유도)', description: '손가락 관절의 독립 제어 자유도 총합', perfectDef: '24 DoF — Shadow Hand 수준', unit: 'DoF', sortOrder: 1 },
  { key: 'payload', label: '페이로드', description: '안정적으로 들 수 있는 최대 무게', perfectDef: '10 kg — 휴머노이드 양손 작업 표준', unit: 'kg', sortOrder: 2 },
  { key: 'gripForce', label: '그립력', description: '최대 파지력 (손가락 끝 합력 기준)', perfectDef: '50 N — 휴머노이드 작업 표준', unit: 'N', sortOrder: 3 },
  { key: 'responseSpeed', label: '응답 속도', description: '센서모터 제어 주기', perfectDef: '10 Hz 이상 — 동적 조작 가능 수준', unit: 'Hz', sortOrder: 4 },
  { key: 'tactileChannels', label: '촉각 채널', description: '내장 촉각 센서 채널 수 또는 텍셀 수', perfectDef: '100+ 채널 — 텍타일 VLA 학습 가능', unit: '채널', sortOrder: 5 },
  { key: 'weightEfficiency', label: '무게 효율', description: '페이로드 ÷ 자체 무게', perfectDef: '5.0 이상', unit: '비율', sortOrder: 6 },
] as const;

const SYSTEM_PROMPT = `당신은 다지형 로봇 핸드 시장 전문가입니다.
주어진 8종 핸드 제품의 공개 데이터시트·논문·제조사 페이지를 웹 검색으로 조회해
다음 6축의 원본 수치와 0~10 정규화 점수를 산정합니다.

축:
- dof: 자유도 (개). 24=10, 16=7, 12=5
- payload: 페이로드 (kg). 10=10, 5=5
- gripForce: 그립력 (N). 50=10, 35=7, 30=6, 40=8
- responseSpeed: 센서모터 사이클 (Hz). 10+=10, 5=5, 1=2
- tactileChannels: 텍셀/채널 수. 100+=10, 30=2, 0=0
- weightEfficiency: 페이로드/자체무게. 5+=10 (cap), 3.3=7, 1.16=2

각 (hand, axis) 마다:
- currentScore: 0~10 정수
- targetScore: 1~2년 로드맵 가정한 목표 (currentScore 이상)
- rawValue: 원본 수치 (예: "24 DoF", "5kg / 4.3kg = 1.16")
- rationale: 1~2 문장. 핵심 차별점 + 출처 단서

submit_hand_benchmark 도구로 모든 8 hands × 6 axes = 48 점수 응답.`;

const TOOL = {
  name: 'submit_hand_benchmark',
  description: '8 hands × 6 axes 점수와 raw value, rationale 일괄 제출',
  input_schema: {
    type: 'object' as const,
    required: ['competitors'],
    properties: {
      competitors: {
        type: 'array',
        minItems: 8,
        maxItems: 8,
        items: {
          type: 'object',
          required: ['slug', 'scores'],
          properties: {
            slug: { type: 'string' },
            scores: {
              type: 'array',
              minItems: 6,
              maxItems: 6,
              items: {
                type: 'object',
                required: ['axisKey', 'currentScore', 'targetScore', 'rawValue', 'rationale'],
                properties: {
                  axisKey: { type: 'string', enum: AXES.map((a) => a.key) as unknown as string[] },
                  currentScore: { type: 'integer', minimum: 0, maximum: 10 },
                  targetScore: { type: 'integer', minimum: 0, maximum: 10 },
                  rawValue: { type: 'string' },
                  rationale: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
};

interface ToolResult {
  competitors: Array<{
    slug: string;
    scores: Array<{
      axisKey: string;
      currentScore: number;
      targetScore: number;
      rawValue: string;
      rationale: string;
    }>;
  }>;
}

async function callClaude(): Promise<ToolResult> {
  const userMessage = `다음 8종 핸드의 6축 스펙을 웹 검색으로 조회해 제출하세요:\n\n${HANDS.map(
    (h, i) => `${i + 1}. ${h.name} (${h.manufacturer}, ${h.country}) — slug: ${h.slug}`
  ).join('\n')}`;

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [{ ...TOOL, cache_control: { type: 'ephemeral' } }],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolUse = res.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude 응답에 tool_use가 없습니다.');
  }
  return toolUse.input as ToolResult;
}

async function main() {
  console.log(`▶ ${HANDS.length} hands × ${AXES.length} axes 점수 수집 시작 (${MODEL})...`);
  const result = await callClaude();

  const competitors = HANDS.map((h, idx) => {
    const match = result.competitors.find((c) => c.slug === h.slug);
    if (!match) throw new Error(`Claude 응답에 ${h.slug} 누락`);
    return {
      slug: h.slug,
      name: h.name,
      manufacturer: h.manufacturer,
      country: h.country,
      category: h.category,
      sortOrder: idx + 1,
      scores: match.scores,
    };
  });

  const output = {
    version: 'v1.0',
    generatedAt: new Date().toISOString().split('T')[0],
    source: 'ai-pipeline' as const,
    model: MODEL,
    axes: AXES,
    competitors,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`✅ ${OUT_PATH} 생성 완료 (${competitors.length} hands)`);
}

main().catch((err) => {
  console.error('❌ 실패:', err);
  process.exit(1);
});
