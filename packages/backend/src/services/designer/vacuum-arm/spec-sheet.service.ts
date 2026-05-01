/**
 * Spec-sheet service · vacuum-arm REQ-10 (Phase B)
 *
 * Spec §5.3 — POST /api/designer/vacuum-arm/spec-sheet
 *   Builds a 6-section spec sheet payload for the frontend's print view.
 *   The frontend renders an A4 print-optimized HTML page and triggers
 *   window.print(); the user picks "Save as PDF" — yielding a 6-page PDF
 *   without server-side puppeteer/pdfkit (kept lean for Railway PoC).
 *
 * Sections (mirror spec §5.3):
 *   1. 표제
 *   2. 부품 사양 표
 *   3. 공학적 분석 결과
 *   4. 환경 적합성
 *   5. 검토 의견
 *   6. 부록: 사양 변경 로그 (optional)
 */

import { generateReview } from './review.service.js';
import type {
  AnalysisSnapshot,
  ReviewResult,
} from './review.service.js';
import type {
  ProductConfig,
  RoomConfig,
} from './types.js';

export interface SpecSheetRevisionEntry {
  parameterName: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: string;
}

export interface SpecSheetMetadata {
  candidateName: string;
  authorName: string;
  generatedAt: string;
}

export interface SpecSheetPayload {
  meta: SpecSheetMetadata;
  product: ProductConfig;
  payloadKg: number;
  room: RoomConfig | null;
  analysis: AnalysisSnapshot;
  review: ReviewResult;
  revisions: SpecSheetRevisionEntry[];
  isMock: true;
}

export interface BuildSpecSheetInput {
  product: ProductConfig;
  payloadKg: number;
  room?: RoomConfig | null;
  analysis: AnalysisSnapshot;
  candidateName: string;
  authorName?: string;
  revisions?: SpecSheetRevisionEntry[];
  /** Pre-computed review (e.g. from cached panel state). When omitted, generated here. */
  review?: ReviewResult;
}

export async function buildSpecSheet(input: BuildSpecSheetInput): Promise<SpecSheetPayload> {
  const review =
    input.review ??
    (await generateReview({
      product: input.product,
      payloadKg: input.payloadKg,
      room: input.room ?? null,
      analysis: input.analysis,
    }));

  return {
    meta: {
      candidateName: input.candidateName,
      authorName: input.authorName ?? '민파',
      generatedAt: new Date().toISOString(),
    },
    product: input.product,
    payloadKg: input.payloadKg,
    room: input.room ?? null,
    analysis: input.analysis,
    review,
    revisions: (input.revisions ?? []).slice(-50), // cap appendix
    isMock: true,
  };
}
