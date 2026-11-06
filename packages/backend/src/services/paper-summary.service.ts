/**
 * PaperSummaryService — arXiv 논문 한글 한 줄 요약 (AI 생성)
 *
 * source='arxiv'이고 extracted_metadata.aiSummaryKo가 없는 논문을 배치로 조회해,
 * 제목+초록(summary 컬럼)을 근거로 한국어 1~2문장 요약을 생성해 저장한다.
 *
 * 안전 원칙:
 *  - 환각 방지: 주어진 초록 내용만 근거로 요약 (없는 수치·결과 추측 금지)
 *  - 멱등: aiSummaryKo가 이미 있으면 조회 대상에서 제외
 *  - ANTHROPIC_API_KEY 없으면 no-op (DB 접근 없음)
 *  - 논문 요약은 규칙 기반 대체 불가하므로 휴리스틱 폴백 없음
 */

import Anthropic from '@anthropic-ai/sdk';
import { sql, eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles } from '../db/schema.js';
import { LLM_INPUT_LIMITS, buildUserMessage, fitItemsToBudget, sanitizeExternalText, type SanitizeResult } from './llm-input-guard.js';
import { applyRule, parseJsonStrict } from './llm-output-guard.js';
import { composeSystemPrompt, JSON_ONLY_NOTICE, NO_URL_NOTICE } from './llm-guard-prompts.js';
import { createRejectCollector, recordInputGuard, recordOutputReject } from './llm-guard-metrics.js';

const PAPER_SUMMARY_MODEL = process.env.PAPER_SUMMARY_MODEL || 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 20;
const POINT = 'paper_summary';
/** 한 요청에 들어가는 데이터 블록 직렬화 길이 상한 */
const PROMPT_BUDGET = 24_000;

interface PendingPaper {
  id: string;
  title: string;
  abstract: string;
}

export class PaperSummaryService {
  private client: Anthropic | null = null;
  /** deps.client: 테스트용 선택 주입. 생략하면 현재 동작(환경 설정 기반 생성) */
  constructor(deps: { client?: Anthropic | null } = {}) {
    if (deps.client !== undefined) {
      this.client = deps.client;
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  /** aiSummaryKo 없는 arXiv 논문 조회 (멱등의 핵심) */
  private async getPending(limit: number): Promise<PendingPaper[]> {
    const rows = await db
      .select({ id: articles.id, title: articles.title, summary: articles.summary })
      .from(articles)
      .where(and(eq(articles.source, 'arxiv'), sql`(extracted_metadata->>'aiSummaryKo') IS NULL`))
      .orderBy(desc(articles.collectedAt))
      .limit(limit);
    return rows.map((r) => ({ id: r.id, title: r.title, abstract: (r.summary ?? '').slice(0, 500) }));
  }

  /** LLM 배치 호출 — 초록 근거로 한글 1~2문장 생성 */
  private async llmSummarizeBatch(papers: PendingPaper[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!this.client) return result;

    // 외부 텍스트(제목·초록)는 정제한 사본만 데이터 블록에 넣는다. DB 원본은 바꾸지 않는다
    const guardResults: SanitizeResult[] = [];
    const items = papers.map((p) => {
      const title = sanitizeExternalText(p.title, { maxChars: LLM_INPUT_LIMITS.title });
      const abstract = sanitizeExternalText(p.abstract, { maxChars: LLM_INPUT_LIMITS.abstract });
      guardResults.push(title, abstract);
      return { id: p.id, title: title.text, abstract: abstract.text };
    });
    recordInputGuard(POINT, guardResults);
    const fitted = fitItemsToBudget(items, PROMPT_BUDGET);
    const sentIds = new Set(fitted.items.map((p) => p.id));

    const system = composeSystemPrompt(
      `로봇 분야 arXiv 논문 목록(데이터 블록)을 받는다. 각 논문의 제목과 초록을 보고, 한국 로봇 엔지니어가 영어 초록을 읽지 않고도 내용을 빠르게 파악할 수 있도록 한국어 요약을 작성하라.

규칙:
- 오직 주어진 제목과 초록에 담긴 내용만 근거로 요약하라. 초록에 없는 내용(구체적 수치, 실험 결과, 저자 소속 등)을 추측하거나 지어내지 말라.
- 서술형 1~2문장, 평서형으로 통일 (예: "~하는 방법을 제안한다", "~특징이 있다"). 150자 이내.
- 어떤 기술 분야에 대한 것인지 + 핵심 접근/특징을 담아라. 마크다운 기호 사용 금지.

${JSON_ONLY_NOTICE} ${NO_URL_NOTICE}
JSON 배열로만 응답하라. 다른 텍스트 없이:
[{"id":"...","ko":"..."}]`
    );

    try {
      const response = await this.client.messages.create({
        model: PAPER_SUMMARY_MODEL,
        max_tokens: 3000,
        system,
        messages: [{ role: 'user', content: buildUserMessage('paper_summary', fitted.items) }],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const parsed = parseJsonStrict(text, 'array') as Array<{ id?: unknown; ko?: unknown } | null> | null;
      if (!parsed) {
        recordOutputReject(POINT, 'schema');
        return result;
      }
      const collector = createRejectCollector(POINT);
      for (const item of parsed) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !sentIds.has(item.id)) {
          collector.onReject('schema', 'id');
          continue;
        }
        // URL 제거, 지시문 에코/유출 폐기, 200자 상한. 폐기되면 저장하지 않아 다음 실행 때 재시도된다
        const ko = applyRule(item.ko, { type: 'text', max: 200 }, { systemText: system, onReject: collector.onReject }, 'ko');
        if (ko.ok) result.set(item.id, ko.value as string);
      }
      collector.flush();
    } catch (err) {
      console.error('[PaperSummary] LLM batch failed:', (err as Error).message);
    }
    return result;
  }

  /** 미요약 논문 요약 실행 */
  async run(limit = 300): Promise<{ summarized: number; method: 'llm' | 'none' }> {
    if (!this.client) return { summarized: 0, method: 'none' };

    const pending = await this.getPending(limit);
    if (pending.length === 0) return { summarized: 0, method: 'llm' };

    let summarized = 0;
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const summaries = await this.llmSummarizeBatch(batch);
      const now = new Date().toISOString();
      for (const paper of batch) {
        const ko = summaries.get(paper.id);
        if (!ko) continue; // 이번 배치 미응답 → 다음 실행 때 재시도
        await db.execute(sql`
          UPDATE articles
          SET extracted_metadata = COALESCE(extracted_metadata, '{}'::jsonb)
            || jsonb_build_object('aiSummaryKo', ${ko}::text, 'aiSummaryKoGeneratedAt', ${now}::text)
          WHERE id = ${paper.id}
        `);
        summarized++;
      }
    }

    console.log(`[PaperSummary] Summarized ${summarized} paper(s)`);
    return { summarized, method: 'llm' };
  }
}

export const paperSummaryService = new PaperSummaryService();
