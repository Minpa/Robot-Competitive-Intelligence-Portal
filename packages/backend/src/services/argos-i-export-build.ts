/**
 * ARGOS_I 내보내기 빌더 — 영역 결과를 MD/JSON 파일로 렌더하고 README·manifest 를 만들어 번들로 조립한다 (순수 함수).
 *
 * 결정론: 이 모듈과 영역 빌더는 현재 시각·난수를 읽지 않는다. 시각은 BuildCtx 로만 들어온다.
 * 같은 입력(데이터 + ctx)은 같은 바이트를 낸다. 영역 파일에는 asOf / generatedAt 이 들어가므로
 * 실행 간 파일 sha256 이 달라지는 유일한 원인은 이 두 값이다 (계약 문서에 명시).
 */

import {
  ARGOS_I_EXPORT_SCHEMA_VERSION,
  type ArgosIAreaStatus,
  type ArgosIBundleStatus,
  type ArgosIManifest,
  type ArgosIManifestArea,
  type ArgosIManifestFile,
} from '../types/argos-i-export.js';
import { AREA_ID_RE, type AreaContent, type AreaDef, type BuildCtx } from './argos-i-export-areas-types.js';
import {
  EXPORT_TIMEZONE,
  cmpStr,
  kstDateTimeOfIso,
  renderMdTable,
  serializeJson,
  sha256Hex,
  toBuffer,
  type MdSection,
} from './argos-i-export-util.js';

export interface BundleFile {
  /** 날짜 폴더 기준 상대 경로 */
  path: string;
  area: string | null;
  format: 'md' | 'json';
  content: Buffer;
  sha256: string;
  byteSize: number;
  recordCount: number | null;
}

export function makeFile(path: string, area: string | null, format: 'md' | 'json', text: string, recordCount: number | null): BundleFile {
  const content = toBuffer(text);
  return { path, area, format, content, sha256: sha256Hex(content), byteSize: content.length, recordCount };
}

export interface RenderedArea {
  def: AreaDef;
  status: Exclude<ArgosIAreaStatus, 'failed'>;
  recordCount: number;
  md: BundleFile;
  json: BundleFile;
}

export type AreaOutcome = { def: AreaDef; rendered: RenderedArea } | { def: AreaDef; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// 영역 렌더
// ─────────────────────────────────────────────────────────────────────────────

function mdBullets(items: readonly string[]): string {
  return items.map((s) => `- ${s}`).join('\n');
}

function renderSection(s: MdSection): string {
  const head = `### ${s.heading}`;
  if (s.rows.length === 0) return `${head}\n\n데이터 없음`;
  return `${head}\n\n${renderMdTable(s.columns, s.rows)}${s.note ? `\n\n${s.note}` : ''}`;
}

export function renderAreaMd(def: AreaDef, content: AreaContent, ctx: BuildCtx, recordCount: number): string {
  const asOfKst = kstDateTimeOfIso(ctx.asOf) ?? '-';
  const meta = [
    `기준일(KST): ${ctx.bundleDate}`,
    `데이터 기준 시각: ${ctx.asOf} (UTC) / ${asOfKst} (KST)`,
    `스키마 버전: ${ARGOS_I_EXPORT_SCHEMA_VERSION} (영역 버전 ${def.areaSchemaVersion})`,
    `레코드 수: ${recordCount}건`,
    `대응 JSON: \`${def.id}.json\``,
    `출처 테이블: ${def.sourceTables.join(', ')}`,
  ];
  const parts = [
    `# ARGOS 데이터 스냅샷 · ${def.titleKo} (${def.id})`,
    mdBullets(meta),
    `## 요약\n\n${mdBullets(content.summary.length > 0 ? content.summary : ['요약할 데이터가 없다'])}`,
  ];
  const dataParts = ['## 데이터'];
  if (recordCount === 0) dataParts.push('데이터 없음');
  if (content.notes && content.notes.length > 0) dataParts.push(mdBullets(content.notes));
  dataParts.push(`표에는 핵심 열만 싣는다. 전체 필드는 \`${def.id}.json\` 을 참조한다. 결측은 \`-\`, 불리언은 예/아니오로 표기한다.`);
  dataParts.push(content.sections.map(renderSection).join('\n\n'));
  parts.push(dataParts.join('\n\n'));
  return `${parts.join('\n\n')}\n`;
}

export function renderAreaJson(def: AreaDef, content: AreaContent, ctx: BuildCtx, recordCount: number): string {
  return serializeJson({
    schemaVersion: ARGOS_I_EXPORT_SCHEMA_VERSION,
    areaSchemaVersion: def.areaSchemaVersion,
    area: def.id,
    bundleDate: ctx.bundleDate,
    asOf: ctx.asOf,
    generatedAt: ctx.generatedAt,
    timezone: EXPORT_TIMEZONE,
    recordCount,
    units: def.units,
    source: { tables: def.sourceTables, derivedFrom: def.derivedFrom },
    data: content.data,
  });
}

/** 영역 원자료 → 내용(AreaContent). 이 단계는 ctx.asOf / bundleDate 만 쓰고 generatedAt 은 쓰지 않는다. */
export function buildAreaContent(def: AreaDef, raw: unknown, ctx: BuildCtx): AreaContent {
  if (!AREA_ID_RE.test(def.id)) throw new Error(`invalid_area_id:${def.id}`);
  return def.build(raw, ctx);
}

/** 영역 내용 → MD/JSON 파일. recordCount 는 주 표(sections[0])의 행 수(countAllSections 영역은 모든 표 행 수의 합)로 정해져 MD 와 JSON 이 항상 일치한다. */
export function contentRecordCount(content: AreaContent): number {
  return content.countAllSections ? content.sections.reduce((n, s) => n + s.rows.length, 0) : (content.sections[0]?.rows.length ?? 0);
}

export function renderAreaContent(def: AreaDef, content: AreaContent, ctx: BuildCtx): RenderedArea {
  const recordCount = contentRecordCount(content);
  const md = makeFile(`${def.id}.md`, def.id, 'md', renderAreaMd(def, content, ctx, recordCount), recordCount);
  const json = makeFile(`${def.id}.json`, def.id, 'json', renderAreaJson(def, content, ctx, recordCount), recordCount);
  return { def, status: recordCount === 0 ? 'empty' : 'ok', recordCount, md, json };
}

/** 영역 하나를 빌드·렌더한다 (테스트·단발 사용). */
export function renderArea(def: AreaDef, raw: unknown, ctx: BuildCtx): RenderedArea {
  return renderAreaContent(def, buildAreaContent(def, raw, ctx), ctx);
}

// ─────────────────────────────────────────────────────────────────────────────
// README / manifest
// ─────────────────────────────────────────────────────────────────────────────

function areaRow(o: AreaOutcome): ManifestAreaInfo {
  if ('rendered' in o) {
    return {
      id: o.def.id, titleKo: o.def.titleKo, priority: o.def.priority, status: o.rendered.status, recordCount: o.rendered.recordCount,
      areaSchemaVersion: o.def.areaSchemaVersion, sourceTables: o.def.sourceTables, files: [o.rendered.md.path, o.rendered.json.path],
    };
  }
  return {
    id: o.def.id, titleKo: o.def.titleKo, priority: o.def.priority, status: 'failed', recordCount: 0,
    areaSchemaVersion: o.def.areaSchemaVersion, sourceTables: o.def.sourceTables, files: [],
  };
}

type ManifestAreaInfo = ArgosIManifestArea;

export function buildReadme(ctx: BuildCtx, areas: readonly ManifestAreaInfo[], status: ArgosIBundleStatus, warnings: readonly string[]): string {
  const asOfKst = kstDateTimeOfIso(ctx.asOf) ?? '-';
  const table = renderMdTable(
    ['영역', '이름', '우선순위', '상태', '레코드(건)', '파일'],
    areas.map((a) => [a.id, a.titleKo, a.priority, a.status, a.recordCount, a.files.join(', ') || null]),
  );
  const lines = [
    `# ARGOS 데이터 스냅샷 · ${ctx.bundleDate}`,
    'ARGOS 가 매일 아침(KST 07:00) 그날까지 수집·분석한 전체 데이터를 영역별 Markdown(사람·LLM 이 읽는 요약과 표)과 JSON(기계가 읽는 전체 필드) 쌍으로 묶은 번들이다.',
    [
      `- 번들 날짜(KST): ${ctx.bundleDate}`,
      `- 데이터 기준 시각: ${ctx.asOf} (UTC) / ${asOfKst} (KST) — 수집 시작 시점의 최선 노력 스냅샷이며 트랜잭션 스냅샷이 아니다`,
      `- 생성 시각: ${ctx.generatedAt} (UTC)`,
      `- 스키마 버전: ${ARGOS_I_EXPORT_SCHEMA_VERSION}`,
      `- 상태: ${status}${warnings.length > 0 ? ` (경고: ${warnings.join(', ')})` : ''}`,
      `- 생성 사유: ${ctx.reason}`,
    ].join('\n'),
    [
      '## 파일 구성',
      '',
      '- `README.md`: 이 문서',
      '- `manifest.json`: 파일 목록(경로·영역·형식·sha256·바이트 수·레코드 수), 영역 상태, 합계. manifest.json 자신은 목록에 넣지 않는다',
      '- `<영역>.md`: 영역별 요약과 핵심 열 표',
      '- `<영역>.json`: 같은 레코드 집합의 전체 필드 (공통 봉투: schemaVersion, areaSchemaVersion, area, bundleDate, asOf, generatedAt, timezone, recordCount, units, source, data)',
    ].join('\n'),
    [
      '## 규약',
      '',
      '- 시간대: JSON 의 모든 시각은 ISO 8601 UTC(`...Z`), 날짜 전용 필드는 `YYYY-MM-DD`. MD 의 날짜·시각은 KST(Asia/Seoul) 로 표기한다',
      '- 결측: JSON 은 `null`, MD 는 `-`. 빈 문자열과 NaN 은 쓰지 않는다',
      '- 단위: 각 JSON 의 `units` 와 MD 표 머리글의 괄호 표기를 따른다 (Nm, kg, cm, m/s, TOPS, USD, Wh, N, h, 점수 1~10 등)',
      '- 정렬: 영역별 기본 정렬 + id 오름차순. 같은 데이터는 같은 순서·같은 바이트로 출력된다',
      '- 무결성: `manifest.json` 의 `files[].sha256` 은 각 파일 바이트의 SHA-256(소문자 hex) 이다. 번들 식별자(`bundleSha256`)는 manifest.json 바이트의 SHA-256 이다',
      '- 같은 입력이면 영역 파일은 같은 바이트이며, 실행 간 달라지는 값은 각 파일 안의 `asOf`·`generatedAt`(MD 에서는 데이터 기준 시각) 뿐이다',
    ].join('\n'),
    [
      '## 이용 한도',
      '',
      '- 외부 공개 데이터와 ARGOS 의 파생 분석(AI 생성 요약 포함)만 담는다. 기사·논문·영상 원문(본문·초록·설명·자막)은 포함하지 않고 링크로 접근한다',
      '- 이 데이터를 사내 분석 외 목적으로 재배포하지 않는다. 썸네일은 YouTube 썸네일 URL 만 제공한다',
    ].join('\n'),
    `## 영역 목록\n\n${table}`,
  ];
  return `${lines.join('\n\n')}\n`;
}

export interface Bundle {
  status: ArgosIBundleStatus;
  warnings: string[];
  manifest: ArgosIManifest;
  /** README.md, manifest.json, 그 외 경로 오름차순 */
  files: BundleFile[];
  bundleSha256: string;
  totalBytes: number;
  fileCount: number;
}

/** 영역 결과들로 README·manifest 를 만들어 번들로 조립한다 (순수). 실패한 선택 영역은 파일 없이 manifest 에 failed 로 남는다. */
export function assembleBundle(ctx: BuildCtx, outcomes: readonly AreaOutcome[], extraWarnings: readonly string[] = []): Bundle {
  const areas = outcomes.map(areaRow);
  const failed = areas.filter((a) => a.status === 'failed');
  const warnings = [...new Set([...extraWarnings, ...failed.map((a) => `area_failed:${a.id}`)])].sort(cmpStr);
  const status: ArgosIBundleStatus = failed.length > 0 ? 'partial' : 'ok';

  const areaFiles = outcomes.flatMap((o) => ('rendered' in o ? [o.rendered.md, o.rendered.json] : []));
  const readme = makeFile('README.md', null, 'md', buildReadme(ctx, areas, status, warnings), null);
  const listed = [readme, ...areaFiles].sort((a, b) => cmpStr(a.path, b.path));
  const manifestFiles: ArgosIManifestFile[] = listed.map((f) => ({
    path: f.path, area: f.area, format: f.format, sha256: f.sha256, byteSize: f.byteSize, recordCount: f.recordCount,
  }));
  const manifest: ArgosIManifest = {
    schemaVersion: ARGOS_I_EXPORT_SCHEMA_VERSION,
    bundleDate: ctx.bundleDate,
    generatedAt: ctx.generatedAt,
    asOf: ctx.asOf,
    timezone: EXPORT_TIMEZONE,
    status,
    reason: ctx.reason,
    generator: { name: 'argos', commit: ctx.commit },
    warnings,
    areas,
    files: manifestFiles,
    totals: { fileCount: manifestFiles.length, totalBytes: manifestFiles.reduce((n, f) => n + f.byteSize, 0) },
  };
  const manifestFile = makeFile('manifest.json', null, 'json', serializeJson(manifest), null);
  const rest = areaFiles.sort((a, b) => cmpStr(a.path, b.path));
  const files = [readme, manifestFile, ...rest];
  return {
    status,
    warnings,
    manifest,
    files,
    bundleSha256: manifestFile.sha256,
    totalBytes: files.reduce((n, f) => n + f.byteSize, 0),
    fileCount: files.length,
  };
}

export { sha256Hex };
