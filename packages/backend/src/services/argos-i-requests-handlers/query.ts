/**
 * query 처리기 — 정형 조회 (AI·logUsage 호출 없음, 읽기 전용). 결과는 일일 번들의 JSON 봉투(§7.1) 형식을 재사용한다.
 *
 * 영역 빌더(HAND_BENCHMARK_AREA, CI_CHANGES_AREA)와 수집 함수(collect)·액추에이터 맵을 재사용하고 필터·상한만 얹는다.
 * 파라미터는 slug/기간/상한만 허용된다. 존재하지 않는(또는 모호한) slug 는 failed not_found.
 */

import type { ActuatorMapRobot, ActuatorSupplierProduct } from '../actuator-position-map.service.js';
import { CI_CHANGES_AREA, HAND_BENCHMARK_AREA } from '../argos-i-export-areas-catalog.js';
import type { BuildCtx } from '../argos-i-export-areas-types.js';
import { cleanLink, cleanObject, cleanText, numberRule, textRule, type ResultCtx } from '../argos-i-requests-result.js';
import { matchBySlug, slugify } from '../argos-i-requests-slug.js';
import { kstYmdOf } from '../argos-i-requests-schema.js';
import { failOutcome, okOutcome, outcomeFromError, type HandlerOutcome, type RequestHandler } from './types.js';

export const QUERY_ITEM_CAP = 50;

export interface QueryDeps {
  now(): Date;
  /** 일일 번들 수집 함수 — 'hand-benchmark' | 'ci-changes' 원자료 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collect(areaId: 'hand-benchmark' | 'ci-changes'): Promise<any>;
  getActuatorMap(): Promise<{ robots: ActuatorMapRobot[]; suppliers: ActuatorSupplierProduct[] }>;
  catalog: {
    findCompanyBySlug(slug: string): Promise<{ id: string; name: string } | null>;
  };
  recentArticles(companyId: string, since: Date, limit: number): Promise<Array<{ kind: 'news' | 'video'; title: string; url: string | null; source: string | null; publishedAt: string | null }>>;
  allowedHosts(): Promise<string[]>;
}

function envelope(name: string, now: Date, data: Record<string, unknown>, recordCount: number, tables: string[], derivedFrom: string[] = []) {
  const iso = now.toISOString();
  return {
    schemaVersion: 1,
    areaSchemaVersion: 1,
    area: name,
    bundleDate: kstYmdOf(now),
    asOf: iso,
    generatedAt: iso,
    timezone: 'Asia/Seoul',
    recordCount,
    units: { torqueNm: 'Nm', weightKg: 'kg', score: '점수(0~10)', date: 'ISO 8601 UTC' },
    source: { tables, derivedFrom },
    data,
  };
}

function buildCtx(now: Date): BuildCtx {
  const iso = now.toISOString();
  return { bundleDate: kstYmdOf(now), asOf: iso, generatedAt: iso, reason: 'manual', commit: null };
}

const ciHistoryItem = (h: Record<string, any>) => ({
  kind: 'ci_change' as const,
  title: h.item ?? '',
  detail: h.newValue ?? null,
  source: h.competitor ?? null,
  url: null,
  date: h.changedAt ?? null,
});

export function createQueryHandler(deps: QueryDeps): RequestHandler {
  const hostCtx = async (): Promise<ResultCtx> => ({ allowedHosts: await deps.allowedHosts() });

  return {
    async run(params): Promise<HandlerOutcome> {
      try {
        const now = deps.now();
        const ctx = await hostCtx();
        switch (params.query) {
          case 'company_recent': {
            const company = await deps.catalog.findCompanyBySlug(String(params.company));
            if (!company) return failOutcome('not_found');
            const weeks = Number(params.weeks ?? 8);
            const since = new Date(now.getTime() - weeks * 7 * 86_400_000);
            const [articles, ciRaw] = await Promise.all([deps.recentArticles(company.id, since, QUERY_ITEM_CAP), deps.collect('ci-changes')]);
            const history = ((CI_CHANGES_AREA.build(ciRaw, buildCtx(now)).data.history ?? []) as Array<Record<string, any>>).filter(
              (h) => slugify(String(h.competitor ?? '')) === String(params.company) && typeof h.changedAt === 'string' && new Date(h.changedAt) >= since,
            );
            const merged = [
              ...articles.map((a) => ({ kind: a.kind, title: a.title, detail: null as string | null, source: a.source, url: a.url, date: a.publishedAt })),
              ...history.map(ciHistoryItem),
            ]
              .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
              .slice(0, QUERY_ITEM_CAP);
            const items = merged
              .map((m) => ({ kind: m.kind, title: cleanText(m.title, 300), detail: cleanText(m.detail, 400), source: cleanText(m.source, 100), url: cleanLink(m.url, ctx), date: typeof m.date === 'string' ? m.date : null }))
              .filter((m) => m.title !== null);
            return okOutcome(envelope('company_recent', now, { company: { name: cleanText(company.name, 100) }, weeks, items }, items.length, ['articles', 'ci_value_history'], ['news', 'videos', 'ci-changes']));
          }

          case 'robot_actuators': {
            const map = await deps.getActuatorMap();
            const slug = String(params.robot);
            const robot = matchBySlug(map.robots, slug, (r) => [slugify(r.name), slugify(`${r.company} ${r.name}`)]);
            if (!robot) return failOutcome('not_found');
            const items = robot.actuators.slice(0, QUERY_ITEM_CAP).map((a) =>
              cleanObject(a, {
                name: textRule(120),
                vendor: textRule(120),
                type: textRule(40),
                torqueNm: numberRule(0, 100_000),
                weightKg: numberRule(0, 10_000),
                quantity: numberRule(0, 1000, true),
                usageLocation: textRule(120),
                source: textRule(20),
                confidence: textRule(5),
              }),
            );
            return okOutcome(
              envelope('robot_actuators', now, { robot: { name: cleanText(robot.name, 120), company: cleanText(robot.company, 120), actuatorTypeLabel: cleanText(robot.actuatorTypeLabel, 40) }, items }, items.length, ['humanoid_robots', 'robot_components', 'ci_values'], ['actuator-map']),
            );
          }

          case 'hand_benchmark_top': {
            const limit = Math.min(20, Number(params.limit ?? 10));
            const content = HAND_BENCHMARK_AREA.build(await deps.collect('hand-benchmark'), buildCtx(now));
            const comps = (content.data.competitors ?? []) as Array<Record<string, any>>;
            const scored = comps.map((c) => {
              const scores: Record<string, number | null> = {};
              const vals: number[] = [];
              for (const [axis, s] of Object.entries((c.scores ?? {}) as Record<string, { currentScore?: number | null }>)) {
                const v = typeof s?.currentScore === 'number' ? s.currentScore : null;
                scores[axis] = v;
                if (v !== null) vals.push(v);
              }
              return { c, scores, avg: vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null };
            });
            scored.sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1) || String(a.c.slug).localeCompare(String(b.c.slug)));
            const items = scored.slice(0, limit).map((s, i) => ({
              rank: i + 1,
              slug: cleanText(s.c.slug, 80),
              name: cleanText(s.c.name, 120),
              manufacturer: cleanText(s.c.manufacturer, 120),
              country: cleanText(s.c.country, 60),
              category: cleanText(s.c.category, 60),
              avgScore: s.avg,
              scores: s.scores,
            }));
            return okOutcome(envelope('hand_benchmark_top', now, { axes: content.data.axes, items }, items.length, ['hand_benchmark_axes', 'hand_competitors', 'hand_benchmark_scores'], ['hand-benchmark']));
          }

          case 'actuator_suppliers_by_segment': {
            const map = await deps.getActuatorMap();
            const seg = String(params.segment);
            const items = map.suppliers
              .filter((s) => s.segment === seg || s.segments.includes(seg as never))
              .sort((a, b) => a.vendor.localeCompare(b.vendor) || a.model.localeCompare(b.model))
              .slice(0, QUERY_ITEM_CAP)
              .map((s) =>
                cleanObject(s, {
                  vendor: textRule(120),
                  country: textRule(60),
                  model: textRule(120),
                  type: textRule(40),
                  peakTorqueNm: numberRule(0, 100_000),
                  continuousTorqueNm: numberRule(0, 100_000),
                  weightKg: numberRule(0, 10_000),
                  status: textRule(40),
                  targetMarket: textRule(120),
                  segment: textRule(30),
                }),
              );
            return okOutcome(envelope('actuator_suppliers_by_segment', now, { segment: seg, items }, items.length, ['actuator_vendor_markets', 'actuator_adoptions'], ['actuator-map']));
          }

          case 'ci_changes_since': {
            const since = new Date(`${String(params.since)}T00:00:00+09:00`);
            const limit = Math.min(100, Number(params.limit ?? 50));
            const company = typeof params.company === 'string' ? params.company : null;
            const history = ((CI_CHANGES_AREA.build(await deps.collect('ci-changes'), buildCtx(now)).data.history ?? []) as Array<Record<string, any>>).filter(
              (h) => typeof h.changedAt === 'string' && new Date(h.changedAt) >= since && (!company || slugify(String(h.competitor ?? '')) === company),
            );
            const items = history.slice(0, limit).map((h) => ({
              ...cleanObject(h, {
                changedAt: textRule(40),
                competitor: textRule(120),
                layer: textRule(100),
                category: textRule(200),
                item: textRule(200),
                oldValue: textRule(400),
                newValue: textRule(400),
                newConfidence: textRule(1),
                changeSource: textRule(20),
              }),
            }));
            return okOutcome(envelope('ci_changes_since', now, { since: String(params.since), items }, items.length, ['ci_value_history', 'ci_values', 'ci_competitors'], ['ci-changes']));
          }

          default:
            return failOutcome('invalid_target');
        }
      } catch (err) {
        return outcomeFromError(err);
      }
    },
  };
}
