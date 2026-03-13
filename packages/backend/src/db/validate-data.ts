/**
 * 데이터 검증 및 수정 스크립트
 *
 * 2026년 3월 기준으로 DB 내 모든 데이터의 정확성을 검증하고
 * 발견된 문제를 자동으로 수정합니다.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import {
  companies,
  products,
  productSpecs,
  articles,
  keywords,
  humanoidRobots,
  bodySpecs,
  handSpecs,
  computingSpecs,
  sensorSpecs,
  powerSpecs,
  workforceData,
  talentTrends,
  users,
  allowedEmails,
} from './schema.js';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

interface ValidationResult {
  table: string;
  issues: Array<{
    id: string;
    field: string;
    issue: string;
    currentValue: any;
    suggestedValue?: any;
    severity: 'error' | 'warning' | 'info';
  }>;
  fixes: Array<{
    id: string;
    field: string;
    action: string;
    oldValue: any;
    newValue: any;
  }>;
}

class DataValidator {
  private results: ValidationResult[] = [];
  private currentDate = new Date('2026-03-13');

  async validateAll(): Promise<ValidationResult[]> {
    console.log('🔍 데이터 검증 시작...');

    // 각 테이블별 검증 실행
    await this.validateCompanies();
    await this.validateProducts();
    await this.validateProductSpecs();
    await this.validateArticles();
    await this.validateHumanoidRobots();
    await this.validateWorkforceData();
    await this.validateUsers();

    console.log('✅ 데이터 검증 완료');
    return this.results;
  }

  async fixIssues(dryRun = true): Promise<void> {
    console.log(`${dryRun ? '🔍' : '🔧'} 데이터 수정 ${dryRun ? '시뮬레이션' : '실행'} 시작...`);

    for (const result of this.results) {
      for (const fix of result.fixes) {
        if (dryRun) {
          console.log(`[DRY RUN] ${result.table}.${fix.field}: ${fix.oldValue} → ${fix.newValue}`);
        } else {
          await this.applyFix(result.table, fix);
        }
      }
    }

    console.log(`${dryRun ? '🔍' : '🔧'} 데이터 수정 ${dryRun ? '시뮬레이션' : '실행'} 완료`);
  }

  private async validateCompanies(): Promise<void> {
    console.log('  📋 회사 데이터 검증 중...');

    const companiesData = await db.select().from(companies);
    const result: ValidationResult = { table: 'companies', issues: [], fixes: [] };

    for (const company of companiesData) {
      // 1. 설립년도 검증 (1900-2026 범위)
      if (company.foundingYear) {
        if (company.foundingYear < 1900 || company.foundingYear > 2026) {
          result.issues.push({
            id: company.id,
            field: 'foundingYear',
            issue: '설립년도가 유효하지 않음',
            currentValue: company.foundingYear,
            suggestedValue: null,
            severity: 'warning',
          });
          result.fixes.push({
            id: company.id,
            field: 'foundingYear',
            action: 'null로 설정',
            oldValue: company.foundingYear,
            newValue: null,
          });
        }
      }

      // 2. URL 형식 검증
      if (company.homepageUrl && !this.isValidUrl(company.homepageUrl)) {
        result.issues.push({
          id: company.id,
          field: 'homepageUrl',
          issue: 'URL 형식이 잘못됨',
          currentValue: company.homepageUrl,
          severity: 'warning',
        });
      }

      // 3. 국가명 표준화
      if (company.country) {
        const normalizedCountry = this.normalizeCountry(company.country);
        if (normalizedCountry !== company.country) {
          result.issues.push({
            id: company.id,
            field: 'country',
            issue: '국가명 표준화 필요',
            currentValue: company.country,
            suggestedValue: normalizedCountry,
            severity: 'info',
          });
          result.fixes.push({
            id: company.id,
            field: 'country',
            action: '국가명 표준화',
            oldValue: company.country,
            newValue: normalizedCountry,
          });
        }
      }

      // 4. 평가액 범위 검증 (너무 큰 값)
      if (company.valuationUsd && parseFloat(company.valuationUsd.toString()) > 1000000000000) { // 1조 달러 이상
        result.issues.push({
          id: company.id,
          field: 'valuationUsd',
          issue: '평가액이 비현실적으로 큼',
          currentValue: company.valuationUsd,
          severity: 'warning',
        });
      }
    }

    this.results.push(result);
  }

  private async validateProducts(): Promise<void> {
    console.log('  📦 제품 데이터 검증 중...');

    const productsData = await db.select().from(products);
    const result: ValidationResult = { table: 'products', issues: [], fixes: [] };

    for (const product of productsData) {
      // 1. 출시일 검증 (미래 날짜 불가)
      if (product.releaseDate && new Date(product.releaseDate) > this.currentDate) {
        result.issues.push({
          id: product.id,
          field: 'releaseDate',
          issue: '출시일이 미래임',
          currentValue: product.releaseDate,
          severity: 'error',
        });
        result.fixes.push({
          id: product.id,
          field: 'releaseDate',
          action: 'null로 설정',
          oldValue: product.releaseDate,
          newValue: null,
        });
      }

      // 2. 출시일 검증 (너무 오래됨 - 1950년 이전)
      if (product.releaseDate && new Date(product.releaseDate).getFullYear() < 1950) {
        result.issues.push({
          id: product.id,
          field: 'releaseDate',
          issue: '출시일이 너무 오래됨',
          currentValue: product.releaseDate,
          severity: 'warning',
        });
      }

      // 3. 상태 값 검증
      const validStatuses = ['announced', 'available', 'discontinued'];
      if (!validStatuses.includes(product.status)) {
        result.issues.push({
          id: product.id,
          field: 'status',
          issue: '잘못된 상태 값',
          currentValue: product.status,
          suggestedValue: 'announced',
          severity: 'error',
        });
        result.fixes.push({
          id: product.id,
          field: 'status',
          action: '기본값으로 설정',
          oldValue: product.status,
          newValue: 'announced',
        });
      }

      // 4. 타입 값 검증
      const validTypes = ['humanoid', 'service', 'logistics', 'home'];
      if (!validTypes.includes(product.type)) {
        result.issues.push({
          id: product.id,
          field: 'type',
          issue: '잘못된 타입 값',
          currentValue: product.type,
          suggestedValue: 'humanoid',
          severity: 'error',
        });
        result.fixes.push({
          id: product.id,
          field: 'type',
          action: '기본값으로 설정',
          oldValue: product.type,
          newValue: 'humanoid',
        });
      }
    }

    this.results.push(result);
  }

  private async validateProductSpecs(): Promise<void> {
    console.log('  🔧 제품 스펙 데이터 검증 중...');

    const specsData = await db.select().from(productSpecs);
    const result: ValidationResult = { table: 'productSpecs', issues: [], fixes: [] };

    for (const spec of specsData) {
      // 1. 가격 범위 검증
      if (spec.priceMin && spec.priceMax) {
        const min = parseFloat(spec.priceMin.toString());
        const max = parseFloat(spec.priceMax.toString());
        if (min > max) {
          result.issues.push({
            id: spec.id,
            field: 'priceMin/priceMax',
            issue: '최소 가격이 최대 가격보다 큼',
            currentValue: `${min}/${max}`,
            severity: 'error',
          });
          // 가격 교환
          result.fixes.push({
            id: spec.id,
            field: 'priceMin',
            action: '가격 범위 교환',
            oldValue: spec.priceMin,
            newValue: spec.priceMax,
          });
          result.fixes.push({
            id: spec.id,
            field: 'priceMax',
            action: '가격 범위 교환',
            oldValue: spec.priceMax,
            newValue: spec.priceMin,
          });
        }
      }

      // 2. 무게 범위 검증 (0-10000kg)
      if (spec.payloadKg) {
        const payload = parseFloat(spec.payloadKg.toString());
        if (payload < 0 || payload > 10000) {
          result.issues.push({
            id: spec.id,
            field: 'payloadKg',
            issue: '페이로드 값이 비현실적임',
            currentValue: payload,
            severity: 'warning',
          });
        }
      }

      // 3. 속도 범위 검증 (0-100 m/s)
      if (spec.speedMps) {
        const speed = parseFloat(spec.speedMps.toString());
        if (speed < 0 || speed > 100) {
          result.issues.push({
            id: spec.id,
            field: 'speedMps',
            issue: '속도 값이 비현실적임',
            currentValue: speed,
            severity: 'warning',
          });
        }
      }

      // 4. 배터리 시간 범위 검증 (0-1000분)
      if (spec.batteryMinutes && (spec.batteryMinutes < 0 || spec.batteryMinutes > 1000)) {
        result.issues.push({
          id: spec.id,
          field: 'batteryMinutes',
          issue: '배터리 시간 값이 비현실적임',
          currentValue: spec.batteryMinutes,
          severity: 'warning',
        });
      }
    }

    this.results.push(result);
  }

  private async validateArticles(): Promise<void> {
    console.log('  📰 기사 데이터 검증 중...');

    const articlesData = await db.select().from(articles);
    const result: ValidationResult = { table: 'articles', issues: [], fixes: [] };

    for (const article of articlesData) {
      // 1. 발행일 검증 (미래 날짜 불가)
      if (article.publishedAt && new Date(article.publishedAt) > this.currentDate) {
        result.issues.push({
          id: article.id,
          field: 'publishedAt',
          issue: '발행일이 미래임',
          currentValue: article.publishedAt,
          severity: 'error',
        });
        result.fixes.push({
          id: article.id,
          field: 'publishedAt',
          action: 'null로 설정',
          oldValue: article.publishedAt,
          newValue: null,
        });
      }

      // 2. 발행일 검증 (너무 오래됨 - 2000년 이전)
      if (article.publishedAt && new Date(article.publishedAt).getFullYear() < 2000) {
        result.issues.push({
          id: article.id,
          field: 'publishedAt',
          issue: '발행일이 너무 오래됨',
          currentValue: article.publishedAt,
          severity: 'warning',
        });
      }

      // 3. URL 형식 검증
      if (article.url && !this.isValidUrl(article.url)) {
        result.issues.push({
          id: article.id,
          field: 'url',
          issue: 'URL 형식이 잘못됨',
          currentValue: article.url,
          severity: 'warning',
        });
      }

      // 4. 언어 값 검증
      const validLanguages = ['en', 'ko', 'ja', 'zh'];
      if (!validLanguages.includes(article.language)) {
        result.issues.push({
          id: article.id,
          field: 'language',
          issue: '잘못된 언어 코드',
          currentValue: article.language,
          suggestedValue: 'en',
          severity: 'warning',
        });
        result.fixes.push({
          id: article.id,
          field: 'language',
          action: '기본값으로 설정',
          oldValue: article.language,
          newValue: 'en',
        });
      }
    }

    this.results.push(result);
  }

  private async validateHumanoidRobots(): Promise<void> {
    console.log('  🤖 휴머노이드 로봇 데이터 검증 중...');

    const robotsData = await db.select().from(humanoidRobots);
    const result: ValidationResult = { table: 'humanoidRobots', issues: [], fixes: [] };

    for (const robot of robotsData) {
      // 1. 발표년도 검증 (2000-2026 범위)
      if (robot.announcementYear) {
        if (robot.announcementYear < 2000 || robot.announcementYear > 2026) {
          result.issues.push({
            id: robot.id,
            field: 'announcementYear',
            issue: '발표년도가 유효하지 않음',
            currentValue: robot.announcementYear,
            suggestedValue: null,
            severity: 'warning',
          });
          result.fixes.push({
            id: robot.id,
            field: 'announcementYear',
            action: 'null로 설정',
            oldValue: robot.announcementYear,
            newValue: null,
          });
        }
      }

      // 2. 상태 값 검증
      const validStatuses = ['development', 'poc', 'commercial'];
      if (!validStatuses.includes(robot.status)) {
        result.issues.push({
          id: robot.id,
          field: 'status',
          issue: '잘못된 상태 값',
          currentValue: robot.status,
          suggestedValue: 'development',
          severity: 'error',
        });
        result.fixes.push({
          id: robot.id,
          field: 'status',
          action: '기본값으로 설정',
          oldValue: robot.status,
          newValue: 'development',
        });
      }

      // 3. 목적 값 검증
      const validPurposes = ['industrial', 'home', 'service'];
      if (robot.purpose && !validPurposes.includes(robot.purpose)) {
        result.issues.push({
          id: robot.id,
          field: 'purpose',
          issue: '잘못된 목적 값',
          currentValue: robot.purpose,
          severity: 'warning',
        });
      }

      // 4. 이동 방식 검증
      const validLocomotions = ['bipedal', 'wheeled', 'hybrid'];
      if (robot.locomotionType && !validLocomotions.includes(robot.locomotionType)) {
        result.issues.push({
          id: robot.id,
          field: 'locomotionType',
          issue: '잘못된 이동 방식',
          currentValue: robot.locomotionType,
          severity: 'warning',
        });
      }

      // 5. 손 유형 검증
      const validHandTypes = ['gripper', 'multi_finger', 'interchangeable'];
      if (robot.handType && !validHandTypes.includes(robot.handType)) {
        result.issues.push({
          id: robot.id,
          field: 'handType',
          issue: '잘못된 손 유형',
          currentValue: robot.handType,
          severity: 'warning',
        });
      }

      // 6. 상용화 단계 검증
      const validStages = ['concept', 'prototype', 'poc', 'pilot', 'commercial'];
      if (robot.commercializationStage && !validStages.includes(robot.commercializationStage)) {
        result.issues.push({
          id: robot.id,
          field: 'commercializationStage',
          issue: '잘못된 상용화 단계',
          currentValue: robot.commercializationStage,
          severity: 'warning',
        });
      }

      // 7. 지역 검증
      const validRegions = ['north_america', 'europe', 'china', 'japan', 'korea', 'other'];
      if (robot.region && !validRegions.includes(robot.region)) {
        result.issues.push({
          id: robot.id,
          field: 'region',
          issue: '잘못된 지역 값',
          currentValue: robot.region,
          severity: 'warning',
        });
      }
    }

    this.results.push(result);
  }

  private async validateWorkforceData(): Promise<void> {
    console.log('  👥 인력 데이터 검증 중...');

    const workforceDataList = await db.select().from(workforceData);
    const result: ValidationResult = { table: 'workforceData', issues: [], fixes: [] };

    for (const workforce of workforceDataList) {
      // 1. 인력 수 범위 검증
      if (workforce.totalHeadcountMin && workforce.totalHeadcountMax) {
        if (workforce.totalHeadcountMin > workforce.totalHeadcountMax) {
          result.issues.push({
            id: workforce.id,
            field: 'totalHeadcountMin/Max',
            issue: '최소 인력이 최대 인력보다 큼',
            currentValue: `${workforce.totalHeadcountMin}/${workforce.totalHeadcountMax}`,
            severity: 'error',
          });
          // 값 교환
          result.fixes.push({
            id: workforce.id,
            field: 'totalHeadcountMin',
            action: '인력 범위 교환',
            oldValue: workforce.totalHeadcountMin,
            newValue: workforce.totalHeadcountMax,
          });
          result.fixes.push({
            id: workforce.id,
            field: 'totalHeadcountMax',
            action: '인력 범위 교환',
            oldValue: workforce.totalHeadcountMax,
            newValue: workforce.totalHeadcountMin,
          });
        }
      }

      // 2. 인력 수 범위 검증 (비현실적 값)
      if (workforce.totalHeadcountMax && workforce.totalHeadcountMax > 100000) {
        result.issues.push({
          id: workforce.id,
          field: 'totalHeadcountMax',
          issue: '인력 수가 비현실적으로 큼',
          currentValue: workforce.totalHeadcountMax,
          severity: 'warning',
        });
      }

      // 3. 기록일 검증 (미래 날짜 불가)
      if (workforce.recordedAt && new Date(workforce.recordedAt) > this.currentDate) {
        result.issues.push({
          id: workforce.id,
          field: 'recordedAt',
          issue: '기록일이 미래임',
          currentValue: workforce.recordedAt,
          severity: 'error',
        });
        result.fixes.push({
          id: workforce.id,
          field: 'recordedAt',
          action: '현재 날짜로 설정',
          oldValue: workforce.recordedAt,
          newValue: this.currentDate,
        });
      }
    }

    this.results.push(result);
  }

  private async validateUsers(): Promise<void> {
    console.log('  👤 사용자 데이터 검증 중...');

    const usersData = await db.select().from(users);
    const result: ValidationResult = { table: 'users', issues: [], fixes: [] };

    for (const user of usersData) {
      // 1. 이메일 형식 검증
      if (!this.isValidEmail(user.email)) {
        result.issues.push({
          id: user.id,
          field: 'email',
          issue: '이메일 형식이 잘못됨',
          currentValue: user.email,
          severity: 'error',
        });
      }

      // 2. 역할 값 검증
      const validRoles = ['admin', 'analyst', 'viewer'];
      if (!validRoles.includes(user.role)) {
        result.issues.push({
          id: user.id,
          field: 'role',
          issue: '잘못된 역할 값',
          currentValue: user.role,
          suggestedValue: 'viewer',
          severity: 'error',
        });
        result.fixes.push({
          id: user.id,
          field: 'role',
          action: '기본값으로 설정',
          oldValue: user.role,
          newValue: 'viewer',
        });
      }

      // 3. 마지막 로그인 검증 (미래 날짜 불가)
      if (user.lastLogin && new Date(user.lastLogin) > this.currentDate) {
        result.issues.push({
          id: user.id,
          field: 'lastLogin',
          issue: '마지막 로그인일이 미래임',
          currentValue: user.lastLogin,
          severity: 'error',
        });
        result.fixes.push({
          id: user.id,
          field: 'lastLogin',
          action: 'null로 설정',
          oldValue: user.lastLogin,
          newValue: null,
        });
      }
    }

    this.results.push(result);
  }

  private async applyFix(table: string, fix: any): Promise<void> {
    // 실제 수정 로직 구현
    try {
      switch (table) {
        case 'companies':
          await db.update(companies)
            .set({ [fix.field]: fix.newValue })
            .where(eq(companies.id, fix.id));
          break;
        case 'products':
          await db.update(products)
            .set({ [fix.field]: fix.newValue })
            .where(eq(products.id, fix.id));
          break;
        case 'productSpecs':
          await db.update(productSpecs)
            .set({ [fix.field]: fix.newValue })
            .where(eq(productSpecs.id, fix.id));
          break;
        case 'articles':
          await db.update(articles)
            .set({ [fix.field]: fix.newValue })
            .where(eq(articles.id, fix.id));
          break;
        case 'humanoidRobots':
          await db.update(humanoidRobots)
            .set({ [fix.field]: fix.newValue })
            .where(eq(humanoidRobots.id, fix.id));
          break;
        case 'workforceData':
          await db.update(workforceData)
            .set({ [fix.field]: fix.newValue })
            .where(eq(workforceData.id, fix.id));
          break;
        case 'users':
          await db.update(users)
            .set({ [fix.field]: fix.newValue })
            .where(eq(users.id, fix.id));
          break;
        default:
          console.warn(`Unknown table: ${table}`);
      }
      console.log(`✅ ${table}.${fix.field}: ${fix.oldValue} → ${fix.newValue}`);
    } catch (error) {
      console.error(`❌ ${table}.${fix.field} 수정 실패:`, error);
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private normalizeCountry(country: string): string {
    const countryMap: Record<string, string> = {
      'usa': 'United States',
      'us': 'United States',
      'uk': 'United Kingdom',
      'korea': 'South Korea',
      'china': 'China',
      'japan': 'Japan',
      'germany': 'Germany',
      'france': 'France',
      'canada': 'Canada',
      'south korea': 'South Korea',
      'united states': 'United States',
      'united kingdom': 'United Kingdom',
    };

    const normalized = country.toLowerCase().trim();
    return countryMap[normalized] || country;
  }

  getSummary(): { totalIssues: number; totalFixes: number; bySeverity: Record<string, number> } {
    const summary = {
      totalIssues: 0,
      totalFixes: 0,
      bySeverity: { error: 0, warning: 0, info: 0 },
    };

    for (const result of this.results) {
      summary.totalIssues += result.issues.length;
      summary.totalFixes += result.fixes.length;

      for (const issue of result.issues) {
        summary.bySeverity[issue.severity]++;
      }
    }

    return summary;
  }

  printReport(): void {
    console.log('\n📊 데이터 검증 보고서');
    console.log('='.repeat(50));

    const summary = this.getSummary();
    console.log(`총 이슈 수: ${summary.totalIssues}`);
    console.log(`총 수정 수: ${summary.totalFixes}`);
    console.log(`심각도별: 오류 ${summary.bySeverity.error}, 경고 ${summary.bySeverity.warning}, 정보 ${summary.bySeverity.info}`);

    for (const result of this.results) {
      if (result.issues.length > 0) {
        console.log(`\n🔍 ${result.table} (${result.issues.length}개 이슈)`);
        for (const issue of result.issues.slice(0, 5)) { // 처음 5개만 표시
          console.log(`  ${issue.severity.toUpperCase()}: ${issue.field} - ${issue.issue}`);
        }
        if (result.issues.length > 5) {
          console.log(`  ... 및 ${result.issues.length - 5}개 더`);
        }
      }
    }
  }
}

// 메인 실행 함수
async function main() {
  const validator = new DataValidator();

  try {
    // 1. 데이터 검증
    await validator.validateAll();

    // 2. 보고서 출력
    validator.printReport();

    // 3. 수정 적용 (dry-run 모드로 먼저 실행)
    console.log('\n🔧 수정 적용 시뮬레이션...');
    await validator.fixIssues(true);

    // 실제 적용을 원하면 아래 주석 해제
    console.log('\n🔧 실제 수정 적용...');
    await validator.fixIssues(false);

  } catch (error) {
    console.error('❌ 데이터 검증 중 오류 발생:', error);
  } finally {
    await client.end();
  }
}

// CLI 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DataValidator };