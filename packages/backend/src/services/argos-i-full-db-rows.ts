/**
 * ARGOS_I 전체 DB 덤프 — 행 직렬화 · SELECT 목록 · JSONL (순수 함수, I/O 없음).
 *
 * 값 인코딩 표(docs/argos-i-interface.md 14.6)의 구현이다. 적재 스크립트(scripts/lib/argos-i-full-db-import-lib.mjs)의
 * decodeValue 가 이 직렬화의 정확한 역함수여야 하므로, 이 파일의 인코딩을 바꾸면 그쪽과 테스트를 함께 바꾼다.
 */

import { isScrubbedJsonKey } from './argos-i-full-db-config.js';

/** 컬럼 값을 JSONL 에 쓰는 방식 (schema.json 의 columns[].dumpEncoding) */
export type DumpEncoding =
  | 'boolean'
  | 'integer'
  | 'int8_string'
  | 'numeric_string'
  | 'float'
  | 'string'
  | 'date'
  | 'timestamp_utc'
  | 'timestamptz_utc'
  | 'json'
  | 'bytea_base64'
  | 'array_json'
  | 'text_cast';

/** to_jsonb 로 내보내도 값이 손상되지 않는 배열 요소 타입 (그 밖의 배열은 text 대체) */
const JSON_SAFE_ARRAY_ELEMENTS = new Set(['text', 'varchar', 'bpchar', 'uuid', 'name', 'int2', 'int4', 'bool']);

export function dumpEncodingForUdt(udtName: string): DumpEncoding {
  switch (udtName) {
    case 'bool':
      return 'boolean';
    case 'int2':
    case 'int4':
      return 'integer';
    case 'int8':
      return 'int8_string';
    case 'numeric':
      return 'numeric_string';
    case 'float4':
    case 'float8':
      return 'float';
    case 'text':
    case 'varchar':
    case 'bpchar':
    case 'uuid':
    case 'name':
      return 'string';
    case 'date':
      return 'date';
    case 'timestamp':
      return 'timestamp_utc';
    case 'timestamptz':
      return 'timestamptz_utc';
    case 'json':
    case 'jsonb':
      return 'json';
    case 'bytea':
      return 'bytea_base64';
    default:
      if (udtName.startsWith('_') && JSON_SAFE_ARRAY_ELEMENTS.has(udtName.slice(1))) return 'array_json';
      return 'text_cast';
  }
}

/** 이 타입 OID 들은 pg 의 기본 파서(Date/숫자) 대신 원문 문자열로 받는다: date, timestamp, timestamptz, numeric, int8 */
export const RAW_TEXT_TYPE_PARSERS: Readonly<Record<number, (value: string) => string>> = {
  20: (v) => v,
  1082: (v) => v,
  1114: (v) => v,
  1184: (v) => v,
  1700: (v) => v,
};

/** JSON null 스칼라(SQL NULL 과 구분) */
export const JSON_NULL_SENTINEL = { $jsonNull: true } as const;

export interface DumpColumn {
  name: string;
  udtName: string;
  dumpEncoding: DumpEncoding;
  /** 제외 테이블을 가리키는 nullable FK — 항상 NULL 로 내보낸다 */
  nullified?: boolean;
  /** SCRUB_JSON_COLUMNS 대상 (직렬화 뒤 키 제거) */
  scrub?: boolean;
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** 컬럼 하나의 SELECT 표현식 (alias 포함) */
export function buildSelectExpression(col: DumpColumn): string {
  const q = quoteIdent(col.name);
  if (col.nullified) return `NULL AS ${q}`;
  switch (col.dumpEncoding) {
    case 'array_json':
      return `to_jsonb(${q}) AS ${q}`;
    case 'text_cast':
      return `${q}::text AS ${q}`;
    case 'json':
      // pg 는 JSON null 스칼라와 SQL NULL 을 모두 null 로 파싱한다 → 서버에서 센티널로 바꿔 구분한다
      return col.udtName === 'json'
        ? `CASE WHEN json_typeof(${q}) = 'null' THEN '{"$jsonNull":true}'::json ELSE ${q} END AS ${q}`
        : `CASE WHEN jsonb_typeof(${q}) = 'null' THEN '{"$jsonNull":true}'::jsonb ELSE ${q} END AS ${q}`;
    default:
      return `${q} AS ${q}`;
  }
}

export function buildSelectList(columns: readonly DumpColumn[]): string {
  return columns.map(buildSelectExpression).join(', ');
}

function pad2(n: string): string {
  return n.length < 2 ? `0${n}` : n;
}

const TS_RE = /^(\d{4,}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)(?:([+-])(\d{2})(?::?(\d{2}))?(?::?(\d{2}))?)?$/;

/**
 * PG 텍스트 출력 `YYYY-MM-DD HH:MM:SS[.ffffff][+00]` → `YYYY-MM-DDTHH:MM:SS[.ffffff]Z`.
 * 소수부는 원문 그대로다. 세션 TimeZone 이 UTC 이므로 timestamptz 의 오프셋은 +00 이다 (그 외 오프셋은 `±HH:MM` 로 보존).
 * `infinity`, `-infinity`, BC 표기 등 형식이 다르면 원문 그대로 돌려준다.
 */
export function formatTimestamp(raw: string): string {
  const m = TS_RE.exec(raw);
  if (!m) return raw;
  const [, date, time, sign, hh, mm, ss] = m;
  if (!sign) return `${date}T${time}Z`;
  if (Number(hh) === 0 && Number(mm ?? 0) === 0 && Number(ss ?? 0) === 0) return `${date}T${time}Z`;
  return `${date}T${time}${sign}${pad2(hh ?? '00')}:${pad2(mm ?? '00')}`;
}

function serializeFloat(v: number): number | string {
  if (Number.isNaN(v)) return 'NaN';
  if (v === Infinity) return 'Infinity';
  if (v === -Infinity) return '-Infinity';
  return v;
}

/** 원시 값(pg 가 돌려준 값) → JSONL 에 쓸 JSON 값. NULL 은 항상 null */
export function serializeValue(encoding: DumpEncoding, raw: unknown): unknown {
  if (raw === null || raw === undefined) return null;
  switch (encoding) {
    case 'boolean':
      return Boolean(raw);
    case 'integer':
      return typeof raw === 'number' ? raw : Number(raw);
    case 'int8_string':
    case 'numeric_string':
    case 'string':
    case 'date':
    case 'text_cast':
      return typeof raw === 'string' ? raw : String(raw);
    case 'float':
      return serializeFloat(typeof raw === 'number' ? raw : Number(raw));
    case 'timestamp_utc':
    case 'timestamptz_utc':
      return formatTimestamp(typeof raw === 'string' ? raw : String(raw));
    case 'json':
    case 'array_json':
      return raw;
    case 'bytea_base64': {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
      return { $bytea: buf.toString('base64') };
    }
  }
}

/**
 * JSON 값에서 비밀 키를 재귀적으로 제거한다 (값째). 원본을 바꾸지 않고 새 값을 돌려준다.
 * 배열 안의 객체도 처리한다. 제거한 키 개수를 removed 로 센다.
 */
export function scrubJsonKeys(value: unknown): { value: unknown; removed: number } {
  let removed = 0;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
        if (isScrubbedJsonKey(k)) {
          removed += 1;
          continue;
        }
        out[k] = walk(child);
      }
      return out;
    }
    return v;
  };
  const result = walk(value);
  return { value: result, removed };
}

export interface SerializedRow {
  /** 컬럼 순서 그대로의 JSON 값 배열은 아니고 객체 — 키 순서는 columns 순서다 */
  object: Record<string, unknown>;
  /** 스크러빙으로 제거한 JSON 키 수 (컬럼별) */
  scrubbed: Record<string, number>;
}

/** rowMode:'array' 로 받은 원시 행(columns 순서) → JSON 객체 */
export function serializeRow(columns: readonly DumpColumn[], rawRow: readonly unknown[]): SerializedRow {
  const object: Record<string, unknown> = {};
  const scrubbed: Record<string, number> = {};
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!;
    let v = col.nullified ? null : serializeValue(col.dumpEncoding, rawRow[i]);
    if (col.scrub && v !== null && typeof v === 'object') {
      const r = scrubJsonKeys(v);
      v = r.value;
      if (r.removed > 0) scrubbed[col.name] = r.removed;
    }
    object[col.name] = v;
  }
  return { object, scrubbed };
}

/**
 * JSONL 한 줄 (끝 개행 포함). JSON.stringify 만 쓰며 줄바꿈은 이스케이프된다.
 * U+2028/U+2029 는 JSON 에서는 유효하지만 일부 줄 분리기(readline 등)가 줄바꿈으로 취급하므로 \u 이스케이프한다.
 */
export function encodeJsonlLine(obj: unknown): string {
  return `${JSON.stringify(obj).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')}\n`;
}
