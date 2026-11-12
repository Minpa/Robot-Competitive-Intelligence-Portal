/**
 * requests — ARGOS_I 요청 결과 영역 (P2, 30번째). 최근 7일 안에 종결(done/failed/rejected/cancelled)된 요청의 요약.
 *
 * 제외: note(자유 텍스트), payload_hash·멱등 해시, 승인자 라벨, 결과 본문(요약만). 거부된 요청은 저장하지 않으므로 여기에 없다.
 * 번들 스키마 버전은 올리지 않는다 (additive 영역).
 */

import type { AreaContent, AreaDef } from './argos-i-export-areas-types.js';
import { cmpStr, intOrNull, iso, kstDateTimeOfIso, str, tallyText, type MdSection, type Row } from './argos-i-export-util.js';

export interface RequestsRaw {
  /** id, type, params, status, error_code, finished_at, result */
  rows: Row[];
}

const SUMMARY_KEYS = ['recordCount', 'inserted', 'skipped', 'rejected', 'stagedCount', 'articleId', 'domain', 'days', 'itemCount'] as const;

/** 결과 JSON 에서 스칼라 요약 몇 개만 뽑는다 (본문·목록은 싣지 않는다) */
export function summarizeResult(result: unknown): Record<string, string | number | null> | null {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
  const r = result as Record<string, any>;
  const out: Record<string, string | number | null> = {};
  for (const k of SUMMARY_KEYS) {
    const v = r[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string' && v.length <= 80) out[k] = v;
  }
  const list = Array.isArray(r.items) ? r.items : Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.insightPoints) ? r.insightPoints : null;
  if (list && out.itemCount === undefined) out.itemCount = list.length;
  return Object.keys(out).length > 0 ? (sortKeys(out) as Record<string, string | number | null>) : null;
}

const targetOf = (params: unknown): string | null => {
  if (!params || typeof params !== 'object') return null;
  const p = params as Record<string, unknown>;
  const sub = p.kind ?? p.target ?? p.query;
  const id = p.id ?? p.slug ?? p.company ?? p.robot ?? p.domain ?? p.segment ?? p.since ?? null;
  return [sub, id].filter((v) => typeof v === 'string' || typeof v === 'number').join(' / ') || null;
};

/** 키 순서에 의존하지 않도록 재귀적으로 키를 정렬한다 (jsonb 캐시 vs 새로 계산한 입력의 키 순서 차이) */
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])]));
  }
  return v;
}

function buildRequests(raw: RequestsRaw): AreaContent {
  const items = raw.rows
    .map((r) => ({
      id: String(r.id),
      type: str(r, 'type', 20) ?? '',
      params: r.params && typeof r.params === 'object' ? (sortKeys(r.params) as Record<string, unknown>) : {},
      status: str(r, 'status', 16) ?? '',
      errorCode: str(r, 'error_code', 40),
      finishedAt: iso(r, 'finished_at'),
      result: summarizeResult(r.result),
    }))
    .sort((a, b) => cmpStr(b.finishedAt, a.finishedAt) || cmpStr(a.id, b.id));
  const section: MdSection = {
    heading: '최근 7일 종결 요청 (최신순)',
    columns: ['완료(KST)', '종류', '대상', '상태', '오류 코드', '결과 항목(건)'],
    rows: items.map((i) => [kstDateTimeOfIso(i.finishedAt), i.type, targetOf(i.params), i.status, i.errorCode, intOrNull(i.result?.itemCount)]),
  };
  return {
    data: { items },
    summary: [
      `최근 7일 종결 요청 ${items.length}건`,
      `상태별: ${tallyText(items.map((i) => i.status))}`,
      `종류별: ${tallyText(items.map((i) => i.type))}`,
      '요청 본문의 자유 텍스트와 승인자 정보는 포함하지 않는다',
    ],
    sections: [section],
    notes: ['`result` 는 결과 본문이 아니라 요약(건수·식별자)이다. 전체 결과는 `GET /api/argos-i/requests/{id}` 로 받는다.'],
  };
}

export const REQUESTS_AREA: AreaDef<RequestsRaw> = {
  id: 'requests',
  titleKo: 'ARGOS_I 요청 결과',
  priority: 'P2',
  areaSchemaVersion: 1,
  sourceTables: ['argos_i_requests'],
  derivedFrom: [],
  units: { finishedAt: 'ISO 8601 UTC', itemCount: '건' },
  build: buildRequests,
};
