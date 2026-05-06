#!/usr/bin/env npx tsx
/**
 * Run all CLOiD coverage enrichment scripts in sequence.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/enrich-all.ts
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRIPTS = [
  'enrich-action-glossary.ts',
  'enrich-cloid-gripper.ts',
];

function run(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const full = path.resolve(__dirname, script);
    console.log(`\n──────────────────────────────────────────────────────`);
    console.log(`▶ ${script}`);
    console.log(`──────────────────────────────────────────────────────`);
    const p = spawn('npx', ['tsx', full], { stdio: 'inherit', env: process.env });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY 환경변수가 필요합니다.');
    process.exit(1);
  }
  for (const s of SCRIPTS) await run(s);
  console.log('\n✅ 모든 enrichment 스크립트 완료');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
