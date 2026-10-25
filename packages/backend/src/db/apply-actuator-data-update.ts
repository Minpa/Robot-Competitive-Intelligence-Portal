/**
 * 로봇·액추에이터·CI 데이터 멱등 업서트 라이브러리 (부작용 없음)
 *
 * CLI(`update-actuator-data.ts`)와 기동 시 자동 적용(`actuator-auto-apply.service.ts`)이 공유한다.
 * 이 모듈은 import 만으로 아무것도 실행하지 않는다 — 최상위 main() 호출, process.exit, process.argv 접근 금지.
 *
 * 입력: `src/db/seed-data/actuator-update/robots.json`, `suppliers.json`
 *       (스키마는 actuator-update.util.ts 의 RobotsFile / SuppliersFile 참고.
 *        `*.sample.json` 은 개발용 픽스처이며 자동으로 사용되지 않는다 — 실제 파일이 없으면 에러.)
 *
 * 동작 요약
 *   robots    : companies 매칭(정규화·COMPANY_ALIASES·companyAliases; 실패 시 경고 후 해당 로봇 건너뜀,
 *               createRobotCompanies 일 때만 category 'robot' 으로 생성)
 *               → humanoid_robots(같은 회사 안에서 name/aliases 매칭; 기존 행은 비-null 값만 갱신, description 은
 *               비어있을 때만; 신규 행은 REQUIRED_NEW_ROBOT_FIELDS 가 모두 있어야 생성, dataType 'confirmed')
 *               → body_specs/hand_specs(null 은 쓰지 않음, 기존 값은 신뢰도 B 이상 신규 값만 덮어쓰기)
 *               → components(type actuator) → robot_components(usageLocation, quantity)
 *   suppliers : companies(없으면 category 'actuator' 로 생성) → products(type actuator) → product_specs.dynamicSpecs
 *               → components(동일 제품, 차트/토크밀도 분석용)
 *   components 공유 규칙: 같은 이름의 부품을 여러 로봇/공급사 레코드가 가리키면, 이 실행에서 먼저 쓴 기록(또는 더 높은
 *               신뢰도의 기록)이 값을 소유하고 나머지는 누락 키만 보충한다 (decideComponentWrite) → 재실행 시 변경 0.
 *   ci        : hw 레이어 '액추에이터' 카테고리에 항목 보장 → ci_competitors 매핑(제품명 일치 > 같은 회사 + 제품군 토큰)
 *               → ci_values 업서트(기존 값보다 신뢰도가 낮으면 건너뜀, 변경 시 ci_value_history 기록),
 *               '가격대' 항목이 있으면 가격 반영
 *   모든 쓰기는 하나의 트랜잭션. 매칭 실패는 경고로 수집. 모든 출력은 주입된 logger 를 경유한다.
 *   txHooks 로 같은 트랜잭션 안에서 중복 방지(beforeWrite)와 완료 마커 기록(afterWrite)을 할 수 있다.
 */

import fs from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, eq, sql } from 'drizzle-orm';
import { db } from './index.js';
import {
  companies,
  products,
  productSpecs,
  humanoidRobots,
  bodySpecs,
  handSpecs,
  components,
  robotComponents,
  ciCompetitors,
  ciLayers,
  ciCategories,
  ciItems,
  ciValues,
  ciValueHistory,
  type ComponentSpecs,
  type DynamicSpecs,
} from './schema.js';
import {
  type RobotsFile,
  type SuppliersFile,
  type RobotInput,
  type Counters,
  type Section,
  type Confidence,
  type CompetitorRow,
  type CompetitorMatch,
  validateRobotsFile,
  validateSuppliersFile,
  bump,
  matchCompany,
  matchRobot,
  matchByNames,
  matchCompetitors,
  missingNewRobotFields,
  normalizeCountry,
  regionToCountry,
  COMPETITOR_STRATEGY_RANK,
  robotToRowPatch,
  diffRobotRow,
  bodyToRow,
  handToRow,
  diffSpecRow,
  fieldConfidence,
  actuatorToComponentRow,
  supplierToComponentRow,
  supplierToDynamicSpecs,
  supplierToProductPatch,
  supplierComponentName,
  mergeSpecs,
  fillMissingSpecs,
  decideComponentWrite,
  confidenceRank,
  valuesEqual,
  parseInteger,
  buildCiValuesForRobot,
  shouldReplaceCiValue,
  CI_HW_LAYER_SLUG,
  CI_ACTUATOR_CATEGORY,
  CI_ACTUATOR_ITEMS,
  CI_HAND_DOF_ITEM,
  CI_PRICE_ITEM,
  ALL_SECTIONS,
} from './actuator-update.util.js';

const CHANGED_BY = 'update-actuator-data';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * 기본 입력 디렉터리 — 이 모듈 파일과 같은 디렉터리의 `seed-data/actuator-update`.
 * tsx 실행 시 src/db, 빌드 후 dist/db (build 스크립트가 seed-data 를 dist 로 복사). CJS `__dirname` 은 쓰지 않는다.
 */
export function resolveDefaultDataDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, 'seed-data', 'actuator-update');
}

export interface ApplyLogger {
  /** 행 단위 상세 (CLI 는 출력, 자동 적용은 기본 버림) */
  detail(msg: string): void;
  /** 섹션 요약 */
  info(msg: string): void;
  /** 매칭 실패 등 경고 (접두어 없는 원문) */
  warn(msg: string): void;
}

export interface ApplyResult {
  counters: Counters;
  warnings: string[];
  createdCompanies: string[];
  createdRobots: string[];
  sectionsRun: Section[];
  skipped?: true;
  dryRun: boolean;
  files: { robotsGeneratedAt: string | null; suppliersGeneratedAt: string | null };
}

export interface ApplyTxHooks {
  /** 쓰기 직전(같은 트랜잭션). 'skip' 이면 아무것도 쓰지 않고 종료 */
  beforeWrite(tx: Tx): Promise<'proceed' | 'skip'>;
  /** 모든 쓰기 직후(같은 트랜잭션, dry-run 에서는 호출되지 않음) */
  afterWrite(tx: Tx, result: ApplyResult): Promise<void>;
}

export interface ApplyOptions {
  dryRun: boolean;
  dataDir?: string;
  sections?: Iterable<Section>;
  createRobotCompanies?: boolean;
  logger: ApplyLogger;
  txHooks?: ApplyTxHooks;
}

// ------------------------------------------------------------
// 컨텍스트
// ------------------------------------------------------------

class Ctx {
  counters: Counters = {};
  warnings: string[] = [];
  createdCompanies: string[] = [];
  createdRobots: string[] = [];
  /** 이 실행에서 components 행에 기록한 최고 신뢰도 (componentId → rank). 공유 부품의 결정적 병합용 */
  componentRunConf = new Map<string, number>();
  private dryCounter = 0;
  private companyCache: CompanyRow[] | null = null;
  private componentCache: ComponentCacheRow[] | null = null;

  constructor(public tx: Tx, public dryRun: boolean, public createRobotCompanies: boolean, public logger: ApplyLogger) {}

  /** 섹션 간 공유 캐시 — dry-run 에서 앞 섹션이 "생성"한 행을 뒤 섹션도 보도록 한 번만 로드 */
  async companies(): Promise<CompanyRow[]> {
    if (!this.companyCache) {
      this.companyCache = await this.tx
        .select({ id: companies.id, name: companies.name, category: companies.category, country: companies.country })
        .from(companies);
    }
    return this.companyCache;
  }

  async actuatorComponents(): Promise<ComponentCacheRow[]> {
    if (!this.componentCache) {
      this.componentCache = await this.tx
        .select({ id: components.id, name: components.name, vendor: components.vendor, specifications: components.specifications })
        .from(components)
        .where(eq(components.type, 'actuator'));
    }
    return this.componentCache;
  }

  warn(msg: string) {
    this.warnings.push(msg);
    this.logger.warn(msg);
  }

  log(msg: string) {
    this.logger.detail(`  ${this.dryRun ? '[dry] ' : ''}${msg}`);
  }

  /** dry-run 시 부모 행이 없어도 자식 처리를 이어갈 수 있도록 가짜 id 발급 */
  dryId(label: string): string {
    this.dryCounter += 1;
    return `dry:${this.dryCounter}:${label}`;
  }

  isDryId(id: string): boolean {
    return id.startsWith('dry:');
  }
}

// ------------------------------------------------------------
// 입력 로딩
// ------------------------------------------------------------

export function loadJson<T>(filePath: string, label: string, validate: (d: unknown) => string[]): T {
  if (!fs.existsSync(filePath)) {
    const dir = path.dirname(filePath);
    const sample = path.join(dir, path.basename(filePath).replace(/\.json$/, '.sample.json'));
    throw new Error(
      `${label} 입력 파일이 없습니다: ${filePath}\n` +
        `  실제 조사 결과를 이 경로에 두거나 --data-dir 로 디렉터리를 지정하세요.` +
        (fs.existsSync(sample) ? `\n  (${path.basename(sample)} 은 개발용 샘플이며 자동으로 사용되지 않습니다.)` : ''),
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    throw new Error(`${label} JSON 파싱 실패 (${filePath}): ${(e as Error).message}`);
  }
  const errors = validate(parsed);
  if (errors.length > 0) throw new Error(`${label} 형식 오류:\n  - ${errors.join('\n  - ')}`);
  return parsed as T;
}

// ------------------------------------------------------------
// 공통: 회사 업서트
// ------------------------------------------------------------

type CompanyRow = { id: string; name: string; category: string; country: string };

/**
 * 회사 매칭. 실패 시 allowCreate 면 생성(경고 없이 "신규 생성" 목록에 기록), 아니면 경고 후 null.
 */
async function ensureCompany(
  ctx: Ctx,
  cache: CompanyRow[],
  inputName: string,
  extraNames: (string | null | undefined)[],
  category: 'robot' | 'actuator',
  country: string,
  allowCreate: boolean,
): Promise<CompanyRow | null> {
  const m = matchCompany(cache, inputName, extraNames);
  if (m) {
    if (m.strategy !== 'exact') ctx.log(`company "${inputName}" → "${m.row.name}" (${m.strategy})`);
    bump(ctx.counters, 'companies', 'skip');
    return m.row;
  }
  if (!allowCreate) {
    ctx.warn(`company 매칭 실패: "${inputName}"${extraNames.length ? ` (aliases: ${extraNames.filter(Boolean).join(', ')})` : ''} — 건너뜀 (--create-companies 로 생성 가능)`);
    return null;
  }
  const name = inputName.replace(/\s*\([^)]*\)\s*$/, '').trim() || inputName.trim();
  ctx.log(`companies 신규 생성: "${name}" (category=${category}, country=${country})`);
  ctx.createdCompanies.push(`${name} [${category}, ${country}]`);
  bump(ctx.counters, 'companies', 'insert');
  const row: CompanyRow = { id: ctx.dryId(`company:${name}`), name, category, country };
  if (!ctx.dryRun) {
    const [inserted] = await ctx.tx
      .insert(companies)
      .values({ name, category, country })
      .returning({ id: companies.id });
    row.id = inserted!.id;
  }
  cache.push(row);
  return row;
}

// ------------------------------------------------------------
// 공통: components 업서트
// ------------------------------------------------------------

type ComponentCacheRow = { id: string; name: string; vendor: string | null; specifications: ComponentSpecs | null };

async function upsertComponent(
  ctx: Ctx,
  cache: ComponentCacheRow[],
  nameCandidates: string[],
  row: { name: string; vendor: string | null; specifications: Record<string, unknown> },
): Promise<string> {
  const existing = matchByNames(cache, nameCandidates);
  const incomingConf = row.specifications.confidence as string | undefined;
  if (existing) {
    const mode = decideComponentWrite(existing.specifications?.confidence as string | undefined, ctx.componentRunConf.get(existing.id), incomingConf);
    ctx.componentRunConf.set(existing.id, Math.max(ctx.componentRunConf.get(existing.id) ?? 0, confidenceRank(incomingConf)));
    const { merged, changed } = mode === 'merge'
      ? mergeSpecs(existing.specifications ?? {}, row.specifications)
      : fillMissingSpecs(existing.specifications ?? {}, row.specifications);
    const vendorPatch = !existing.vendor && row.vendor ? row.vendor : null;
    if (!changed && !vendorPatch) {
      bump(ctx.counters, 'components', 'skip');
      return existing.id;
    }
    bump(ctx.counters, 'components', 'update');
    ctx.log(`components ${mode === 'merge' ? '갱신' : '보충(기존 값 유지, 누락 키만)'}: ${existing.name}${vendorPatch ? ` (vendor ← ${vendorPatch})` : ''}`);
    if (!ctx.dryRun) {
      await ctx.tx
        .update(components)
        .set({ specifications: merged as ComponentSpecs, ...(vendorPatch ? { vendor: vendorPatch } : {}), updatedAt: new Date() })
        .where(eq(components.id, existing.id));
    }
    existing.specifications = merged as ComponentSpecs;
    if (vendorPatch) existing.vendor = vendorPatch;
    return existing.id;
  }
  bump(ctx.counters, 'components', 'insert');
  ctx.log(`components 생성: ${row.name}`);
  const created: ComponentCacheRow = { id: ctx.dryId(`component:${row.name}`), name: row.name, vendor: row.vendor, specifications: row.specifications as ComponentSpecs };
  if (!ctx.dryRun) {
    const [ins] = await ctx.tx
      .insert(components)
      .values({ type: 'actuator', name: row.name, vendor: row.vendor, specifications: row.specifications as ComponentSpecs })
      .returning({ id: components.id });
    created.id = ins!.id;
  }
  ctx.componentRunConf.set(created.id, confidenceRank(incomingConf));
  cache.push(created);
  return created.id;
}

// ------------------------------------------------------------
// 1. robots.json
// ------------------------------------------------------------

async function runRobots(ctx: Ctx, file: RobotsFile): Promise<void> {
  ctx.logger.info(`\n=== [robots] ${file.robots.length}건 (generatedAt=${file.generatedAt ?? '?'}) ===`);
  const companyCache = await ctx.companies();
  const robotCache = await ctx.tx
    .select({
      id: humanoidRobots.id,
      companyId: humanoidRobots.companyId,
      name: humanoidRobots.name,
      announcementYear: humanoidRobots.announcementYear,
      announcementQuarter: humanoidRobots.announcementQuarter,
      status: humanoidRobots.status,
      purpose: humanoidRobots.purpose,
      locomotionType: humanoidRobots.locomotionType,
      handType: humanoidRobots.handType,
      commercializationStage: humanoidRobots.commercializationStage,
      region: humanoidRobots.region,
      description: humanoidRobots.description,
    })
    .from(humanoidRobots);
  const componentCache = await ctx.actuatorComponents();

  for (const robot of file.robots) {
    ctx.logger.detail(`\n- ${robot.company} / ${robot.name}`);
    const company = await ensureCompany(
      ctx, companyCache, robot.company, robot.companyAliases ?? [], 'robot', regionToCountry(robot.region), ctx.createRobotCompanies,
    );
    if (!company) { bump(ctx.counters, 'humanoid_robots', 'skip'); continue; }

    // humanoid_robots (반드시 같은 회사 안에서만 이름/별칭 매칭)
    const patch = robotToRowPatch(robot);
    const rm = matchRobot(robotCache, robot, company.id);
    let robotId: string;
    if (rm) {
      if (rm.strategy === 'alias') ctx.log(`robot "${robot.name}" → 기존 "${rm.row.name}" (alias)`);
      const diff = diffRobotRow(rm.row as unknown as Record<string, unknown>, patch);
      robotId = rm.row.id;
      if (Object.keys(diff).length === 0) {
        bump(ctx.counters, 'humanoid_robots', 'skip');
      } else {
        bump(ctx.counters, 'humanoid_robots', 'update');
        ctx.log(`humanoid_robots 갱신 [${Object.keys(diff).join(', ')}]`);
        if (!ctx.dryRun) {
          await ctx.tx.update(humanoidRobots).set({ ...diff, updatedAt: new Date() }).where(eq(humanoidRobots.id, robotId));
        }
        Object.assign(rm.row, diff);
      }
    } else {
      const missing = missingNewRobotFields(robot);
      if (missing.length > 0) {
        ctx.warn(`robot 신규 생성 불가 (필수 메타 누락: ${missing.join(', ')}): ${company.name} / ${robot.name}`);
        bump(ctx.counters, 'humanoid_robots', 'skip');
        continue;
      }
      bump(ctx.counters, 'humanoid_robots', 'insert');
      ctx.log(`humanoid_robots 생성: ${robot.name}`);
      ctx.createdRobots.push(`${company.name} / ${robot.name}`);
      robotId = ctx.dryId(`robot:${robot.name}`);
      if (!ctx.dryRun) {
        const [ins] = await ctx.tx
          .insert(humanoidRobots)
          .values({ companyId: company.id, name: robot.name.trim(), announcementQuarter: patch.announcementQuarter ?? 1, ...patch, dataType: 'confirmed' })
          .returning({ id: humanoidRobots.id });
        robotId = ins!.id;
      }
      robotCache.push({
        id: robotId, companyId: company.id, name: robot.name.trim(),
        announcementYear: patch.announcementYear ?? null, announcementQuarter: patch.announcementQuarter ?? 1,
        status: patch.status ?? null, purpose: patch.purpose ?? null, locomotionType: patch.locomotionType ?? null,
        handType: patch.handType ?? null, commercializationStage: patch.commercializationStage ?? null,
        region: patch.region ?? null, description: patch.description ?? null,
      });
    }

    const confOf = (prefix: string) => (field: string): Confidence => fieldConfidence(robot.sources, `${prefix}.${field}`);

    // body_specs
    const bodyRow = bodyToRow(robot.body);
    if (Object.values(bodyRow).some((v) => v !== null)) {
      const existing = ctx.isDryId(robotId) ? [] : await ctx.tx.select().from(bodySpecs).where(eq(bodySpecs.robotId, robotId)).limit(1);
      const cur = existing[0] ?? null;
      const diff = diffSpecRow(cur as Record<string, unknown> | null, bodyRow, confOf('body'));
      if (Object.keys(diff).length === 0) bump(ctx.counters, 'body_specs', 'skip');
      else if (!cur) {
        bump(ctx.counters, 'body_specs', 'insert');
        ctx.log(`body_specs 생성 [${Object.keys(diff).join(', ')}]`);
        if (!ctx.dryRun) await ctx.tx.insert(bodySpecs).values({ robotId, ...diff });
      } else {
        bump(ctx.counters, 'body_specs', 'update');
        ctx.log(`body_specs 갱신 [${Object.keys(diff).join(', ')}]`);
        if (!ctx.dryRun) await ctx.tx.update(bodySpecs).set({ ...diff, updatedAt: new Date() }).where(eq(bodySpecs.robotId, robotId));
      }
    }

    // hand_specs
    const handRow = handToRow(robot.hand, robot.handType);
    if (robot.hand && Object.values(handRow).some((v) => v !== null)) {
      const existing = ctx.isDryId(robotId) ? [] : await ctx.tx.select().from(handSpecs).where(eq(handSpecs.robotId, robotId)).limit(1);
      const cur = existing[0] ?? null;
      const diff = diffSpecRow(cur as Record<string, unknown> | null, handRow, confOf('hand'));
      if (Object.keys(diff).length === 0) bump(ctx.counters, 'hand_specs', 'skip');
      else if (!cur) {
        bump(ctx.counters, 'hand_specs', 'insert');
        ctx.log(`hand_specs 생성 [${Object.keys(diff).join(', ')}]`);
        if (!ctx.dryRun) await ctx.tx.insert(handSpecs).values({ robotId, ...diff });
      } else {
        bump(ctx.counters, 'hand_specs', 'update');
        ctx.log(`hand_specs 갱신 [${Object.keys(diff).join(', ')}]`);
        if (!ctx.dryRun) await ctx.tx.update(handSpecs).set({ ...diff, updatedAt: new Date() }).where(eq(handSpecs.robotId, robotId));
      }
    }

    // components + robot_components
    const links = ctx.isDryId(robotId)
      ? []
      : await ctx.tx
          .select({ componentId: robotComponents.componentId, usageLocation: robotComponents.usageLocation, quantity: robotComponents.quantity })
          .from(robotComponents)
          .where(eq(robotComponents.robotId, robotId));

    for (const act of robot.actuators ?? []) {
      if (!act || typeof act !== 'object') continue;
      const row = actuatorToComponentRow(act, robot, company.name);
      const componentId = await upsertComponent(ctx, componentCache, [row.name], row);

      const link = links.find((l) => l.componentId === componentId);
      const qty = parseInteger(act.quantity);
      const loc = act.usageLocation?.trim() || null;
      if (link) {
        const set: { usageLocation?: string; quantity?: number } = {};
        if (loc && link.usageLocation !== loc) set.usageLocation = loc;
        if (qty !== null && !valuesEqual(link.quantity, qty)) set.quantity = qty;
        if (Object.keys(set).length === 0) { bump(ctx.counters, 'robot_components', 'skip'); continue; }
        bump(ctx.counters, 'robot_components', 'update');
        ctx.log(`robot_components 갱신: ${row.name} ${JSON.stringify(set)}`);
        if (!ctx.dryRun) {
          await ctx.tx.update(robotComponents).set(set).where(and(eq(robotComponents.robotId, robotId), eq(robotComponents.componentId, componentId)));
        }
        Object.assign(link, set);
      } else {
        bump(ctx.counters, 'robot_components', 'insert');
        ctx.log(`robot_components 연결: ${row.name} (${loc ?? '-'}, x${qty ?? 1})`);
        if (!ctx.dryRun) {
          await ctx.tx.insert(robotComponents).values({ robotId, componentId, usageLocation: loc, quantity: qty ?? 1 }).onConflictDoNothing();
        }
        links.push({ componentId, usageLocation: loc, quantity: qty ?? 1 });
      }
    }
  }
}

// ------------------------------------------------------------
// 2. suppliers.json
// ------------------------------------------------------------

async function runSuppliers(ctx: Ctx, file: SuppliersFile): Promise<void> {
  ctx.logger.info(`\n=== [suppliers] ${file.products.length}건 (generatedAt=${file.generatedAt ?? '?'}) ===`);
  const companyCache = await ctx.companies();
  const componentCache = await ctx.actuatorComponents();
  const productCache = await ctx.tx
    .select({
      id: products.id, companyId: products.companyId, name: products.name, series: products.series,
      releaseDate: products.releaseDate, targetMarket: products.targetMarket, status: products.status,
    })
    .from(products)
    .where(eq(products.type, 'actuator'));

  for (const p of file.products) {
    ctx.logger.detail(`\n- ${p.vendor} / ${p.model}`);
    const company = await ensureCompany(ctx, companyCache, p.vendor, [], 'actuator', normalizeCountry(p.vendorCountry), true);
    if (!company) { bump(ctx.counters, 'products', 'skip'); continue; }
    const fullName = supplierComponentName(p, company.name);

    // products
    const patch = supplierToProductPatch(p);
    const inCompany = productCache.filter((r) => r.companyId === company.id);
    let product = matchByNames(inCompany, [p.model, fullName]);
    if (!product && !ctx.isDryId(company.id)) {
      // 다른 회사에 같은 모델명이 있으면 경고만 (덮어쓰지 않음)
      const elsewhere = matchByNames(productCache, [p.model, fullName]);
      if (elsewhere) ctx.warn(`products "${p.model}" 이 다른 회사(companyId=${elsewhere.companyId})에 존재 — ${company.name} 아래 신규 생성`);
    }
    let productId: string;
    if (product) {
      const diff: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined && !valuesEqual((product as Record<string, unknown>)[k], v)) diff[k] = v;
      }
      productId = product.id;
      if (Object.keys(diff).length === 0) bump(ctx.counters, 'products', 'skip');
      else {
        bump(ctx.counters, 'products', 'update');
        ctx.log(`products 갱신: ${product.name} [${Object.keys(diff).join(', ')}]`);
        if (!ctx.dryRun) await ctx.tx.update(products).set({ ...diff, updatedAt: new Date() }).where(eq(products.id, productId));
        Object.assign(product, diff);
      }
    } else {
      bump(ctx.counters, 'products', 'insert');
      ctx.log(`products 생성: ${p.model} (${company.name})`);
      productId = ctx.dryId(`product:${fullName}`);
      if (!ctx.dryRun) {
        const [ins] = await ctx.tx
          .insert(products)
          .values({ companyId: company.id, name: p.model.trim(), type: 'actuator', status: patch.status ?? 'available', ...patch })
          .returning({ id: products.id });
        productId = ins!.id;
      }
      product = { id: productId, companyId: company.id, name: p.model.trim(), series: patch.series ?? null, releaseDate: patch.releaseDate ?? null, targetMarket: patch.targetMarket ?? null, status: patch.status ?? 'available' };
      productCache.push(product);
    }

    // product_specs.dynamicSpecs
    const dyn = supplierToDynamicSpecs(p, company.name);
    const specRows = ctx.isDryId(productId) ? [] : await ctx.tx.select().from(productSpecs).where(eq(productSpecs.productId, productId)).limit(1);
    const spec = specRows[0] ?? null;
    if (spec) {
      const { merged, changed } = mergeSpecs((spec.dynamicSpecs ?? {}) as Record<string, unknown>, dyn);
      if (!changed) bump(ctx.counters, 'product_specs', 'skip');
      else {
        bump(ctx.counters, 'product_specs', 'update');
        ctx.log(`product_specs.dynamicSpecs 갱신`);
        if (!ctx.dryRun) {
          await ctx.tx.update(productSpecs).set({ dynamicSpecs: merged as DynamicSpecs, updatedAt: new Date() }).where(eq(productSpecs.id, spec.id));
        }
      }
    } else {
      bump(ctx.counters, 'product_specs', 'insert');
      ctx.log(`product_specs 생성 (dynamicSpecs ${Object.keys(dyn).length}키)`);
      if (!ctx.dryRun) await ctx.tx.insert(productSpecs).values({ productId, dynamicSpecs: dyn as DynamicSpecs });
    }

    // components (차트/토크밀도용)
    const compRow = supplierToComponentRow(p, company.name);
    await upsertComponent(ctx, componentCache, [compRow.name, `${p.vendor} ${p.model}`, p.model], compRow);
  }
}

// ------------------------------------------------------------
// 3. CI
// ------------------------------------------------------------

async function runCi(ctx: Ctx, file: RobotsFile): Promise<void> {
  ctx.logger.info(`\n=== [ci] 로봇 ${file.robots.length}건 → ci_values ===`);

  const [hwLayer] = await ctx.tx.select().from(ciLayers).where(eq(ciLayers.slug, CI_HW_LAYER_SLUG)).limit(1);
  if (!hwLayer) {
    ctx.warn(`ci_layers 에 '${CI_HW_LAYER_SLUG}' 레이어가 없어 CI 단계를 건너뜁니다 (seed-ci 먼저 실행)`);
    return;
  }

  // 카테고리 보장
  const cats = await ctx.tx.select().from(ciCategories).where(eq(ciCategories.layerId, hwLayer.id));
  let actuatorCat = cats.find((c) => c.name === CI_ACTUATOR_CATEGORY) ?? null;
  if (!actuatorCat) {
    const maxSort = cats.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), 0);
    bump(ctx.counters, 'ci_categories', 'insert');
    ctx.log(`ci_categories 생성: ${CI_ACTUATOR_CATEGORY}`);
    actuatorCat = { id: ctx.dryId('cat'), layerId: hwLayer.id, name: CI_ACTUATOR_CATEGORY, sortOrder: maxSort + 1, createdAt: new Date() };
    if (!ctx.dryRun) {
      const [ins] = await ctx.tx.insert(ciCategories).values({ layerId: hwLayer.id, name: CI_ACTUATOR_CATEGORY, sortOrder: maxSort + 1 }).returning();
      actuatorCat = ins!;
    }
  } else {
    bump(ctx.counters, 'ci_categories', 'skip');
  }

  // 항목 보장 (기존 유지, 없는 것만 추가)
  const itemsInCat = ctx.isDryId(actuatorCat.id) ? [] : await ctx.tx.select().from(ciItems).where(eq(ciItems.categoryId, actuatorCat.id));
  const itemIdByName = new Map<string, string>();
  for (const it of itemsInCat) itemIdByName.set(it.name, it.id);
  let nextSort = itemsInCat.reduce((m, it) => Math.max(m, it.sortOrder ?? 0), 0) + 1;
  for (const name of CI_ACTUATOR_ITEMS) {
    if (itemIdByName.has(name)) { bump(ctx.counters, 'ci_items', 'skip'); continue; }
    bump(ctx.counters, 'ci_items', 'insert');
    ctx.log(`ci_items 생성: ${CI_ACTUATOR_CATEGORY} / ${name}`);
    let id = ctx.dryId(`item:${name}`);
    if (!ctx.dryRun) {
      const [ins] = await ctx.tx.insert(ciItems).values({ categoryId: actuatorCat.id, name, sortOrder: nextSort }).returning({ id: ciItems.id });
      id = ins!.id;
    }
    nextSort += 1;
    itemIdByName.set(name, id);
  }
  // 손 자유도 / 가격대: 존재할 때만 (전체 항목에서 이름으로 탐색)
  const allItems = await ctx.tx.select({ id: ciItems.id, name: ciItems.name }).from(ciItems);
  for (const optional of [CI_HAND_DOF_ITEM, CI_PRICE_ITEM]) {
    if (!itemIdByName.has(optional)) {
      const hit = allItems.find((it) => it.name === optional);
      if (hit) itemIdByName.set(optional, hit.id);
    }
  }
  if (!itemIdByName.has(CI_PRICE_ITEM)) ctx.log(`ci_items 에 '${CI_PRICE_ITEM}' 항목이 없어 가격은 반영하지 않습니다`);

  // 경쟁사 매핑
  const competitors: CompetitorRow[] = await ctx.tx
    .select({ id: ciCompetitors.id, slug: ciCompetitors.slug, name: ciCompetitors.name, manufacturer: ciCompetitors.manufacturer })
    .from(ciCompetitors)
    .where(eq(ciCompetitors.isActive, true));
  const companyCache = await ctx.companies();

  // 1) 로봇 → 경쟁사 매핑을 먼저 모두 계산
  const announceKey = (r: RobotInput) => (r.announcementYear ?? 0) * 10 + (r.announcementQuarter ?? 0);
  type Planned = { robot: RobotInput; canonicalCompany: string; match: CompetitorMatch };
  const planned: Planned[] = [];
  for (const robot of file.robots) {
    const companyMatch = matchCompany(companyCache, robot.company, robot.companyAliases ?? []);
    const canonicalCompany = companyMatch?.row.name ?? robot.company;
    const matches = matchCompetitors(competitors, robot, canonicalCompany);
    if (matches.length === 0) {
      ctx.log(`ci_competitors 해당 없음: ${robot.company} / ${robot.name} (추적 경쟁사가 아니면 정상)`);
      continue;
    }
    for (const match of matches) planned.push({ robot, canonicalCompany, match });
  }

  // 2) 경쟁사별로 가장 강한 전략('name' > 'family')의 로봇만 남기고, 동급이면 발표 시점 오름차순(최신이 마지막에 기록)
  const byCompetitor = new Map<string, Planned[]>();
  for (const p of planned) {
    const list = byCompetitor.get(p.match.competitor.id) ?? [];
    list.push(p);
    byCompetitor.set(p.match.competitor.id, list);
  }
  const ordered: Planned[] = [];
  for (const list of byCompetitor.values()) {
    const best = Math.max(...list.map((p) => COMPETITOR_STRATEGY_RANK[p.match.strategy]));
    const kept = list.filter((p) => COMPETITOR_STRATEGY_RANK[p.match.strategy] === best).sort((a, b) => announceKey(a.robot) - announceKey(b.robot));
    const dropped = list.filter((p) => COMPETITOR_STRATEGY_RANK[p.match.strategy] < best);
    const slug = list[0]!.match.competitor.slug;
    if (dropped.length > 0) {
      ctx.log(`ci_competitors '${slug}': 제품명 일치 로봇(${kept.map((p) => p.robot.name).join(', ')})이 있어 제품군 매칭 로봇(${dropped.map((p) => p.robot.name).join(', ')})은 제외`);
    }
    if (kept.length > 1) {
      ctx.warn(`ci_competitors '${slug}' 에 로봇 ${kept.length}기가 동급 매핑됨 (${kept.map((p) => p.robot.name).join(', ')}) — 발표 시점이 최신인 로봇 값이 우선 기록됨`);
    }
    ordered.push(...kept);
  }

  const existingValues = await ctx.tx.select().from(ciValues);
  const findValue = (competitorId: string, itemId: string) =>
    existingValues.find((v) => v.competitorId === competitorId && v.itemId === itemId) ?? null;

  for (const { robot, canonicalCompany, match: m } of ordered) {
    const drafts = buildCiValuesForRobot(robot, canonicalCompany);
    if (drafts.length === 0) { ctx.log(`${robot.name}: CI 값으로 만들 근거 없음`); continue; }
    {
      ctx.logger.detail(`\n- ${robot.name} → ci_competitors '${m.competitor.slug}' (${m.competitor.name}, ${m.strategy})`);

      for (const d of drafts) {
        const itemId = itemIdByName.get(d.itemName);
        if (!itemId) continue; // '가격대' 등 선택 항목이 없으면 조용히 생략
        if (ctx.isDryId(itemId) || ctx.isDryId(m.competitor.id)) {
          bump(ctx.counters, 'ci_values', 'insert');
          ctx.log(`ci_values 생성: ${d.itemName} = ${d.value} [${d.confidence}]`);
          continue;
        }
        const cur = findValue(m.competitor.id, itemId);
        if (cur && !shouldReplaceCiValue(cur.confidence, d.confidence, cur.value)) {
          bump(ctx.counters, 'ci_values', 'skip');
          ctx.log(`ci_values 보존(신뢰도 낮음): ${d.itemName} 기존[${cur.confidence}] "${cur.value}" ← 신규[${d.confidence}]`);
          continue;
        }
        if (cur) {
          const same =
            cur.value === d.value && (cur.confidence ?? null) === d.confidence &&
            (cur.sourceUrl ?? null) === d.sourceUrl && (cur.source ?? null) === d.source && (cur.sourceDate ?? null) === d.sourceDate;
          if (same) { bump(ctx.counters, 'ci_values', 'skip'); continue; }
          bump(ctx.counters, 'ci_values', 'update');
          ctx.log(`ci_values 갱신: ${d.itemName} "${cur.value}"[${cur.confidence}] → "${d.value}"[${d.confidence}]`);
          if (!ctx.dryRun) {
            await ctx.tx
              .update(ciValues)
              .set({ value: d.value, confidence: d.confidence, source: d.source, sourceUrl: d.sourceUrl, sourceDate: d.sourceDate, lastVerified: new Date(), updatedAt: new Date() })
              .where(eq(ciValues.id, cur.id));
            if (cur.value !== d.value || cur.confidence !== d.confidence) {
              await ctx.tx.insert(ciValueHistory).values({
                valueId: cur.id, oldValue: cur.value, newValue: d.value, oldConfidence: cur.confidence, newConfidence: d.confidence,
                changeSource: 'auto', changeReason: `actuator-update (${robot.name})`, changedBy: CHANGED_BY,
              });
              bump(ctx.counters, 'ci_value_history', 'insert');
            }
          }
          Object.assign(cur, { value: d.value, confidence: d.confidence, source: d.source, sourceUrl: d.sourceUrl, sourceDate: d.sourceDate });
        } else {
          bump(ctx.counters, 'ci_values', 'insert');
          ctx.log(`ci_values 생성: ${d.itemName} = "${d.value}" [${d.confidence}]`);
          const draftRow = {
            id: ctx.dryId('civ'), competitorId: m.competitor.id, itemId, value: d.value, confidence: d.confidence,
            source: d.source, sourceUrl: d.sourceUrl, sourceDate: d.sourceDate, lastVerified: new Date(), updatedAt: new Date(), createdAt: new Date(),
          };
          if (!ctx.dryRun) {
            const [ins] = await ctx.tx.insert(ciValues).values({
              competitorId: m.competitor.id, itemId, value: d.value, confidence: d.confidence,
              source: d.source, sourceUrl: d.sourceUrl, sourceDate: d.sourceDate, lastVerified: new Date(),
            }).returning({ id: ciValues.id });
            draftRow.id = ins!.id;
          }
          existingValues.push(draftRow);
        }
      }
    }
  }
}

// ------------------------------------------------------------
// 진입점
// ------------------------------------------------------------

class DryRunRollback extends Error {
  constructor() { super('dry-run rollback'); }
}

/**
 * 입력 파일을 읽고 검증한다 (DB 접속 전). 필요한 섹션의 파일만 읽는다.
 * 파일 없음·JSON 파싱 실패·형식 오류는 throw.
 */
export function loadActuatorDataFiles(
  dataDir: string,
  sections: Iterable<Section> = ALL_SECTIONS,
): { robotsFile: RobotsFile | null; suppliersFile: SuppliersFile | null } {
  const only = new Set(sections);
  const needRobots = only.has('robots') || only.has('ci');
  const needSuppliers = only.has('suppliers');
  const robotsFile = needRobots ? loadJson<RobotsFile>(path.join(dataDir, 'robots.json'), 'robots.json', validateRobotsFile) : null;
  const suppliersFile = needSuppliers ? loadJson<SuppliersFile>(path.join(dataDir, 'suppliers.json'), 'suppliers.json', validateSuppliersFile) : null;
  return { robotsFile, suppliersFile };
}

/** 업서트 로직 버전 — 로직을 바꿔 같은 데이터를 다시 적용해야 할 때만 올린다 (자동 적용 키에 포함). */
export const LOGIC_VERSION = 1;

/**
 * 데이터 파일의 내용 해시 키 — `actuator-update:<sha256 12자리>`.
 * sha256(LOGIC_VERSION \0 robots.json 원본 바이트 \0 suppliers.json 원본 바이트). `*.sample.json` 은 사용하지 않는다.
 */
export function computeActuatorDataKey(dataDir: string = resolveDefaultDataDir(), logicVersion: number = LOGIC_VERSION): string {
  const robotsPath = path.join(dataDir, 'robots.json');
  const suppliersPath = path.join(dataDir, 'suppliers.json');
  const hash = createHash('sha256');
  hash.update(String(logicVersion));
  hash.update('\0');
  hash.update(fs.readFileSync(robotsPath));
  hash.update('\0');
  hash.update(fs.readFileSync(suppliersPath));
  return `actuator-update:${hash.digest('hex').slice(0, 12)}`;
}

/**
 * 액추에이터 데이터 업서트 실행. 모든 쓰기는 하나의 트랜잭션.
 * dry-run 은 항상 롤백한다. 입력 오류 등은 throw (process.exit 를 호출하지 않는다).
 */
export async function applyActuatorDataUpdate(options: ApplyOptions): Promise<ApplyResult> {
  const { dryRun, logger, txHooks } = options;
  const dataDir = options.dataDir ?? resolveDefaultDataDir();
  const only = new Set<Section>(options.sections ?? ALL_SECTIONS);
  const createRobotCompanies = options.createRobotCompanies ?? false;

  // 입력 파일을 먼저 모두 검증 (DB 접속 전 실패)
  const { robotsFile, suppliersFile } = loadActuatorDataFiles(dataDir, only);

  logger.detail(`=== 액추에이터 데이터 업데이트 ${dryRun ? '(DRY-RUN: 쓰기 없음)' : ''} ===`);
  logger.detail(`data-dir: ${dataDir}`);
  logger.detail(`sections: ${[...only].join(', ')}`);

  const result: ApplyResult = {
    counters: {},
    warnings: [],
    createdCompanies: [],
    createdRobots: [],
    sectionsRun: [],
    dryRun,
    files: {
      robotsGeneratedAt: robotsFile?.generatedAt ?? null,
      suppliersGeneratedAt: suppliersFile?.generatedAt ?? null,
    },
  };

  await db.transaction(async (tx) => {
    if (txHooks) {
      const decision = await txHooks.beforeWrite(tx);
      if (decision === 'skip') {
        result.skipped = true;
        return;
      }
    }
    const ctx = new Ctx(tx, dryRun, createRobotCompanies, logger);
    // suppliers 를 먼저 실행: 공급사로 생성된 회사(예: 액추에이터도 만드는 로봇 회사)가 같은 실행의 robots 단계에서 보이도록
    if (only.has('suppliers') && suppliersFile) { await runSuppliers(ctx, suppliersFile); result.sectionsRun.push('suppliers'); }
    if (only.has('robots') && robotsFile) { await runRobots(ctx, robotsFile); result.sectionsRun.push('robots'); }
    if (only.has('ci') && robotsFile) { await runCi(ctx, robotsFile); result.sectionsRun.push('ci'); }
    result.counters = ctx.counters;
    result.warnings = ctx.warnings;
    result.createdCompanies = ctx.createdCompanies;
    result.createdRobots = ctx.createdRobots;
    if (dryRun) {
      // 안전장치: dry-run 에서는 어떤 경우에도 커밋하지 않는다
      await tx.execute(sql`SELECT 1`);
      throw new DryRunRollback();
    }
    if (txHooks) await txHooks.afterWrite(tx, result);
  }).catch((e) => {
    if (e instanceof DryRunRollback) return;
    throw e;
  });

  return result;
}
