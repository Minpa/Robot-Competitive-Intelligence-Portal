/**
 * ApplicationCaseExtractionService — 수집 기사·영상에서 도입/적용 사례 추출
 *
 * 매일 수집되는 기사(뉴스)·영상 중 실제 현장 도입/배치/시연을 나타내는 항목을
 * AI로 분석해 적용 사례(환경·작업·단계·이벤트·일자)를 추출하고,
 * 기존 카탈로그 로봇에 매칭해 후보큐(ci_staging, application_case)에 적재한다.
 *
 * 안전 원칙 (로봇 후보큐와 동일):
 *  - application_cases에 자동 삽입하지 않고 관리자 승인 시 반영 (오염 방지)
 *  - 카탈로그에 매칭되는 로봇이 없으면 건너뜀 (사례는 로봇에 종속)
 *  - 이미 큐/사례에 있는 것은 중복 적재하지 않음 (멱등)
 *  - ANTHROPIC_API_KEY 없으면 no-op
 */

import Anthropic from '@anthropic-ai/sdk';
import { sql, eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles, humanoidRobots, applicationCases, ciStaging } from '../db/schema.js';

const MODEL = process.env.APP_CASE_MODEL || 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 15;

const ENV_TYPES = ['factory', 'warehouse', 'retail', 'healthcare', 'hospitality', 'home', 'research_lab', 'other'];
const TASK_TYPES = ['assembly', 'picking', 'packing', 'inspection', 'delivery', 'cleaning', 'assistance', 'other'];
const STATUSES = ['concept', 'pilot', 'production'];

// 도입/적용 신호가 있는 기사·영상만 후보로 (효율)
const DEPLOY_SIGNAL =
  'deploy|deployment|pilot|trial|installed|operating|production line|factory|warehouse|fulfillment|on the job|working at|real.world|현장|투입|배치|도입|실증|파일럿|양산 라인';

interface Candidate {
  articleId: string;
  title: string;
  text: string;
}

interface ExtractedCase {
  robotName?: string;
  environmentType?: string;
  taskType?: string;
  taskDescription?: string;
  deploymentStatus?: string;
  demoEvent?: string;
  demoDate?: string; // YYYY-MM-DD
}

class ApplicationCaseExtractionService {
  private client: Anthropic | null = null;
  constructor() {
    if (process.env.ANTHROPIC_API_KEY) this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  private async getPending(limit: number): Promise<Candidate[]> {
    // 도입 신호가 있고 아직 사례 추출 안 된(extracted_metadata.appCaseChecked 없음) 기사·영상
    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        summary: articles.summary,
        meta: articles.extractedMetadata,
      })
      .from(articles)
      .where(
        and(
          sql`source NOT IN ('arxiv','github','sec_edgar','patent')`,
          sql`(extracted_metadata->>'appCaseChecked') IS NULL`,
          sql`(title ~* ${DEPLOY_SIGNAL} OR COALESCE(summary,'') ~* ${DEPLOY_SIGNAL} OR COALESCE(extracted_metadata->>'description','') ~* ${DEPLOY_SIGNAL})`
        )
      )
      .orderBy(desc(articles.collectedAt))
      .limit(limit);

    return rows.map((r) => {
      const meta = (r.meta ?? {}) as Record<string, any>;
      const desc = typeof meta.description === 'string' ? meta.description : '';
      const baseText = [r.summary, desc].filter(Boolean).join(' ').slice(0, 800);

      // Gemini 영상 상세 분석 결과가 있으면 보조 컨텍스트로 덧붙여 추출 정확도를 높인다 (옵션 B)
      const gemini = meta.geminiAnalysis as
        | { summaryKo?: string; capabilities?: string[]; autonomy?: string; autonomyEvidence?: string }
        | undefined;
      let text = baseText;
      if (gemini && typeof gemini === 'object') {
        const parts: string[] = [];
        if (gemini.summaryKo) parts.push(gemini.summaryKo);
        if (Array.isArray(gemini.capabilities) && gemini.capabilities.length > 0) {
          parts.push(`능력: ${gemini.capabilities.join(', ')}`);
        }
        if (gemini.autonomy) {
          parts.push(`자율성: ${gemini.autonomy}${gemini.autonomyEvidence ? ` (${gemini.autonomyEvidence})` : ''}`);
        }
        if (parts.length > 0) {
          text = `${baseText} [Gemini 영상 분석] ${parts.join('; ')}`.slice(0, 1400);
        }
      }

      return { articleId: r.id, title: r.title, text };
    });
  }

  private async extractBatch(items: Candidate[]): Promise<Map<string, ExtractedCase | null>> {
    const result = new Map<string, ExtractedCase | null>();
    if (!this.client) return result;

    const prompt = `다음은 로봇 관련 기사·영상 목록이다. 각 항목이 **휴머노이드/서비스 로봇의 실제 현장 도입·배치·시연 사례**를 나타내는지 판단하고, 그렇다면 정보를 추출하라. 단순 펀딩·연구발표·논문·주가 소식은 사례가 아니므로 null.

각 항목에 대해 (사례이면):
- robotName: 언급된 로봇 모델명 (예: Figure 02, Optimus, Digit)
- environmentType: ${ENV_TYPES.join('|')} 중 하나
- taskType: ${TASK_TYPES.join('|')} 중 하나
- taskDescription: 한국어로 무슨 작업인지 1문장
- deploymentStatus: ${STATUSES.join('|')} 중 하나 (concept=컨셉/발표, pilot=파일럿/실증, production=상용/양산배치)
- demoEvent: 이벤트/장소명 (있으면, 예: "BMW Spartanburg", "CES 2026")
- demoDate: 날짜 YYYY-MM-DD (텍스트에 있으면)
사례가 아니면 해당 항목은 결과에서 생략.

오직 텍스트에 근거하라. 추측 금지.

항목:
${JSON.stringify(items.map((i) => ({ id: i.articleId, title: i.title, text: i.text })))}

JSON 배열로만 응답. 사례인 것만 포함:
[{"id":"...","robotName":"...","environmentType":"...","taskType":"...","taskDescription":"...","deploymentStatus":"...","demoEvent":"...","demoDate":"..."}]`;

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) return result;
      const parsed = JSON.parse(m[0]) as ({ id: string } & ExtractedCase)[];
      for (const item of parsed) {
        if (!item.id) continue;
        result.set(item.id, {
          robotName: item.robotName,
          environmentType: ENV_TYPES.includes(item.environmentType ?? '') ? item.environmentType : 'other',
          taskType: TASK_TYPES.includes(item.taskType ?? '') ? item.taskType : 'other',
          taskDescription: item.taskDescription?.slice(0, 500),
          deploymentStatus: STATUSES.includes(item.deploymentStatus ?? '') ? item.deploymentStatus : 'concept',
          demoEvent: item.demoEvent?.slice(0, 255),
          demoDate: item.demoDate,
        });
      }
    } catch (err) {
      console.error('[AppCaseExtract] LLM batch failed:', (err as Error).message);
    }
    return result;
  }

  async run(limit = 150): Promise<{ scanned: number; queued: number; skipped: number }> {
    const res = { scanned: 0, queued: 0, skipped: 0 };
    if (!this.client) return res;

    const pending = await this.getPending(limit);
    if (pending.length === 0) return res;

    // 카탈로그 로봇 이름 매핑
    const robots = await db.select({ id: humanoidRobots.id, name: humanoidRobots.name }).from(humanoidRobots);
    const robotIdByName = new Map(robots.map((r) => [r.name.toLowerCase(), r.id]));

    // 이미 큐에 있는 (robotId+event) 조합
    const queued = await db
      .select({ payload: ciStaging.payload })
      .from(ciStaging)
      .where(and(eq(ciStaging.updateType, 'application_case'), eq(ciStaging.status, 'pending')));
    const queuedKeys = new Set(
      queued.map((q) => {
        const p = q.payload as any;
        return `${p?.robotId}|${(p?.demoEvent ?? '').toLowerCase()}`;
      })
    );

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const extracted = await this.extractBatch(batch);

      for (const item of batch) {
        res.scanned++;
        const ex = extracted.get(item.articleId);
        // 처리 완료 마킹 (사례든 아니든 재조회 방지)
        await db.execute(sql`
          UPDATE articles SET extracted_metadata = COALESCE(extracted_metadata,'{}'::jsonb)
            || jsonb_build_object('appCaseChecked', ${new Date().toISOString()}::text)
          WHERE id = ${item.articleId}
        `);

        if (!ex || !ex.robotName) {
          res.skipped++;
          continue;
        }

        // 카탈로그 로봇 매칭 (없으면 스킵 — 사례는 로봇 종속)
        const robotId = robotIdByName.get(ex.robotName.toLowerCase());
        if (!robotId) {
          res.skipped++;
          continue;
        }

        // 중복 방지: 동일 로봇+이벤트가 큐 또는 기존 사례에 있으면 스킵
        const key = `${robotId}|${(ex.demoEvent ?? '').toLowerCase()}`;
        if (queuedKeys.has(key)) {
          res.skipped++;
          continue;
        }
        const existing = await db
          .select({ id: applicationCases.id })
          .from(applicationCases)
          .where(and(eq(applicationCases.robotId, robotId), eq(applicationCases.demoEvent, ex.demoEvent ?? '')))
          .limit(1);
        if (existing.length > 0) {
          res.skipped++;
          continue;
        }

        await db.insert(ciStaging).values({
          updateType: 'application_case',
          sourceChannel: 'auto',
          status: 'pending',
          payload: {
            robotId,
            robotName: ex.robotName,
            environmentType: ex.environmentType,
            taskType: ex.taskType,
            taskDescription: ex.taskDescription,
            deploymentStatus: ex.deploymentStatus,
            demoEvent: ex.demoEvent ?? null,
            demoDate: ex.demoDate ?? null,
            sourceArticleId: item.articleId,
            detectedAt: new Date().toISOString(),
          },
        });
        queuedKeys.add(key);
        res.queued++;
      }
    }

    console.log(`[AppCaseExtract] scanned ${res.scanned}, queued ${res.queued}, skipped ${res.skipped}`);
    return res;
  }

  /** 후보큐 조회 (관리자 검토) */
  async listCandidates() {
    const rows = await db
      .select()
      .from(ciStaging)
      .where(and(eq(ciStaging.updateType, 'application_case'), eq(ciStaging.status, 'pending')))
      .orderBy(desc(ciStaging.createdAt));
    return rows.map((r) => ({ id: r.id, ...(r.payload as Record<string, unknown>), createdAt: r.createdAt }));
  }

  /** 후보 승인 → application_cases에 반영 */
  async approve(stagingId: string): Promise<{ caseId: string } | { error: string }> {
    const [row] = await db.select().from(ciStaging).where(eq(ciStaging.id, stagingId)).limit(1);
    if (!row || row.status !== 'pending') return { error: 'Candidate not found or already processed' };
    const p = row.payload as Record<string, any>;
    if (!p.robotId) return { error: 'No robot linked' };

    const [created] = await db
      .insert(applicationCases)
      .values({
        robotId: p.robotId,
        environmentType: p.environmentType ?? 'other',
        taskType: p.taskType ?? 'other',
        taskDescription: p.taskDescription ?? null,
        deploymentStatus: p.deploymentStatus ?? 'concept',
        demoEvent: p.demoEvent ?? null,
        demoDate: p.demoDate ?? null,
        notes: '수집 기사·영상에서 자동 추출 후 승인됨',
      })
      .returning({ id: applicationCases.id });

    await db
      .update(ciStaging)
      .set({ status: 'applied', appliedAt: new Date(), reviewedAt: new Date() })
      .where(eq(ciStaging.id, stagingId));
    return { caseId: created!.id };
  }

  async reject(stagingId: string): Promise<{ ok: boolean }> {
    await db
      .update(ciStaging)
      .set({ status: 'rejected', reviewedAt: new Date() })
      .where(and(eq(ciStaging.id, stagingId), eq(ciStaging.status, 'pending')));
    return { ok: true };
  }
}

export const applicationCaseExtractionService = new ApplicationCaseExtractionService();
