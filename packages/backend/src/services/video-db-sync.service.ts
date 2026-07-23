/**
 * VideoDbSyncService — 영상 수집 결과를 내부 카탈로그 DB에 연동
 *
 * 영상 태깅(video-tagging) 이후 실행되어:
 *  1. 기업 자동 생성 — 큐레이션된 채널의 회사가 companies에 없으면 생성 (안전: 관찰 대상 목록)
 *  2. 영상 ↔ 기업 링크 — articles.company_id 및 article_companies 연결
 *  3. 영상 ↔ 로봇 링크 — aiTags.robots를 기존 humanoid_robots에 퍼지 매칭해 article_robot_tags 연결
 *  4. 미등록 로봇 후보큐 — 카탈로그에 없는 로봇명은 ci_staging(new_robot, pending)에 적재.
 *     타임라인/리스트 오염 방지를 위해 자동 생성하지 않고 관리자 승인 시 승격한다.
 *
 * 카탈로그(humanoid_robots)에 직접 INSERT하는 것은 승인 단계뿐이다.
 */

import { sql, eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { articles, companies, humanoidRobots, articleRobotTags, articleCompanies, ciStaging } from '../db/schema.js';
import { entityLinkerService } from './entity-linker.service.js';

type ChannelDomain = 'robot' | 'hand' | 'rfm' | 'actuator';

const DOMAIN_TO_CATEGORY: Record<ChannelDomain, string> = {
  robot: 'robot',
  rfm: 'rfm',
  hand: 'actuator',
  actuator: 'actuator',
};

// 큐레이션 채널의 회사 국가 (companies.country는 notNull) — 신규 생성 시 기본값.
// 기존 회사는 건드리지 않으며, 누락 시 'Other'. (부팅 시 fixCompanyCountries가 추가 보정)
const COMPANY_COUNTRY: Record<string, string> = {
  PSYONIC: 'USA',
  'Shadow Robot': 'UK',
  'Inspire Robots': 'China',
  Robotiq: 'Canada',
  Tesollo: 'South Korea',
  'Wonik Robotics': 'South Korea',
  'Google DeepMind': 'USA',
  NVIDIA: 'USA',
  'Toyota Research Institute': 'USA',
  'Physical Intelligence': 'USA',
  'Skild AI': 'USA',
  'HEBI Robotics': 'USA',
  maxon: 'Switzerland',
  'Harmonic Drive': 'Japan',
};

interface SyncResult {
  companiesCreated: string[];
  videosLinkedToCompany: number;
  videosLinkedToRobot: number;
  robotCandidatesQueued: string[];
}

// 로봇 모델명으로 볼 수 없는 잡음 태그 배제 (일반 명사·회사명 등)
function isPlausibleRobotName(name: string): boolean {
  const n = name.trim();
  if (n.length < 2 || n.length > 40) return false;
  if (!/[A-Za-z0-9]/.test(n)) return false;
  // 일반 명사/기술 용어는 로봇 모델이 아님
  const stop = /^(robot|humanoid|robots|ai|vla|rl|manipulation|gripper|hand|arm|demo|the|new)$/i;
  if (stop.test(n)) return false;
  return true;
}

class VideoDbSyncService {
  /** 영상 메타데이터 기준으로 카탈로그 연동 실행 */
  async run(): Promise<SyncResult> {
    const result: SyncResult = {
      companiesCreated: [],
      videosLinkedToCompany: 0,
      videosLinkedToRobot: 0,
      robotCandidatesQueued: [],
    };

    // 영상 아티클 로드 (연동 대상)
    const rows = await db
      .select({ id: articles.id, companyId: articles.companyId, extractedMetadata: articles.extractedMetadata })
      .from(articles)
      .where(eq(articles.productType, 'video'));

    if (rows.length === 0) return result;

    // ── 1. 기업 자동 생성 + 캐시 ──
    const companyIdByName = new Map<string, string>();
    const existing = await db.select({ id: companies.id, name: companies.name }).from(companies);
    for (const c of existing) companyIdByName.set(c.name.toLowerCase(), c.id);

    const wantedCompanies = new Map<string, ChannelDomain>(); // name → domain
    for (const r of rows) {
      const meta = (r.extractedMetadata ?? {}) as Record<string, any>;
      const name: string | undefined = meta.mentionedCompanies?.[0] ?? meta.channel;
      const domain: ChannelDomain = (meta.domain as ChannelDomain) ?? 'robot';
      if (name) wantedCompanies.set(name, domain);
    }

    for (const [name, domain] of wantedCompanies) {
      if (companyIdByName.has(name.toLowerCase())) continue;
      try {
        const [created] = await db
          .insert(companies)
          .values({
            name,
            country: COMPANY_COUNTRY[name] ?? 'Other',
            category: DOMAIN_TO_CATEGORY[domain],
            mainBusiness: 'Robotics (auto-linked from video channel)',
          })
          .returning({ id: companies.id, name: companies.name });
        if (created) {
          companyIdByName.set(created.name.toLowerCase(), created.id);
          result.companiesCreated.push(created.name);
        }
      } catch {
        // 동시성/중복은 무시
      }
    }

    // ── 2. 영상 ↔ 기업 링크 ──
    // 카탈로그 로봇 목록(퍼지 매칭 없이 직접 이름 매칭용) 준비
    const catalogRobots = await db
      .select({ id: humanoidRobots.id, name: humanoidRobots.name })
      .from(humanoidRobots);
    const robotIdByName = new Map<string, string>();
    for (const rb of catalogRobots) robotIdByName.set(rb.name.toLowerCase(), rb.id);

    // 이미 후보큐/카탈로그에 있는 로봇명 (중복 적재 방지)
    const pendingCandidates = await db
      .select({ payload: ciStaging.payload })
      .from(ciStaging)
      .where(and(eq(ciStaging.updateType, 'new_robot'), eq(ciStaging.status, 'pending')));
    const queuedNames = new Set<string>(
      pendingCandidates.map((c) => String((c.payload as any)?.name ?? '').toLowerCase()).filter(Boolean)
    );

    for (const r of rows) {
      const meta = (r.extractedMetadata ?? {}) as Record<string, any>;
      const companyName: string | undefined = meta.mentionedCompanies?.[0] ?? meta.channel;
      const companyId = companyName ? companyIdByName.get(companyName.toLowerCase()) : undefined;

      // 2a. company_id 백필 + article_companies
      if (companyId) {
        if (!r.companyId) {
          await db.update(articles).set({ companyId }).where(eq(articles.id, r.id));
          result.videosLinkedToCompany++;
        }
        await db.insert(articleCompanies).values({ articleId: r.id, companyId }).onConflictDoNothing();
      }

      // 3. 영상 ↔ 로봇 링크 + 4. 후보큐
      const robotNames: string[] = Array.isArray(meta.aiTags?.robots) ? meta.aiTags.robots : [];
      for (const raw of robotNames) {
        const name = String(raw).trim();
        if (!isPlausibleRobotName(name)) continue;

        // 3a. 직접 이름 매칭
        let robotId = robotIdByName.get(name.toLowerCase());

        // 3b. 퍼지 매칭 (별칭·표기 차이 흡수) — humanoid_robots는 'product' 타입
        if (!robotId) {
          try {
            const candidates = await entityLinkerService.fuzzyMatch(name, 'product');
            const best = candidates?.[0];
            if (best && best.similarityScore >= 0.85 && best.entityId) {
              robotId = best.entityId;
            }
          } catch {
            // 링커 실패 무시
          }
        }

        if (robotId) {
          await db.insert(articleRobotTags).values({ articleId: r.id, robotId }).onConflictDoNothing();
          result.videosLinkedToRobot++;
        } else if (!queuedNames.has(name.toLowerCase())) {
          // 4. 미등록 로봇 → 후보큐 (자동 카탈로그 삽입 안 함)
          await db.insert(ciStaging).values({
            updateType: 'new_robot',
            sourceChannel: 'auto',
            status: 'pending',
            payload: {
              name,
              company: companyName ?? null,
              companyId: companyId ?? null,
              domain: meta.domain ?? 'robot',
              firstSeenVideoId: r.id,
              firstSeenUrl: meta.videoId ? `https://www.youtube.com/watch?v=${meta.videoId}` : null,
              detectedAt: new Date().toISOString(),
            },
          });
          queuedNames.add(name.toLowerCase());
          result.robotCandidatesQueued.push(name);
        }
      }
    }

    console.log(
      `[VideoDbSync] companies +${result.companiesCreated.length}, ` +
        `video→company ${result.videosLinkedToCompany}, video→robot ${result.videosLinkedToRobot}, ` +
        `robot candidates +${result.robotCandidatesQueued.length}`
    );
    return result;
  }

  /** 로봇 후보큐 조회 (관리자 검토용) */
  async listRobotCandidates() {
    const rows = await db
      .select()
      .from(ciStaging)
      .where(and(eq(ciStaging.updateType, 'new_robot'), eq(ciStaging.status, 'pending')));
    return rows.map((r) => ({
      id: r.id,
      ...(r.payload as Record<string, unknown>),
      createdAt: r.createdAt,
    }));
  }

  /** 후보 승인 → humanoid_robots에 승격 */
  async approveRobotCandidate(
    stagingId: string,
    overrides?: { announcementYear?: number; commercializationStage?: string; region?: string }
  ): Promise<{ robotId: string } | { error: string }> {
    const [row] = await db.select().from(ciStaging).where(eq(ciStaging.id, stagingId)).limit(1);
    if (!row || row.status !== 'pending') return { error: 'Candidate not found or already processed' };
    const payload = row.payload as Record<string, any>;

    let companyId: string | null = payload.companyId ?? null;
    if (!companyId && payload.company) {
      const [c] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(sql`lower(name) = ${String(payload.company).toLowerCase()}`)
        .limit(1);
      companyId = c?.id ?? null;
    }
    if (!companyId) return { error: 'No company for this robot; create/link company first' };

    const [created] = await db
      .insert(humanoidRobots)
      .values({
        companyId,
        name: payload.name,
        announcementYear: overrides?.announcementYear ?? new Date().getFullYear(),
        commercializationStage: overrides?.commercializationStage ?? 'prototype',
        region: overrides?.region ?? null,
        dataType: 'confirmed',
        description: `영상 채널에서 감지되어 승인된 로봇 (${payload.company ?? ''})`.trim(),
      })
      .returning({ id: humanoidRobots.id });

    // 최초 감지 영상을 로봇에 연결
    if (created && payload.firstSeenVideoId) {
      await db
        .insert(articleRobotTags)
        .values({ articleId: payload.firstSeenVideoId, robotId: created.id })
        .onConflictDoNothing();
    }

    await db
      .update(ciStaging)
      .set({ status: 'applied', appliedAt: new Date(), reviewedAt: new Date() })
      .where(eq(ciStaging.id, stagingId));

    return { robotId: created!.id };
  }

  /** 후보 반려 */
  async rejectRobotCandidate(stagingId: string): Promise<{ ok: boolean }> {
    await db
      .update(ciStaging)
      .set({ status: 'rejected', reviewedAt: new Date() })
      .where(and(eq(ciStaging.id, stagingId), eq(ciStaging.status, 'pending')));
    return { ok: true };
  }
}

export const videoDbSyncService = new VideoDbSyncService();
