/**
 * ARGOS_I 초기 적재용 전체 DB 덤프 라우트.
 *
 *  - GET /api/argos-i/export/full-db/manifest  사전 확인 (슬롯·락 없음, 읽기 전용 카탈로그 조회)
 *  - GET /api/argos-i/export/full-db.zip[?tables=a,b]  스트리밍 ZIP (ARGOS_I_FULL_DB_ENABLED=true 일 때만)
 *
 * 새 플러그인 컨텍스트를 만들지 않는다: argosIRoutes 본문에서 `addHook('preHandler', requireArgosIToken)` 뒤에 호출되므로
 * 두 라우트 모두 토큰 인증(503/401/429)을 먼저 거친다. 정적 경로라서 `/export/:name`·`/export/:date/:file` 보다 우선한다.
 * 판정 순서: 인증 → 스위치 → HEAD 분기 → tables 검증 → 슬롯·트랜잭션. 응답·로그에 토큰·내부 오류 메시지를 싣지 않는다.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { FULL_DB_RETRY_AFTER_SEC, TABLE_NAME_RE, getTableExclusionReason, isFullDbEnabled } from '../services/argos-i-full-db-config.js';
import { getFullDbPreview, logFullDbRejected, openFullDbDump } from '../services/argos-i-full-db.service.js';
import { formatDumpTimestamp } from '../services/argos-i-full-db-zip.js';
import { formatLogLine } from '../services/ops-log.util.js';

const MAX_TABLES_PARAM = 200;
const MAX_UNKNOWN_ECHO = 50;

function noStore(reply: FastifyReply): FastifyReply {
  return reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
}

type TablesParse = { ok: true; tables: string[] | undefined } | { ok: false; unknown: string[] };

/** `?tables=a,b` 파싱. 형식이 틀렸거나 제외 테이블이면 거부한다 (존재 여부는 서비스가 스냅샷 안에서 판정) */
export function parseTablesParam(raw: unknown): TablesParse {
  if (raw === undefined) return { ok: true, tables: undefined };
  const value = Array.isArray(raw) ? raw.join(',') : typeof raw === 'string' ? raw : '';
  const names = value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (names.length === 0 || names.length > MAX_TABLES_PARAM) return { ok: false, unknown: names.slice(0, MAX_UNKNOWN_ECHO).map((n) => n.slice(0, 64)) };
  const bad = [...new Set(names)].filter((n) => !TABLE_NAME_RE.test(n) || getTableExclusionReason(n) !== null);
  if (bad.length > 0) return { ok: false, unknown: bad.slice(0, MAX_UNKNOWN_ECHO).map((n) => n.slice(0, 64)) };
  return { ok: true, tables: [...new Set(names)] };
}

export function registerArgosIFullDbRoutes(fastify: FastifyInstance): void {
  fastify.get<{ Querystring: { exact?: string } }>('/export/full-db/manifest', async (request, reply) => {
    try {
      const exact = String(request.query?.exact ?? '').toLowerCase() === 'true';
      const body = await getFullDbPreview({ exact });
      return noStore(reply).type('application/json; charset=utf-8').send(JSON.stringify(body));
    } catch (err) {
      console.error(formatLogLine('ArgosIFullDb', { event: 'preview_failed', message: (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 300) }));
      return noStore(reply).status(500).send({ error: 'full_db_preview_failed' });
    }
  });

  fastify.get<{ Querystring: { tables?: string | string[] } }>('/export/full-db.zip', async (request: FastifyRequest<{ Querystring: { tables?: string | string[] } }>, reply: FastifyReply) => {
    if (!isFullDbEnabled()) {
      logFullDbRejected('disabled');
      return noStore(reply).status(503).send({ error: 'full_db_disabled' });
    }

    // HEAD 는 헤더만. DB·슬롯을 쓰지 않는다 (Fastify 의 자동 HEAD 가 이 핸들러를 실행하므로 명시 분기)
    if (request.method === 'HEAD') {
      const stamp = formatDumpTimestamp(new Date());
      return noStore(reply)
        .header('Content-Disposition', `attachment; filename="argos-i-full-db_${stamp}.zip"`)
        .type('application/zip')
        .status(200)
        .send();
    }

    const parsed = parseTablesParam(request.query?.tables);
    if (!parsed.ok) {
      logFullDbRejected('invalid_tables');
      return noStore(reply).status(400).send({ error: 'invalid_tables', unknown: parsed.unknown });
    }

    let result;
    try {
      result = await openFullDbDump({ tables: parsed.tables });
    } catch {
      // 상세 원인은 서비스가 이미 로그로 남겼다. 내부 메시지는 응답에 넣지 않는다
      return noStore(reply).status(500).send({ error: 'full_db_failed' });
    }
    if (!result.ok) {
      if (result.reason === 'in_progress') {
        return noStore(reply).status(409).header('Retry-After', String(FULL_DB_RETRY_AFTER_SEC)).send({ error: 'full_db_in_progress' });
      }
      return noStore(reply).status(400).send({ error: 'invalid_tables', unknown: result.unknown.slice(0, MAX_UNKNOWN_ECHO).map((n) => n.slice(0, 64)) });
    }

    // 응답이 끝나기 전에 연결이 닫히면 스트림을 닫아 커서·트랜잭션·락을 반환한다 (스트림이 아직 소비되기 전 끊김 포함)
    let finished = false;
    reply.raw.once('finish', () => {
      finished = true;
    });
    reply.raw.once('close', () => {
      if (!finished) result.abort();
    });

    return noStore(reply)
      .header('Content-Disposition', `attachment; filename="argos-i-full-db_${formatDumpTimestamp(result.generatedAt)}.zip"`)
      .header('X-Argos-I-Dump-Generated-At', result.generatedAt.toISOString())
      .type('application/zip')
      .send(result.stream);
  });
}
