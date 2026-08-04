#!/usr/bin/env npx tsx
/**
 * 영상 자막 소급 백필 (1회성)
 *
 * 자막 기반 분석 기능이 배포되기 이전에 이미 aiTags가 채워진 영상들에 대해
 * 자막을 소급 수집하고, 자막 내용을 반영해 LLM으로 재태깅한다.
 * (영상 파일 다운로드는 하지 않음 — 자막 텍스트만 조회)
 *
 * 실행: cd packages/backend && npx tsx ../../scripts/backfill-video-captions-2026-08-04.ts [options]
 *
 * 옵션:
 *   --days=N     대상 기간 (기본 90일)
 *   --limit=N    최대 처리 건수 (기본 200)
 *   --dry-run    실제 DB 쓰기/네트워크 호출 없이 대상 건수만 출력
 *   --force      이미 백필된(captionBackfillTaggedAt 마커) 영상도 다시 처리
 *
 * 필수 환경변수: DATABASE_URL, ANTHROPIC_API_KEY
 * (ANTHROPIC_API_KEY 없으면 videoTaggingService가 휴리스틱 태깅으로 폴백하지만,
 *  이 스크립트의 목적상 LLM 재태깅이 핵심이므로 필수로 요구한다.)
 */

import { videoTaggingService } from '../packages/backend/src/services/video-tagging.service.js';

function parseArgs(argv: string[]) {
  const opts: { days?: number; limit?: number; dryRun?: boolean; force?: boolean } = {};
  for (const arg of argv) {
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--force') {
      opts.force = true;
    } else if (arg.startsWith('--days=')) {
      opts.days = parseInt(arg.slice('--days='.length), 10);
    } else if (arg.startsWith('--limit=')) {
      opts.limit = parseInt(arg.slice('--limit='.length), 10);
    }
  }
  return opts;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY is required');
    process.exit(1);
  }

  const options = parseArgs(process.argv.slice(2));
  console.log('[Backfill] Starting video caption backfill with options:', options);

  const result = await videoTaggingService.backfillCaptions(options);

  console.log('[Backfill] Done:', result);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Backfill] Failed:', err);
  process.exit(1);
});
