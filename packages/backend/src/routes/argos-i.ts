/**
 * ARGOS_I 일일 스냅샷 라우트.
 *
 *  - argosIRoutes      (/api/argos-i)        : 사내 ARGOS_I 서버가 토큰(Bearer ARGOS_I_EXPORT_TOKEN)으로 pull — manifest, latest.zip, {date}.zip, {date}/{file}
 *  - argosIAdminRoutes (/api/admin/argos-i)  : 수동 생성(202)·상태 — adminOnly (admin.ts 의 /api/admin/* 다수는 preHandler 가 없으므로 반드시 명시한다)
 *
 * 관리자 JWT 로 번들을 내려받는 경로는 만들지 않는다 (다운로드는 토큰 인증 경로 하나).
 * 공통 오류 형식은 `{ error: '<code>' }`. 응답·로그에 토큰 값을 싣지 않는다.
 */

import { createHash } from 'crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authMiddleware, requireRole } from './auth.js';
import { requireArgosIToken } from './argos-i-export-auth.js';
import { registerArgosIFullDbRoutes } from './argos-i-full-db.js';
import { MANIFEST_LIST_LIMIT, resolveArgosIRetentionDays } from '../services/argos-i-export-config.js';
import {
  getArgosIExportRunStatus,
  getBundleFile,
  getBundleFiles,
  getBundleMeta,
  listBundles,
  startArgosIExportGeneration,
  toBundleSummary,
  type BundleMeta,
} from '../services/argos-i-export.service.js';
import { MAX_CONCURRENT_ZIPS, buildBundleZip } from '../services/argos-i-export-zip.js';
import { isValidYmd } from '../services/weekly-brief-period.js';
import { ARGOS_I_EXPORT_SCHEMA_VERSION, type ArgosIManifestResponse } from '../types/argos-i-export.js';

const adminOnly = [authMiddleware, requireRole('admin')];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** 허용 목록: manifest.json, README.md, <area>.md, <area>.json (영역 id 는 kebab-case) */
const FILE_RE = /^(?:manifest\.json|README\.md|[a-z0-9][a-z0-9-]{0,48}\.(?:md|json))$/;

export function isValidBundleDate(v: string): boolean {
  return DATE_RE.test(v) && isValidYmd(v);
}

export function isAllowedBundleFile(v: string): boolean {
  return FILE_RE.test(v);
}

/** If-None-Match 와 ETag 비교 (약한 비교: W/ 접두 무시, `*` 허용, 쉼표 목록) */
export function etagMatches(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const norm = (s: string) => s.trim().replace(/^W\//, '');
  const target = norm(etag);
  return ifNoneMatch.split(',').some((t) => t.trim() === '*' || norm(t) === target);
}

const CONTENT_TYPES = {
  md: 'text/markdown; charset=utf-8',
  json: 'application/json; charset=utf-8',
} as const;

/** 공통 응답 헤더 — 같은 날짜 수동 재생성 시 내용이 바뀔 수 있으므로 immutable 을 쓰지 않는다 */
function commonHeaders(reply: FastifyReply): FastifyReply {
  return reply.header('X-Content-Type-Options', 'nosniff').header('Cache-Control', 'private, no-cache');
}

let activeZips = 0;

export async function argosIRoutes(fastify: FastifyInstance) {
  // 모든 라우트에 토큰 인증을 먼저 건다 (존재 여부 확인보다 앞선다)
  fastify.addHook('preHandler', requireArgosIToken);

  fastify.get('/manifest', async (request, reply) => {
    const bundles = (await listBundles(MANIFEST_LIST_LIMIT)).map(toBundleSummary);
    const stable = {
      schemaVersion: ARGOS_I_EXPORT_SCHEMA_VERSION,
      timezone: 'Asia/Seoul' as const,
      retentionDays: resolveArgosIRetentionDays(process.env),
      scheduleHint: { generateCronKst: '07:00', recommendedPullAfterKst: '08:00' },
      latest: bundles[0] ?? null,
      bundles,
    };
    // ETag 는 serverTime 을 제외한 본문의 sha256 — 번들이 바뀌지 않으면 같은 값이다
    const etag = `"${createHash('sha256').update(JSON.stringify(stable)).digest('hex')}"`;
    commonHeaders(reply).header('ETag', etag);
    if (etagMatches(request.headers['if-none-match'], etag)) return reply.status(304).send();
    const body: ArgosIManifestResponse = {
      schemaVersion: stable.schemaVersion,
      serverTime: new Date().toISOString(),
      timezone: stable.timezone,
      retentionDays: stable.retentionDays,
      scheduleHint: stable.scheduleHint,
      latest: stable.latest,
      bundles: stable.bundles,
    };
    return reply.type('application/json; charset=utf-8').send(JSON.stringify(body));
  });

  async function sendZip(request: FastifyRequest, reply: FastifyReply, meta: BundleMeta) {
    const etag = `W/"${meta.bundleSha256}"`;
    const filename = `argos-i_${meta.date}.zip`;
    commonHeaders(reply).header('ETag', etag).header('X-Argos-I-Export-Date', meta.date);
    if (etagMatches(request.headers['if-none-match'], etag)) return reply.status(304).send();
    // HEAD 는 ZIP 을 조립하지 않는다 (헤더만)
    if (request.method === 'HEAD') {
      return reply.header('Content-Disposition', `attachment; filename="${filename}"`).type('application/zip').status(200).send();
    }
    if (activeZips >= MAX_CONCURRENT_ZIPS) {
      return reply.status(503).header('Retry-After', '5').send({ error: 'busy' });
    }
    activeZips += 1;
    try {
      const files = await getBundleFiles(meta.date);
      if (files.length === 0) return reply.status(404).send({ error: 'not_found' });
      const zip = buildBundleZip(meta.date, files);
      return reply
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', zip.length)
        .type('application/zip')
        .send(zip);
    } finally {
      activeZips -= 1;
    }
  }

  // 정적 경로(latest.zip)는 파라미터 경로(:name = "{date}.zip")보다 우선한다
  fastify.get('/export/latest.zip', async (request, reply) => {
    const [meta] = await listBundles(1);
    if (!meta) return reply.status(404).send({ error: 'no_bundle' });
    return sendZip(request, reply, meta);
  });

  fastify.get<{ Params: { name: string } }>('/export/:name', async (request, reply) => {
    const { name } = request.params;
    if (!name.endsWith('.zip')) return reply.status(404).send({ error: 'not_found' });
    const date = name.slice(0, -'.zip'.length);
    if (!isValidBundleDate(date)) return reply.status(400).send({ error: 'invalid_date' });
    const meta = await getBundleMeta(date);
    if (!meta) return reply.status(404).send({ error: 'not_found' });
    return sendZip(request, reply, meta);
  });

  fastify.get<{ Params: { date: string; file: string } }>('/export/:date/:file', async (request, reply) => {
    const { date, file } = request.params;
    if (!isValidBundleDate(date)) return reply.status(400).send({ error: 'invalid_date' });
    if (!isAllowedBundleFile(file)) return reply.status(400).send({ error: 'invalid_file' });
    const stored = await getBundleFile(date, file);
    if (!stored) return reply.status(404).send({ error: 'not_found' });
    const etag = `"${stored.sha256}"`;
    commonHeaders(reply).header('ETag', etag).header('X-Argos-I-Export-Date', date);
    if (etagMatches(request.headers['if-none-match'], etag)) return reply.status(304).send();
    return reply
      .header('Content-Disposition', `attachment; filename="${file}"`)
      .header('Content-Length', stored.content.length)
      .type(CONTENT_TYPES[stored.format])
      .send(stored.content);
  });

  // 초기 적재용 전체 DB 덤프 (14절) — 위 훅(토큰 인증) 뒤에서 등록한다. 정적 경로라 위의 파라미터 경로보다 우선한다
  registerArgosIFullDbRoutes(fastify);
}

const GenerateBodySchema = z.object({}).strict();

export async function argosIAdminRoutes(fastify: FastifyInstance) {
  fastify.post('/export/generate', { preHandler: adminOnly }, async (request, reply) => {
    const parsed = GenerateBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'invalid_body' });
    const result = await startArgosIExportGeneration({ reason: 'manual' });
    if (result.started) return reply.status(202).send({ started: true, date: result.date, startedAt: result.startedAt });
    return reply.status(409).send({ error: 'already_running' });
  });

  fastify.get('/export/status', { preHandler: adminOnly }, async () => getArgosIExportRunStatus());
}
