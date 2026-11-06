/**
 * 인제스트 입력 방어용 순수 헬퍼 (DB·네트워크 접근 없음).
 *
 * 인제스트 API 는 LLM 을 부르지 않지만, 저장된 텍스트와 extractedMetadata 는 이후 모든 AI 배치의 입력이 된다.
 * 외부 에이전트가 "AI 산출물 키"를 직접 심으면 태깅/요약 배치를 건너뛰고 그 값이 하류에서 그대로 신뢰되므로,
 * 해당 키는 제거하고 warnings 에 기록한다 (저장은 진행 — PM 결정 Q16).
 */

export const INGEST_SUMMARY_MAX = 2000;
export const INGEST_CONTENT_MAX = 20000;
/** extractedMetadata 를 JSON 으로 직렬화한 크기 상한 (UTF-8 바이트) */
export const INGEST_METADATA_MAX_BYTES = 16 * 1024;

/** AI 산출물 예약 키 — 내부 배치만 쓴다 */
export const RESERVED_METADATA_KEYS: readonly string[] = [
  'aiTags',
  'aiSummaryKo',
  'aiSummaryKoGeneratedAt',
  'geminiAnalysis',
  'geminiAnalyzedAt',
  'geminiAnalysisAttempts',
  'handTopics',
  'domainTopics',
  'domainTopicsAttempts',
  'handTopicsAttempts',
  'appCaseChecked',
  'titleKo',
  'eventBrief',
  'cesDemo',
  'domainFocus',
];

/** 이벤트 키가 뒤에 붙는 예약 접두사 (eventBrief_<key> 등) */
export const RESERVED_METADATA_PREFIXES: readonly string[] = ['eventBrief_', 'eventBriefAttempts_', 'cesDemo_', 'cesDemoAttempts_'];

export function isReservedMetadataKey(key: string): boolean {
  return RESERVED_METADATA_KEYS.includes(key) || RESERVED_METADATA_PREFIXES.some((p) => key.startsWith(p));
}

export interface ReservedKeyStripResult {
  metadata: Record<string, unknown> | undefined;
  removedKeys: string[];
}

/** 최상위 예약 키를 제거한 새 객체를 돌려준다. 입력 객체는 바꾸지 않는다 */
export function stripReservedMetadataKeys(meta: Record<string, unknown> | undefined): ReservedKeyStripResult {
  if (!meta) return { metadata: meta, removedKeys: [] };
  const out: Record<string, unknown> = {};
  const removedKeys: string[] = [];
  for (const [k, v] of Object.entries(meta)) {
    if (isReservedMetadataKey(k)) removedKeys.push(k);
    else out[k] = v;
  }
  return { metadata: out, removedKeys };
}

/** 직렬화 크기(바이트). 직렬화 불가(순환 등)면 Infinity */
export function metadataByteSize(meta: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(meta) ?? '', 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
