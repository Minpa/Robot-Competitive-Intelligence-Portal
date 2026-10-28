/**
 * ARGOS_I 내보내기 영역 정의 공용 타입 + 빌더 도우미 (순수).
 */

import type { ArgosIAreaPriority, ArgosIExportReason } from '../types/argos-i-export.js';
import type { MdSection } from './argos-i-export-util.js';

/** 빌더에 주입되는 컨텍스트 — 시각은 항상 여기서만 받는다 */
export interface BuildCtx {
  /** 번들 날짜 (KST, YYYY-MM-DD) */
  bundleDate: string;
  /** 데이터 기준 시각 (수집 시작, ISO UTC) */
  asOf: string;
  /** 생성(빌드) 시각 (ISO UTC) */
  generatedAt: string;
  reason: ArgosIExportReason;
  /** RAILWAY_GIT_COMMIT_SHA 앞 7자 */
  commit: string | null;
}

/** 영역 빌더 결과. recordCount 는 sections[0].rows.length 로 정해진다 (JSON/MD 일치 보장). */
export interface AreaContent {
  /** JSON 봉투의 data */
  data: Record<string, unknown>;
  /** `## 요약` 목록 (3~8개, 숫자에 단위·기준 포함) */
  summary: string[];
  /** sections[0] 이 주 레코드 표 */
  sections: MdSection[];
  /** true 면 recordCount 를 sections[0] 이 아니라 모든 섹션 행 수의 합으로 센다 */
  countAllSections?: boolean;
  /** 표 위에 붙는 보충 설명(범례·산식 등) */
  notes?: string[];
}

export interface AreaDef<R = any> {
  id: string;
  titleKo: string;
  priority: ArgosIAreaPriority;
  areaSchemaVersion: number;
  sourceTables: string[];
  derivedFrom: string[];
  /** 단위 사전 (JSON 봉투의 units) */
  units: Record<string, string>;
  build(raw: R, ctx: BuildCtx): AreaContent;
}

/** overview 빌더가 받는 다른 영역의 결과 요약 */
export interface AreaResultSummary {
  id: string;
  titleKo: string;
  priority: ArgosIAreaPriority;
  status: 'ok' | 'empty' | 'failed';
  recordCount: number;
}

export const AREA_ID_RE = /^[a-z0-9][a-z0-9-]{0,48}$/;

/** `## 요약` 의 숫자 표기: 천 단위 구분 없이 */
export function count(n: number, unit: string): string {
  return `${n}${unit}`;
}
