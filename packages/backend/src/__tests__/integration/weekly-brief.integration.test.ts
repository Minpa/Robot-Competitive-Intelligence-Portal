/**
 * 주간 브리프 통합 테스트 (임시 PostgreSQL)
 *
 * TEST_DATABASE_URL 이 없으면 전체 생략된다.
 *   1) 마이그레이션 + 시드(seed, seed:humanoid, seed:components, CI 시드)가 적용된 빈 DB 를 준비
 *      DATABASE_URL=postgres://… npm run migrate -w packages/backend  (그 외 시드 스크립트는 package.json 참고)
 *   2) TEST_DATABASE_URL=postgres://… npx vitest run src/__tests__/integration/weekly-brief.integration.test.ts
 * ⚠ 이 DB 의 articles / keywords / ci_values / humanoid_robots / weekly_briefs 를 덮어쓰므로 운영 DB 로 실행하지 말 것.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { seedWeeklyBriefFixture, WEEKLY_BRIEF_SEED_EXPECTED as EXP } from '../fixtures/weekly-brief-seed.js';

const TEST_URL = process.env.TEST_DATABASE_URL;

type Mods = {
  sql: typeof import('drizzle-orm').sql;
  db: typeof import('../../db/index.js').db;
  svc: typeof import('../../services/weekly-brief.service.js');
  collect: typeof import('../../services/weekly-brief-collect.js');
  compose: typeof import('../../services/weekly-brief-compose.js');
  summarize: typeof import('../../services/weekly-brief-summarize.js');
  period: typeof import('../../services/weekly-brief-period.js');
  ddl: typeof import('../../db/weekly-brief.ddl.js');
};

// 2026-10-26 08:00 KST — 직전 완료 주는 2026-10-19
const NOW = new Date('2026-10-25T23:00:00Z');
const WEEK = EXP.weekStart;
const PREV = EXP.prevWeekStart;

describe.skipIf(!TEST_URL)('weekly brief (temp PostgreSQL)', () => {
  let m: Mods;
  const prevEnv: Record<string, string | undefined> = {};
  let app: FastifyInstance | null = null;

  const q = async <T = Record<string, any>>(text: string): Promise<T[]> => ((await m.db.execute(m.sql.raw(text))) as unknown as { rows: T[] }).rows;

  /** 질문(프롬프트)을 읽어 첫 두 후보를 규칙 기본 문장 그대로 고르는 가짜 AI 클라이언트 */
  function fakeAi(calls: { n: number }) {
    return {
      messages: {
        create: async (params: any) => {
          calls.n++;
          const prompt = JSON.parse(params.messages[0].content) as { candidates: { candidateId: string; defaultHeadline: string; defaultCaption: string }[] };
          const picks = prompt.candidates.slice(0, 2).map((c) => ({ candidateId: c.candidateId, headline: c.defaultHeadline, caption: c.defaultCaption, note: null }));
          return { content: [{ type: 'text', text: JSON.stringify({ selections: picks }) }], stop_reason: 'end_turn', usage: { input_tokens: 2500, output_tokens: 300 } };
        },
      },
    };
  }

  const aiDeps = (calls: { n: number }, env: Record<string, string | undefined> = {}) => ({
    now: () => NOW,
    summarize: (input: any) =>
      m.summarize.summarizeCandidates(input, {
        client: fakeAi(calls) as any,
        env,
        getCreditInfo: async () => ({ monthlyLimitUsd: 50, currentMonthUsageUsd: 0 }),
        logUsage: async () => undefined,
      }),
  });

  beforeAll(async () => {
    for (const k of ['DATABASE_URL', 'WEEKLY_BRIEF_AI_ENABLED', 'ANTHROPIC_API_KEY']) prevEnv[k] = process.env[k];
    process.env.DATABASE_URL = TEST_URL;
    const drizzle = await import('drizzle-orm');
    const dbMod = await import('../../db/index.js');
    m = {
      sql: drizzle.sql,
      db: dbMod.db,
      svc: await import('../../services/weekly-brief.service.js'),
      collect: await import('../../services/weekly-brief-collect.js'),
      compose: await import('../../services/weekly-brief-compose.js'),
      summarize: await import('../../services/weekly-brief-summarize.js'),
      period: await import('../../services/weekly-brief-period.js'),
      ddl: await import('../../db/weekly-brief.ddl.js'),
    };
  });

  afterAll(async () => {
    await app?.close();
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  // ───────────────────────────────────────────────────────
  it('ensureWeeklyBriefTables creates the table on an empty DB (idempotent) and enforces the status check', async () => {
    await q('DROP TABLE IF EXISTS weekly_briefs');
    expect(await q(`SELECT to_regclass('public.weekly_briefs') AS t`)).toEqual([{ t: null }]);
    await m.ddl.ensureWeeklyBriefTables();
    await m.ddl.ensureWeeklyBriefTables();
    expect((await q(`SELECT to_regclass('public.weekly_briefs')::text AS t`))[0]!.t).toBe('weekly_briefs');
    const cols = await q<{ column_name: string; data_type: string }>(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'weekly_briefs' ORDER BY ordinal_position`);
    expect(cols.map((c) => c.column_name)).toEqual(['week_start', 'period_start', 'period_end', 'generated_at', 'status', 'payload', 'stats', 'model', 'input_tokens', 'output_tokens', 'cost_usd', 'error']);
    expect(cols.find((c) => c.column_name === 'week_start')!.data_type).toBe('date');
    expect(cols.find((c) => c.column_name === 'period_start')!.data_type).toBe('timestamp with time zone');
    await expect(q(`INSERT INTO weekly_briefs (week_start, period_start, period_end, status) VALUES ('2026-01-05', now(), now(), 'bogus')`)).rejects.toThrow();
  });

  it('seeds the fixture (re-runnable)', async () => {
    await seedWeeklyBriefFixture((t) => m.db.execute(m.sql.raw(t)));
    await seedWeeklyBriefFixture((t) => m.db.execute(m.sql.raw(t)));
    expect((await q<{ n: number }>(`SELECT count(*)::int AS n FROM articles WHERE content_hash LIKE 'wb-fixture-%'`))[0]!.n).toBe(133);
  });

  // ───────────────────────────────────────────────────────
  describe('collect (read-only aggregation)', () => {
    it('counts match the seed: [start, end) KST window, COALESCE(published_at, collected_at), excluded sources', async () => {
      const range = m.period.getWeekRange(WEEK);
      const week = await m.collect.collectWeek(range, m.period.getWeekRange(PREV));
      const cur = m.compose.splitRows(week.rows);
      const prev = m.compose.splitRows(week.prevRows);
      expect([cur.news.length, cur.videos.length, cur.papers.length]).toEqual([EXP.current.news, EXP.current.videos, EXP.current.papers]);
      expect([prev.news.length, prev.videos.length, prev.papers.length]).toEqual([EXP.prev.news, EXP.prev.videos, EXP.prev.papers]);
      const titles = new Set(week.rows.map((r) => r.title));
      expect(titles.has('WB boundary start')).toBe(true);
      expect(titles.has('WB boundary end')).toBe(true);
      expect(titles.has('WB boundary null published')).toBe(true);
      expect(titles.has('WB boundary next week')).toBe(false);
      // github 행은 수집되지만(전체 행) 분류에서 빠진다
      const gh = week.rows.find((r) => r.title === 'WB github repo');
      expect(gh && m.compose.classifyRow(gh)).toBeNull();
      expect(week.truncated).toBe(false);
      expect(week.warnings).toEqual([]);
    });

    it('separate counters: analyzed videos (any publish date), alerts, new robots, CI updates', async () => {
      const w = await m.collect.collectWeek(m.period.getWeekRange(WEEK), m.period.getWeekRange(PREV));
      expect(w.videosAnalyzed).toBe(EXP.current.videosAnalyzed);
      expect(w.prevVideosAnalyzed).toBe(EXP.prev.videosAnalyzed);
      expect(w.alerts).toBe(EXP.current.alerts);
      expect(w.prevAlerts).toBe(EXP.prev.alerts);
      expect(w.newRobots).toBe(EXP.current.newRobots);
      expect(w.ciUpdates).toBe(EXP.current.ciUpdates);
      expect(w.prevCiUpdates).toBe(EXP.prev.ciUpdates);
    });

    it('CI changes: earliest old / latest new per value, reverted values dropped, updated_at-only values have before=null', async () => {
      const w = await m.collect.collectWeek(m.period.getWeekRange(WEEK), m.period.getWeekRange(PREV));
      const byAfter = new Map(w.ciChanges.map((c) => [c.after, c]));
      expect(w.ciChanges).toHaveLength(3);
      expect(byAfter.get('C-final')).toMatchObject({ before: 'A-old', valueChanged: true, confidence: 'A', sourceUrl: 'https://example.com/ci/1' });
      expect(byAfter.get('Y2')).toMatchObject({ before: 'Y1', valueChanged: true, confidence: 'B' });
      expect(byAfter.get('Only-updated')).toMatchObject({ before: null, valueChanged: false, confidence: 'B' });
      expect(w.ciChanges.every((c) => c.company && c.item && /^\d{4}-\d{2}-\d{2}T/.test(c.changedAt))).toBe(true);
    });

    it('keywords come from article_keywords for the KST window with last week counts; representative evidence is loaded', async () => {
      const w = await m.collect.collectWeek(m.period.getWeekRange(WEEK), m.period.getWeekRange(PREV));
      const byTerm = new Map(w.keywords.map((k) => [k.term, k]));
      expect(byTerm.get('wb-tactile')).toMatchObject({ count: 40, prevCount: 30 });
      expect(byTerm.get('wb-gripper')).toMatchObject({ count: 12, prevCount: 12 });
      expect(byTerm.get('wb-newterm')).toMatchObject({ count: 9, prevCount: 0 });
      const rep = m.compose.pickRepresentativeKeyword(w.keywords)!;
      expect(rep.term).toBe('wb-tactile');
      expect(w.keywordEvidence[rep.keywordId]).toHaveLength(2);
    });

    it('company counts cover videos and news for both weeks', async () => {
      const w = await m.collect.collectWeek(m.period.getWeekRange(WEEK), m.period.getWeekRange(PREV));
      const top = [...w.companies].sort((a, b) => b.count - a.count)[0]!;
      expect(top.count).toBe(13); // 뉴스 10 + 영상 3
      expect(top.prevCount).toBe(5);
    });

    it('results do not depend on the process TZ (no local-time parsing of timestamps)', async () => {
      const prevTz = process.env.TZ;
      try {
        const shape = async () => {
          const w = await m.collect.collectWeek(m.period.getWeekRange(WEEK), m.period.getWeekRange(PREV));
          return { rows: w.rows.length, prev: w.prevRows.length, first: w.rows[0]!.ts, an: w.videosAnalyzed, al: w.alerts, ci: w.ciUpdates };
        };
        process.env.TZ = 'UTC';
        const a = await shape();
        process.env.TZ = 'America/Los_Angeles';
        const b = await shape();
        process.env.TZ = 'Asia/Seoul';
        const c = await shape();
        expect(b).toEqual(a);
        expect(c).toEqual(a);
      } finally {
        if (prevTz === undefined) delete process.env.TZ;
        else process.env.TZ = prevTz;
      }
    });
  });

  // ───────────────────────────────────────────────────────
  describe('generation', () => {
    it('with a fake AI client: ok, one row saved, payload matches the contract, AI called once', async () => {
      const calls = { n: 0 };
      const r = await m.svc.runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'manual' }, aiDeps(calls));
      expect(r).toMatchObject({ outcome: 'created', weekStart: WEEK, status: 'ok' });
      expect(calls.n).toBe(1);

      const rows = await q<any>(`SELECT week_start::text AS ws, status, model, input_tokens, output_tokens, cost_usd::float AS cost,
        to_char(period_start AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS ps,
        to_char(period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS pe, payload, stats, error FROM weekly_briefs`);
      expect(rows).toHaveLength(1);
      const row = rows[0];
      // AC-03: 날짜 밀림 없음, 기간은 UTC 인스턴트
      expect(row.ws).toBe('2026-10-19');
      expect(row.ps).toBe('2026-10-18T15:00:00.000Z');
      expect(row.pe).toBe('2026-10-25T14:59:59.999Z');
      expect(row.status).toBe('ok');
      expect(row.input_tokens).toBe(2500);
      expect(row.output_tokens).toBe(300);
      expect(row.cost).toBeGreaterThan(0);
      expect(row.error).toBeNull();
      expect(row.stats).toHaveProperty('candidates');

      const p = row.payload;
      expect(p.schemaVersion).toBe(1);
      expect(p.header).toMatchObject({
        weekStart: '2026-10-19', weekEnd: '2026-10-25', isoYear: 2026, weekNumber: 43,
        periodStartAt: '2026-10-18T15:00:00.000Z', periodEndAt: '2026-10-25T14:59:59.999Z', generatedAt: NOW.toISOString(),
      });
      expect(p.header.counts).toEqual({
        articles: EXP.current.news, videosNew: EXP.current.videos, videosAnalyzed: EXP.current.videosAnalyzed, papers: EXP.current.papers,
        ciUpdates: EXP.current.ciUpdates, alerts: EXP.current.alerts, newRobots: EXP.current.newRobots,
      });
      expect(p.header.deltas).toEqual({
        articles: Math.round(((43 - 30) / 30) * 1000) / 10,
        videosNew: Math.round(((25 - 13) / 13) * 1000) / 10,
        videosAnalyzed: Math.round(((10 - 4) / 4) * 1000) / 10,
        papers: Math.round(((EXP.current.papers - EXP.prev.papers) / EXP.prev.papers) * 1000) / 10,
        ciUpdates: 200,
        alerts: 50,
      });
      expectPayloadShape(p);
      // AC-05 한도
      expect(p.videos.length).toBeLessThanOrEqual(8);
      expect(p.articles.length).toBeLessThanOrEqual(12);
      expect(p.papers.length).toBeLessThanOrEqual(8);
      expect(p.ciChanges.length).toBeLessThanOrEqual(4);
      expect(p.keywords.length).toBeLessThanOrEqual(8);
      expect(p.keyMessages.length).toBeGreaterThanOrEqual(1);
      expect(p.keyMessages.length).toBeLessThanOrEqual(3);
      expect(p.keyMessages[0].kind).toBe('stat');
      expect(p.meta.aiUsed).toBe(true);
    });

    it('key message numbers are the DB aggregates (AC-07)', async () => {
      const [row] = await q<any>(`SELECT payload FROM weekly_briefs WHERE week_start = '${WEEK}'`);
      const p = row.payload;
      const domain = p.keyMessages.find((k: any) => k.candidateType === 'domain_share');
      expect(domain).toBeDefined();
      // 분자 = actuator 영상 10 + 논문 12, 분모 = 영상 25 + 뉴스 43 + 논문 12
      expect(domain.id).toBe('domain_share:actuator');
      expect(domain.bigNumber).toMatchObject({ value: '28', unit: '%' });
      expect(domain.bigNumber.caption).toBe('액추에이터 관련 22건 / 전체 80건');
      // 직전 주: (3 + 8) / (13 + 30 + 8) = 21.57% -> +5.9%p
      expect(domain.delta).toEqual({ value: '+5.9', unit: '%p', label: '지난주 대비' });
      expect(domain.basis).toBe('근거: 도메인 태그 집계 (영상 10 · 논문 12 / 전체 영상 25 · 기사 43 · 논문 12)');
      expect(domain.evidence.length).toBeLessThanOrEqual(3);
      // 대표 키워드 = wb-tactile (40 vs 30 = +33.3%)
      expect(p.keywords[0]).toMatchObject({ term: 'wb-tactile', count: 40, prevCount: 30, deltaPct: 33.3, direction: 'up' });
      expect(p.keywords.map((k: any) => k.term)).not.toContain('wb-rare');
      // CI 요약
      expect(p.ciSummary.updates).toBe(3);
      const ciAfter = p.ciChanges.map((c: any) => c.after);
      expect(ciAfter).toEqual(expect.arrayContaining(['C-final', 'Y2', 'Only-updated']));
      expect(p.ciChanges[0].confidence).toBe('A');
    });

    it('videos: ytimg thumbnails only (others rebuilt from videoId), domain badges, AI-irrelevant video excluded, top video not repeated', async () => {
      const [row] = await q<any>(`SELECT payload FROM weekly_briefs WHERE week_start = '${WEEK}'`);
      const p = row.payload;
      expect(p.topVideo.title).toBe('WB video 23'); // 24번은 AI 무관 판정으로 제외, 25번은 조회수 없음 -> 23번이 최다 조회
      const all = [p.topVideo, ...p.videos];
      for (const v of all) {
        expect(v.thumbnail).toMatch(/^https:\/\/i\.ytimg\.com\/vi\/WBVID\d{6}\/mqdefault\.jpg$/);
        expect(v.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=WBVID\d{6}$/);
      }
      expect(all.map((v: any) => v.title)).not.toContain('WB video 24');
      expect(p.videos.map((v: any) => v.id)).not.toContain(p.topVideo.id);
      const bucket: Record<string, number> = {};
      for (const v of p.videos) bucket[v.domain ?? 'other'] = (bucket[v.domain ?? 'other'] ?? 0) + 1;
      expect(Math.max(...Object.values(bucket))).toBeLessThanOrEqual(3);
      // 5의 배수는 원래 ytimg 가 아닌 썸네일이었다 -> videoId 로 재생성
      const five = all.find((v: any) => v.title === 'WB video 20');
      if (five) expect(five.thumbnail).toContain('WBVID000020');
    });

    it('articles: at most 3 per source, https only, source diversity', async () => {
      const [row] = await q<any>(`SELECT payload FROM weekly_briefs WHERE week_start = '${WEEK}'`);
      const per: Record<string, number> = {};
      for (const a of row.payload.articles) {
        per[a.source] = (per[a.source] ?? 0) + 1;
        expect(a.url).toMatch(/^https:\/\//);
        if (a.summaryLine) expect(Array.from(a.summaryLine as string).length).toBeLessThanOrEqual(90);
      }
      expect(Math.max(...Object.values(per))).toBeLessThanOrEqual(3);
      expect(row.payload.articles).toHaveLength(12);
      expect(row.payload.articles.map((a: any) => a.source)).not.toContain('github');
    });

    it('papers: arxiv.org https only (export.arxiv.org excluded), up to 8 with bucket cap relaxed, authors and arxivId filled', async () => {
      const [row] = await q<any>(`SELECT payload FROM weekly_briefs WHERE week_start = '${WEEK}'`);
      const papers = row.payload.papers as any[];
      expect(papers).toHaveLength(8); // 후보 11건(12번째 제외)이 전부 actuator 버킷 -> 버킷 상한 3으로는 8건이 안 차 상한을 풀어 8건
      for (const pp of papers) {
        expect(pp.url).toMatch(/^https:\/\/arxiv\.org\/abs\/2610\.\d{5}$/);
        expect(pp.arxivId).toMatch(/^2610\.\d{5}$/);
        expect(pp.title).not.toBe('Compact actuator with harmonic drive 12');
        expect(pp.domain).toBe('actuator');
        expect(pp.summaryLine).toBe('We present an actuator design.');
        expect(pp.authors === null || Array.from(pp.authors as string).length <= 120).toBe(true);
      }
      const byTitle = new Map(papers.map((pp) => [pp.title, pp]));
      const arr = [...byTitle.values()].find((pp) => /^Author \d+A, /.test(pp.authors ?? ''));
      expect(arr.authors).toMatch(/^Author (\d+)A, Author \1B, Author \1C 외 2명$/);
      expect([...byTitle.values()].some((pp) => /^Solo Author \d+$/.test(pp.authors ?? ''))).toBe(true);
    });

    it('rule-only mode (AI disabled) still generates: partial + ai_disabled, no AI call', async () => {
      const calls = { n: 0 };
      const r = await m.svc.runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'manual' }, aiDeps(calls, { WEEKLY_BRIEF_AI_ENABLED: 'false' }));
      expect(r).toMatchObject({ outcome: 'created', status: 'partial' });
      expect(calls.n).toBe(0);
      const [row] = await q<any>(`SELECT status, payload, cost_usd::float AS cost FROM weekly_briefs WHERE week_start = '${WEEK}'`);
      expect(row.status).toBe('partial');
      expect(row.cost).toBe(0);
      expect(row.payload.meta.warnings).toContain('ai_disabled');
      expect(row.payload.meta.aiUsed).toBe(false);
      expect(row.payload.keyMessages.length).toBeGreaterThanOrEqual(2);
      expect(row.payload.keyMessages.every((k: any) => k.generatedBy === 'rule')).toBe(true);
    });

    it('a second call without force is skipped (AI not called); force overwrites', async () => {
      const calls = { n: 0 };
      const skipped = await m.svc.runWeeklyBrief({ weekStart: WEEK, reason: 'cron' }, aiDeps(calls));
      expect(skipped.outcome).toBe('skipped_exists');
      expect(calls.n).toBe(0);
      const before = (await q<any>(`SELECT payload->'header'->>'generatedAt' AS g FROM weekly_briefs WHERE week_start = '${WEEK}'`))[0]!.g;
      const later = new Date(NOW.getTime() + 3_600_000);
      const forced = await m.svc.runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'manual' }, { ...aiDeps(calls), now: () => later });
      expect(forced).toMatchObject({ outcome: 'created', status: 'ok' });
      expect(calls.n).toBe(1);
      const after = (await q<any>(`SELECT payload->'header'->>'generatedAt' AS g, status FROM weekly_briefs WHERE week_start = '${WEEK}'`))[0]!;
      expect(after.g).toBe(later.toISOString());
      expect(after.g).not.toBe(before);
      expect(await q(`SELECT 1 FROM weekly_briefs`)).toHaveLength(1);
    });

    it('a failed forced run keeps the existing row; a failed first run stores a failed row that a scheduled run then replaces', async () => {
      const boom = { ...aiDeps({ n: 0 }), collect: async () => { throw new Error('collect exploded'); } };
      const kept = await m.svc.runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'manual' }, boom);
      expect(kept).toMatchObject({ outcome: 'failed', error: 'collect exploded' });
      expect((await q<any>(`SELECT status FROM weekly_briefs WHERE week_start = '${WEEK}'`))[0]!.status).toBe('ok');

      const failedWeek = '2026-09-28';
      const stored = await m.svc.runWeeklyBrief({ weekStart: failedWeek, reason: 'cron' }, boom);
      expect(stored.outcome).toBe('failed');
      expect((await q<any>(`SELECT status, error, payload FROM weekly_briefs WHERE week_start = '${failedWeek}'`))[0]).toMatchObject({ status: 'failed', error: 'collect exploded', payload: {} });
      const retried = await m.svc.runWeeklyBrief({ weekStart: failedWeek, reason: 'cron' }, aiDeps({ n: 0 }));
      expect(retried.outcome).toBe('created');
      expect((await q<any>(`SELECT status FROM weekly_briefs WHERE week_start = '${failedWeek}'`))[0]!.status).not.toBe('failed');
      await q(`DELETE FROM weekly_briefs WHERE week_start = '${failedWeek}'`);
    });

    it('two simultaneous calls: exactly one runs, the other is already_running (AC-15)', async () => {
      const calls = { n: 0 };
      const deps = aiDeps(calls);
      const [a, b] = await Promise.all([
        m.svc.runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'cron' }, deps),
        m.svc.runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'manual' }, deps),
      ]);
      expect([a.outcome, b.outcome].sort()).toEqual(['already_running', 'created']);
      expect(calls.n).toBe(1);
    });

    it('another holder of the advisory lock (another instance) -> skipped_locked, nothing written', async () => {
      const pg = (await import('pg')).default;
      const other = new pg.Client({ connectionString: TEST_URL });
      await other.connect();
      try {
        await other.query('SELECT pg_advisory_lock($1)', [m.svc.WEEKLY_BRIEF_LOCK_KEY]);
        const calls = { n: 0 };
        const before = (await q<any>(`SELECT payload->'header'->>'generatedAt' AS g FROM weekly_briefs WHERE week_start = '${WEEK}'`))[0]!.g;
        const r = await m.svc.runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'cron' }, aiDeps(calls));
        expect(r.outcome).toBe('skipped_locked');
        expect(calls.n).toBe(0);
        expect((await q<any>(`SELECT payload->'header'->>'generatedAt' AS g FROM weekly_briefs WHERE week_start = '${WEEK}'`))[0]!.g).toBe(before);
        expect(m.svc.getRunningSnapshot().running).toBe(false);
      } finally {
        await other.query('SELECT pg_advisory_unlock($1)', [m.svc.WEEKLY_BRIEF_LOCK_KEY]);
        await other.end();
      }
      // 락이 풀리면 다시 실행된다
      expect((await m.svc.runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'cron' }, aiDeps({ n: 0 }))).outcome).toBe('created');
    });

    it('a week with no data is saved as partial/no_data with every section empty', async () => {
      const emptyWeek = '2026-01-05';
      const r = await m.svc.runWeeklyBrief({ weekStart: emptyWeek, reason: 'manual' }, aiDeps({ n: 0 }));
      expect(r).toMatchObject({ outcome: 'created', status: 'partial' });
      const [row] = await q<any>(`SELECT payload FROM weekly_briefs WHERE week_start = '${emptyWeek}'`);
      const p = row.payload;
      expect(p.header.weekNumber).toBe(2);
      expect(p.keyMessages).toEqual([]);
      expect(p.topVideo).toBeNull();
      expect([p.ciChanges, p.keywords, p.videos, p.articles, p.papers].every((a: unknown[]) => a.length === 0)).toBe(true);
      expect(p.meta.warnings).toContain('no_data');
      await q(`DELETE FROM weekly_briefs WHERE week_start = '${emptyWeek}'`);
    });

    it('writes the weekly-brief:last marker after every run', async () => {
      const r = await m.svc.runWeeklyBrief({ weekStart: WEEK, reason: 'cron' }, aiDeps({ n: 0 })); // 이미 있으므로 skipped_exists
      const [row] = await q<any>(`SELECT summary FROM data_migrations WHERE key = 'weekly-brief:last'`);
      expect(row.summary).toMatchObject({ weekStart: WEEK, outcome: 'skipped_exists', reason: 'cron', finishedAt: r.lastRun!.finishedAt });
      const fresh = await m.svc.runWeeklyBrief({ weekStart: WEEK, force: true, reason: 'manual' }, aiDeps({ n: 0 }));
      const [row2] = await q<any>(`SELECT summary FROM data_migrations WHERE key = 'weekly-brief:last'`);
      expect(row2.summary).toMatchObject({ weekStart: WEEK, outcome: 'created', status: 'ok', reason: 'manual', costUsd: fresh.lastRun!.costUsd });
    });
  });

  // ───────────────────────────────────────────────────────
  describe('HTTP (Fastify + real DB)', () => {
    let adminToken = '';
    const headers = () => ({ authorization: `Bearer ${adminToken}` });

    beforeAll(async () => {
      process.env.WEEKLY_BRIEF_AI_ENABLED = 'false'; // 라우트 테스트에서 실제 AI 호출 방지
      delete process.env.ANTHROPIC_API_KEY;
      const Fastify = (await import('fastify')).default;
      const { weeklyBriefRoutes, weeklyBriefAdminRoutes } = await import('../../routes/weekly-brief.js');
      const { authService } = await import('../../services/auth.service.js');
      adminToken = (authService as any).generateToken({ userId: '00000000-0000-4000-8000-0000000000aa', email: 'wb-admin@example.com', role: 'admin', permissions: ['read', 'write', 'admin'] });
      app = Fastify();
      app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
        try {
          done(null, body ? JSON.parse(body as string) : {});
        } catch (err) {
          done(err as Error, undefined);
        }
      });
      await app.register(weeklyBriefRoutes, { prefix: '/api/weekly-brief' });
      await app.register(weeklyBriefAdminRoutes, { prefix: '/api/admin/weekly-brief' });
      await app.ready();

      // 이웃 주 확인용: 직전 주(10/12) 브리프 생성, 실패 행(10/05), 아주 오래된 주
      await m.svc.runWeeklyBrief({ weekStart: PREV, force: true, reason: 'manual' }, aiDeps({ n: 0 }));
      await q(`INSERT INTO weekly_briefs (week_start, period_start, period_end, status, error) VALUES ('2026-10-05', '2026-10-04T15:00:00Z', '2026-10-11T14:59:59.999Z', 'failed', 'x')`);
    });

    const get = (url: string, auth = true) => app!.inject({ method: 'GET', url, headers: auth ? headers() : {} });

    it('401 without a token on every endpoint', async () => {
      for (const url of ['/api/weekly-brief/latest', `/api/weekly-brief/${WEEK}`, '/api/weekly-brief', '/api/admin/weekly-brief/status']) {
        expect((await get(url, false)).statusCode).toBe(401);
      }
      expect((await app!.inject({ method: 'POST', url: '/api/admin/weekly-brief/generate', payload: {} })).statusCode).toBe(401);
    });

    it('GET /latest returns the newest ok/partial brief with neighbours, and no internal fields', async () => {
      const res = await get('/api/weekly-brief/latest');
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toMatchObject({ weekStart: WEEK, status: 'ok', prevWeekStart: PREV, nextWeekStart: null });
      expect(Object.keys(body).sort()).toEqual(['generatedAt', 'model', 'nextWeekStart', 'payload', 'prevWeekStart', 'status', 'weekStart']);
      for (const forbidden of ['inputTokens', 'outputTokens', 'costUsd', 'cost_usd', '"stats"', 'input_tokens']) expect(res.body).not.toContain(forbidden);
      expect(body.weekStart).toBe('2026-10-19'); // 날짜가 밀리지 않는다
      expectPayloadShape(body.payload);
    });

    it('GET /:weekStart covers prev/next neighbours, 404 for failed or missing weeks, 400 for non-Mondays', async () => {
      const prev = await get(`/api/weekly-brief/${PREV}`);
      expect(prev.statusCode).toBe(200);
      expect(prev.json()).toMatchObject({ weekStart: PREV, prevWeekStart: null, nextWeekStart: WEEK });
      expect((await get('/api/weekly-brief/2026-10-05')).statusCode).toBe(404); // failed
      expect((await get('/api/weekly-brief/2025-01-06')).statusCode).toBe(404);
      const bad = await get('/api/weekly-brief/2026-10-20');
      expect(bad.statusCode).toBe(400);
      expect(bad.json()).toEqual({ error: 'invalid_week_start' });
    });

    it('GET /?limit lists newest first, skips failed rows, clamps the limit', async () => {
      const res = await get('/api/weekly-brief?limit=26');
      expect(res.statusCode).toBe(200);
      const items = res.json().items;
      expect(items.map((i: any) => i.weekStart)).toEqual([WEEK, PREV]);
      expect(items[0]).toMatchObject({ weekEnd: '2026-10-25', isoYear: 2026, weekNumber: 43, status: 'ok' });
      expect(items[0].counts).toMatchObject({ articles: EXP.current.news, videosNew: EXP.current.videos, papers: EXP.current.papers });
      expect(items[1]).toMatchObject({ weekEnd: '2026-10-18', weekNumber: 42 });
      expect((await get('/api/weekly-brief?limit=1')).json().items).toHaveLength(1);
      expect((await get('/api/weekly-brief?limit=0')).json().items).toHaveLength(1);
      expect((await get('/api/weekly-brief?limit=999')).statusCode).toBe(200);
    });

    it('GET /status reports idle state, the target week and config for admins', async () => {
      const res = await get('/api/admin/weekly-brief/status');
      expect(res.statusCode).toBe(200);
      const s = res.json();
      expect(s).toMatchObject({ running: false, phase: 'idle', current: null });
      expect(s.targetWeekStart).toBe(m.period.lastCompletedWeekStart(new Date()));
      expect(typeof s.targetExists).toBe('boolean');
      expect(s.config).toMatchObject({ cron: '0 8 * * 1', aiEnabled: false });
      expect(s.config.budget.limitUsd).toBeGreaterThan(0);
      expect(s.stored).toMatchObject({ status: expect.stringMatching(/^(ok|partial|failed)$/) });
      expect(s.lastRun).toMatchObject({ outcome: expect.any(String) });
    });

    it('POST /generate: 400s, 200 skipped exists, then 202 + polling phases -> idle (AC-23), 409 while running', async () => {
      const post = (payload: unknown) => app!.inject({ method: 'POST', url: '/api/admin/weekly-brief/generate', headers: headers(), payload: payload as any });
      expect((await post({ weekStart: '2026-10-20' })).json()).toEqual({ error: 'invalid_week_start' });
      const future = m.period.addDaysYmd(m.period.mondayOfYmd(m.period.kstYmd(new Date())), 7 * 52);
      const notComplete = await post({ weekStart: future });
      expect(notComplete.statusCode).toBe(400);
      expect(notComplete.json()).toEqual({ error: 'week_not_complete' });
      const thisMonday = m.period.mondayOfYmd(m.period.kstYmd(new Date()));
      expect((await post({ weekStart: thisMonday })).json()).toEqual({ error: 'week_not_complete' });

      const exists = await post({ weekStart: WEEK });
      expect(exists.statusCode).toBe(200);
      expect(exists.json()).toEqual({ started: false, skipped: 'exists', weekStart: WEEK });

      const started = await post({ weekStart: WEEK, force: true });
      expect(started.statusCode).toBe(202);
      expect(started.json()).toMatchObject({ started: true, weekStart: WEEK, force: true });
      const conflict = await post({ weekStart: WEEK, force: true });
      expect(conflict.statusCode).toBe(409);
      expect(conflict.json()).toEqual({ error: 'already_running' });

      const phases = new Set<string>();
      for (let i = 0; i < 400; i++) {
        const s = (await get('/api/admin/weekly-brief/status')).json();
        phases.add(s.phase);
        if (!s.running) break;
        await new Promise((r) => setTimeout(r, 5));
      }
      const final = (await get('/api/admin/weekly-brief/status')).json();
      expect(final).toMatchObject({ running: false, phase: 'idle', current: null });
      expect(phases.has('idle')).toBe(true);
      expect(final.lastRun).toMatchObject({ weekStart: WEEK, reason: 'manual', outcome: 'created', status: 'partial' });
      expect(final.lastRun.warnings).toContain('ai_disabled');
      expect(final.lastRun.durationMs).toBeGreaterThanOrEqual(0);
      // 규칙 전용(partial) 결과가 저장되었다
      const latest = (await get('/api/weekly-brief/latest')).json();
      expect(latest.status).toBe('partial');
      expect(latest.payload.meta.warnings).toContain('ai_disabled');
    });

    it('the manual path works when the scheduler is disabled (DISABLE_SCHEDULER=true) (AC-18)', async () => {
      const prev = process.env.DISABLE_SCHEDULER;
      process.env.DISABLE_SCHEDULER = 'true';
      try {
        const res = await app!.inject({ method: 'POST', url: '/api/admin/weekly-brief/generate', headers: headers(), payload: { weekStart: PREV, force: true } });
        expect(res.statusCode).toBe(202);
        for (let i = 0; i < 400 && m.svc.getRunningSnapshot().running; i++) await new Promise((r) => setTimeout(r, 5));
        const s = (await get('/api/admin/weekly-brief/status')).json();
        expect(s.config.schedulerEnabled).toBe(false);
        expect(s.lastRun).toMatchObject({ weekStart: PREV, outcome: 'created' });
      } finally {
        if (prev === undefined) delete process.env.DISABLE_SCHEDULER;
        else process.env.DISABLE_SCHEDULER = prev;
      }
    });
  });
});

/** payload 구조가 types/weekly-brief.ts 의 WeeklyBriefPayload 와 일치하는지(런타임 검사) */
function expectPayloadShape(p: any): void {
  const isStr = (v: unknown) => typeof v === 'string';
  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const strOrNull = (v: unknown) => v === null || isStr(v);
  expect(Object.keys(p).sort()).toEqual(['articles', 'ciChanges', 'ciSummary', 'header', 'keyMessages', 'keywords', 'meta', 'papers', 'schemaVersion', 'topVideo', 'videos']);
  expect(p.schemaVersion).toBe(1);
  const h = p.header;
  for (const k of ['weekStart', 'weekEnd', 'periodStartAt', 'periodEndAt', 'generatedAt']) expect(isStr(h[k])).toBe(true);
  expect(isNum(h.isoYear) && isNum(h.weekNumber)).toBe(true);
  for (const k of ['articles', 'videosNew', 'videosAnalyzed', 'papers', 'ciUpdates', 'alerts']) expect(isNum(h.counts[k])).toBe(true);
  for (const k of ['articles', 'videosNew', 'videosAnalyzed', 'papers', 'ciUpdates', 'alerts']) expect(h.deltas[k] === null || isNum(h.deltas[k])).toBe(true);
  for (const km of p.keyMessages) {
    expect(['domain_share', 'keyword_surge', 'ci_change', 'top_company', 'volume_change']).toContain(km.candidateType);
    expect(['stat', 'cause_effect']).toContain(km.kind);
    expect(['ai', 'rule']).toContain(km.generatedBy);
    expect([km.id, km.headline, km.basis, km.bigNumber.value, km.bigNumber.unit, km.bigNumber.caption].every(isStr)).toBe(true);
    expect(Array.from(km.headline as string).length).toBeLessThanOrEqual(60);
    expect(Array.from(km.bigNumber.caption as string).length).toBeLessThanOrEqual(50);
    expect(km.evidence.length).toBeLessThanOrEqual(3);
    for (const e of km.evidence) {
      expect(['video', 'article', 'ci', 'keyword']).toContain(e.type);
      expect(isStr(e.id) && isStr(e.title) && strOrNull(e.url)).toBe(true);
      if (e.url) expect(e.url).toMatch(/^https:\/\//);
    }
    if (km.delta) expect([km.delta.value, km.delta.unit, km.delta.label].every(isStr)).toBe(true);
    expect(km.note === undefined || strOrNull(km.note)).toBe(true);
  }
  const video = (v: any) => {
    expect([v.id, v.title].every(isStr) && strOrNull(v.channel) && strOrNull(v.publishedAt) && strOrNull(v.url) && strOrNull(v.thumbnail)).toBe(true);
    expect(v.views === null || isNum(v.views)).toBe(true);
    expect(typeof v.analyzed).toBe('boolean');
    expect(v.domain === null || ['hand', 'actuator', 'rfm', 'expo', 'production'].includes(v.domain)).toBe(true);
  };
  if (p.topVideo) {
    video(p.topVideo);
    expect(p.topVideo.durationSec === null || isNum(p.topVideo.durationSec)).toBe(true);
    expect(strOrNull(p.topVideo.analysisLine)).toBe(true);
  }
  p.videos.forEach(video);
  for (const c of p.ciChanges) {
    expect([c.id, c.company, c.item, c.after, c.changedAt].every(isStr) && strOrNull(c.robot) && strOrNull(c.layer) && strOrNull(c.before) && strOrNull(c.sourceName) && strOrNull(c.sourceUrl)).toBe(true);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(c.confidence);
    expect(Array.from(c.after as string).length).toBeLessThanOrEqual(120);
  }
  expect(isNum(p.ciSummary.updates) && isNum(p.ciSummary.companies)).toBe(true);
  for (const k of p.keywords) {
    expect([k.keywordId, k.term].every(isStr) && isNum(k.count) && isNum(k.prevCount)).toBe(true);
    expect(k.deltaPct === null || isNum(k.deltaPct)).toBe(true);
    expect(['up', 'down', 'new', 'flat']).toContain(k.direction);
  }
  for (const a of p.articles) {
    expect([a.id, a.title, a.source, a.url].every(isStr) && strOrNull(a.publishedAt) && strOrNull(a.summaryLine)).toBe(true);
    expect(a.domain === null || ['hand', 'actuator', 'rfm', 'expo', 'production'].includes(a.domain)).toBe(true);
  }
  for (const pp of p.papers) {
    expect([pp.id, pp.title, pp.url].every(isStr) && strOrNull(pp.authors) && strOrNull(pp.publishedAt) && strOrNull(pp.arxivId) && strOrNull(pp.summaryLine)).toBe(true);
    expect(pp.url).toMatch(/^https:\/\/arxiv\.org\//);
    expect(pp.domain === null || ['hand', 'actuator', 'rfm', 'expo', 'production'].includes(pp.domain)).toBe(true);
  }
  expect(typeof p.meta.aiUsed).toBe('boolean');
  expect(isNum(p.meta.ruleBasedMessages)).toBe(true);
  expect(Array.isArray(p.meta.warnings)).toBe(true);
  expect(typeof p.meta.truncated).toBe('boolean');
}
