import { describe, it, expect } from 'vitest';
import {
  RAW_TEXT_TYPE_PARSERS,
  buildSelectList,
  dumpEncodingForUdt,
  encodeJsonlLine,
  formatTimestamp,
  scrubJsonKeys,
  serializeRow,
  serializeValue,
  type DumpColumn,
} from '../../services/argos-i-full-db-rows.js';

const col = (name: string, udtName: string, extra: Partial<DumpColumn> = {}): DumpColumn => ({ name, udtName, dumpEncoding: dumpEncodingForUdt(udtName), ...extra });
const ser = (udt: string, raw: unknown) => serializeValue(dumpEncodingForUdt(udt), raw);

describe('dumpEncodingForUdt', () => {
  it.each([
    ['bool', 'boolean'],
    ['int2', 'integer'],
    ['int4', 'integer'],
    ['int8', 'int8_string'],
    ['numeric', 'numeric_string'],
    ['float4', 'float'],
    ['float8', 'float'],
    ['text', 'string'],
    ['varchar', 'string'],
    ['bpchar', 'string'],
    ['uuid', 'string'],
    ['date', 'date'],
    ['timestamp', 'timestamp_utc'],
    ['timestamptz', 'timestamptz_utc'],
    ['json', 'json'],
    ['jsonb', 'json'],
    ['bytea', 'bytea_base64'],
    ['_text', 'array_json'],
    ['_int4', 'array_json'],
    ['_uuid', 'array_json'],
    ['_jsonb', 'text_cast'],
    ['_bytea', 'text_cast'],
    ['_int8', 'text_cast'],
    ['_numeric', 'text_cast'],
    ['inet', 'text_cast'],
    ['interval', 'text_cast'],
    ['tsvector', 'text_cast'],
    ['my_enum', 'text_cast'],
  ])('%s -> %s', (udt, enc) => {
    expect(dumpEncodingForUdt(udt)).toBe(enc);
  });
});

describe('serializeValue', () => {
  it('NULL is null for every type', () => {
    for (const udt of ['bool', 'int4', 'int8', 'numeric', 'float8', 'text', 'date', 'timestamp', 'timestamptz', 'jsonb', 'bytea', '_text', 'inet']) {
      expect(ser(udt, null)).toBeNull();
      expect(ser(udt, undefined)).toBeNull();
    }
  });

  it('bool and ints stay JSON primitives', () => {
    expect(ser('bool', true)).toBe(true);
    expect(ser('bool', false)).toBe(false);
    expect(ser('int4', 42)).toBe(42);
    expect(ser('int2', -7)).toBe(-7);
  });

  it('int8 and numeric are strings that preserve precision and scale', () => {
    expect(ser('int8', '9007199254740993')).toBe('9007199254740993');
    expect(ser('numeric', '1234.50')).toBe('1234.50');
    expect(ser('numeric', 'NaN')).toBe('NaN');
    expect(ser('numeric', '-0.000')).toBe('-0.000');
  });

  it('float special values become strings', () => {
    expect(ser('float8', 1.5)).toBe(1.5);
    expect(ser('float8', NaN)).toBe('NaN');
    expect(ser('float8', Infinity)).toBe('Infinity');
    expect(ser('float4', -Infinity)).toBe('-Infinity');
  });

  it('text-like types pass through (uuid stays lowercase as PG returns it)', () => {
    expect(ser('text', 'héllo 😀')).toBe('héllo 😀');
    expect(ser('uuid', '0f8fad5b-d9cb-469f-a165-70867728950e')).toBe('0f8fad5b-d9cb-469f-a165-70867728950e');
    expect(ser('bpchar', 'ab ')).toBe('ab ');
  });

  it('date is the raw string, infinity kept', () => {
    expect(ser('date', '2026-10-29')).toBe('2026-10-29');
    expect(ser('date', 'infinity')).toBe('infinity');
    expect(ser('date', '-infinity')).toBe('-infinity');
  });

  it('timestamp gets a Z, keeps microseconds exactly and never drops digits', () => {
    expect(ser('timestamp', '2026-10-29 03:12:45')).toBe('2026-10-29T03:12:45Z');
    expect(ser('timestamp', '2026-10-29 03:12:45.123456')).toBe('2026-10-29T03:12:45.123456Z');
    expect(ser('timestamp', '2026-10-29 03:12:45.1')).toBe('2026-10-29T03:12:45.1Z');
    expect(ser('timestamp', '2026-10-29 03:12:45.120')).toBe('2026-10-29T03:12:45.120Z');
    expect(ser('timestamp', 'infinity')).toBe('infinity');
    expect(ser('timestamp', '-infinity')).toBe('-infinity');
  });

  it('timestamptz in a UTC session maps +00 to Z with microseconds', () => {
    expect(ser('timestamptz', '2026-10-29 03:12:45.123456+00')).toBe('2026-10-29T03:12:45.123456Z');
    expect(ser('timestamptz', '2026-10-29 03:12:45+00')).toBe('2026-10-29T03:12:45Z');
    expect(formatTimestamp('2026-10-29 03:12:45+09')).toBe('2026-10-29T03:12:45+09:00');
    expect(formatTimestamp('0044-03-15 12:00:00 BC')).toBe('0044-03-15 12:00:00 BC');
  });

  it('json/jsonb values are emitted as parsed values', () => {
    expect(ser('jsonb', { a: { b: [1, 2, { c: null }] } })).toEqual({ a: { b: [1, 2, { c: null }] } });
    expect(ser('jsonb', [1, 'x'])).toEqual([1, 'x']);
    expect(ser('jsonb', 'str')).toBe('str');
    expect(ser('jsonb', 7)).toBe(7);
    expect(ser('jsonb', false)).toBe(false);
    expect(ser('json', { $jsonNull: true })).toEqual({ $jsonNull: true });
  });

  it('bytea becomes {"$bytea": base64}', () => {
    expect(ser('bytea', Buffer.from([0, 1, 2, 255]))).toEqual({ $bytea: 'AAEC/w==' });
    expect(ser('bytea', Buffer.alloc(0))).toEqual({ $bytea: '' });
  });

  it('array and text-fallback values', () => {
    expect(ser('_text', ['a', null, 'c,d', '"q"'])).toEqual(['a', null, 'c,d', '"q"']);
    expect(ser('inet', '10.0.0.1/32')).toBe('10.0.0.1/32');
    expect(ser('_jsonb', '{"{\\"a\\":1}"}')).toBe('{"{\\"a\\":1}"}');
  });
});

describe('buildSelectList', () => {
  it('uses the right expression per encoding and quotes identifiers', () => {
    const sql = buildSelectList([
      col('id', 'uuid'),
      col('Weird"Name', 'text'),
      col('tags', '_text'),
      col('meta', 'jsonb'),
      col('legacy', 'json'),
      col('ip', 'inet'),
      col('created_by', 'uuid', { nullified: true }),
    ]);
    expect(sql).toContain('"id" AS "id"');
    expect(sql).toContain('"Weird""Name" AS "Weird""Name"');
    expect(sql).toContain('to_jsonb("tags") AS "tags"');
    expect(sql).toContain(`CASE WHEN jsonb_typeof("meta") = 'null' THEN '{"$jsonNull":true}'::jsonb ELSE "meta" END AS "meta"`);
    expect(sql).toContain(`CASE WHEN json_typeof("legacy") = 'null' THEN '{"$jsonNull":true}'::json ELSE "legacy" END AS "legacy"`);
    expect(sql).toContain('"ip"::text AS "ip"');
    expect(sql).toContain('NULL AS "created_by"');
    expect(sql.split(', ')).toHaveLength(7);
  });
});

describe('RAW_TEXT_TYPE_PARSERS', () => {
  it('covers date, timestamp, timestamptz, numeric, int8 and returns the raw string', () => {
    expect(Object.keys(RAW_TEXT_TYPE_PARSERS).map(Number).sort((a, b) => a - b)).toEqual([20, 1082, 1114, 1184, 1700]);
    expect(RAW_TEXT_TYPE_PARSERS[1114]!('2026-10-29 03:12:45.123456')).toBe('2026-10-29 03:12:45.123456');
  });
});

describe('serializeRow', () => {
  const columns: DumpColumn[] = [col('id', 'int4'), col('amount', 'numeric'), col('created_by', 'uuid', { nullified: true }), col('config', 'jsonb', { scrub: true }), col('note', 'text')];

  it('keeps column order, nulls the nullified FK, scrubs configured json columns and counts removals', () => {
    const { object, scrubbed } = serializeRow(columns, [1, '10.50', 'user-uuid-should-vanish', { selector: '#a', apiKey: 'k', nested: [{ Authorization: 'x', ok: 1 }] }, null]);
    expect(Object.keys(object)).toEqual(['id', 'amount', 'created_by', 'config', 'note']);
    expect(object).toEqual({ id: 1, amount: '10.50', created_by: null, config: { selector: '#a', nested: [{ ok: 1 }] }, note: null });
    expect(scrubbed).toEqual({ config: 2 });
  });

  it('does not scrub columns that are not configured', () => {
    const { object, scrubbed } = serializeRow([col('extracted_metadata', 'jsonb')], [{ apiKey: 'kept', tokens: 1 }]);
    expect(object.extracted_metadata).toEqual({ apiKey: 'kept', tokens: 1 });
    expect(scrubbed).toEqual({});
  });
});

describe('scrubJsonKeys', () => {
  it('removes keys recursively, case-insensitively, without mutating the input', () => {
    const input = { A: { Password: 1, keep: [{ API_KEY: 'x', n: 2 }] }, cookie: 'c', private_key: 'p', list: [1, 2] };
    const copy = JSON.parse(JSON.stringify(input));
    const { value, removed } = scrubJsonKeys(input);
    expect(value).toEqual({ A: { keep: [{ n: 2 }] }, list: [1, 2] });
    expect(removed).toBe(4);
    expect(input).toEqual(copy);
  });
  it('scalars and arrays of scalars pass through', () => {
    expect(scrubJsonKeys('x')).toEqual({ value: 'x', removed: 0 });
    expect(scrubJsonKeys([1, null])).toEqual({ value: [1, null], removed: 0 });
  });
});

describe('encodeJsonlLine', () => {
  it('stays on one line for newlines, U+2028/2029, quotes, emoji and lone surrogates', () => {
    const tricky = 'a\nb\r\nc\u2028d\u2029e "q" \\ 😀 \ud800 end';
    const line = encodeJsonlLine({ s: tricky, n: null });
    expect(line.endsWith('\n')).toBe(true);
    expect(line.slice(0, -1)).not.toMatch(/[\n\r\u2028\u2029]/);
    expect(JSON.parse(line).s).toBe(tricky);
    // 줄 분할이 안전하다
    expect(`${line}${line}`.split('\n')).toHaveLength(3);
  });
});
