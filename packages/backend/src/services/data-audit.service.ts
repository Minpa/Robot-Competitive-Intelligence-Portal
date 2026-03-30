/**
 * DataAuditService - 데이터 자기검열 서비스
 *
 * 로봇별 5개 스펙 테이블 완성도 체크, 이상치 탐지, 갱신 시점 검사
 * 파이프라인 로깅을 통해 실행 이력 관리
 */

import { eq, desc } from 'drizzle-orm';
import {
  db,
  humanoidRobots,
  bodySpecs,
  handSpecs,
  sensorSpecs,
  computingSpecs,
  powerSpecs,
  companies,
  pocScores,
  rfmScores,
  dataAuditReports,
} from '../db/index.js';
import { PipelineLogger } from './pipeline-logger.service.js';

// ── Types ──

export interface ValidationIssue {
  field: string;
  value: unknown;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SpecCompleteness {
  overall: number;
  body: number;
  hand: number;
  sensor: number;
  computing: number;
  power: number;
  filledFields: number;
  totalFields: number;
}

export interface RobotAuditResult {
  robotId: string;
  robotName: string;
  companyName: string | null;
  completeness: SpecCompleteness;
  anomalies: ValidationIssue[];
  staleness: {
    isStale: boolean;
    oldestUpdate: string | null;
    staleSpecs: string[];
  };
  hasScores: { poc: boolean; rfm: boolean };
  priority: 'critical' | 'warning' | 'ok';
}

export interface AuditReport {
  runId: string | null;
  runAt: string;
  totalRobots: number;
  criticalCount: number;
  warningCount: number;
  okCount: number;
  averageCompleteness: number;
  topMissingSpecs: { specType: string; missingCount: number }[];
  staleRobotCount: number;
  robotResults: RobotAuditResult[];
}

// ── Spec field definitions ──

const BODY_FIELDS = ['heightCm', 'weightKg', 'payloadKg', 'dofCount', 'maxSpeedMps', 'operationTimeHours'] as const;
const HAND_FIELDS = ['handType', 'fingerCount', 'handDof', 'gripForceN'] as const;
const SENSOR_FIELDS = ['cameras', 'depthSensor', 'lidar', 'imu', 'forceTorque'] as const;
const COMPUTING_FIELDS = ['mainSoc', 'topsMin', 'topsMax', 'architectureType'] as const;
const POWER_FIELDS = ['batteryType', 'capacityWh', 'operationTimeHours', 'chargingMethod'] as const;
const TOTAL_FIELDS = BODY_FIELDS.length + HAND_FIELDS.length + SENSOR_FIELDS.length + COMPUTING_FIELDS.length + POWER_FIELDS.length; // 23

// ── Range rules for anomaly detection ──

const RANGE_RULES: Record<string, { min: number; max: number; label: string }> = {
  heightCm: { min: 50, max: 300, label: '키(cm)' },
  weightKg: { min: 5, max: 500, label: '무게(kg)' },
  payloadKg: { min: 0.1, max: 200, label: '페이로드(kg)' },
  dofCount: { min: 1, max: 100, label: 'DoF' },
  maxSpeedMps: { min: 0.01, max: 10, label: '최대속도(m/s)' },
  bodyOperationTimeHours: { min: 0.1, max: 48, label: '운용시간(h)' },
  handDof: { min: 1, max: 50, label: '손 DoF' },
  gripForceN: { min: 0.1, max: 500, label: '그립력(N)' },
  topsMin: { min: 0.1, max: 10000, label: 'TOPS(min)' },
  topsMax: { min: 0.1, max: 10000, label: 'TOPS(max)' },
  capacityWh: { min: 1, max: 20000, label: '배터리 용량(Wh)' },
  powerOperationTimeHours: { min: 0.1, max: 48, label: '전원 운용시간(h)' },
};

const STALE_THRESHOLD_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months

// ── Service ──

class DataAuditService {
  private logger = new PipelineLogger();

  /**
   * Run audit for all robots and persist the report
   */
  async runFullAudit(triggeredBy?: string): Promise<AuditReport> {
    const runId = await this.logger.startRun(triggeredBy);
    await this.logger.startStep(runId, 'data_audit', 1);

    try {
      const report = await this.generateReport(runId);

      // Persist
      await db.insert(dataAuditReports).values({
        runId,
        reportData: report,
        totalRobots: report.totalRobots,
        averageCompleteness: String(report.averageCompleteness),
        criticalCount: report.criticalCount,
        warningCount: report.warningCount,
      });

      await this.logger.completeStep(runId, 'data_audit', report.totalRobots, 0);
      await this.logger.getSummary(runId);
      return report;
    } catch (error) {
      await this.logger.failStep(runId, 'data_audit', error as Error);
      await this.logger.getSummary(runId);
      throw error;
    }
  }

  /**
   * Get the latest audit report from DB
   */
  async getLatestReport(): Promise<AuditReport | null> {
    const [row] = await db
      .select()
      .from(dataAuditReports)
      .orderBy(desc(dataAuditReports.createdAt))
      .limit(1);
    return row ? (row.reportData as AuditReport) : null;
  }

  /**
   * Audit a single robot by ID
   */
  async auditRobot(robotId: string): Promise<RobotAuditResult | null> {
    const [robot] = await db
      .select({ robot: humanoidRobots, company: companies })
      .from(humanoidRobots)
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id))
      .where(eq(humanoidRobots.id, robotId))
      .limit(1);
    if (!robot) return null;

    const [body] = await db.select().from(bodySpecs).where(eq(bodySpecs.robotId, robotId)).limit(1);
    const [hand] = await db.select().from(handSpecs).where(eq(handSpecs.robotId, robotId)).limit(1);
    const [sensor] = await db.select().from(sensorSpecs).where(eq(sensorSpecs.robotId, robotId)).limit(1);
    const [computing] = await db.select().from(computingSpecs).where(eq(computingSpecs.robotId, robotId)).limit(1);
    const [power] = await db.select().from(powerSpecs).where(eq(powerSpecs.robotId, robotId)).limit(1);
    const [poc] = await db.select({ id: pocScores.id }).from(pocScores).where(eq(pocScores.robotId, robotId)).limit(1);
    const [rfm] = await db.select({ id: rfmScores.id }).from(rfmScores).where(eq(rfmScores.robotId, robotId)).limit(1);

    return this.buildAuditResult(
      robot.robot, robot.company,
      body ?? null, hand ?? null, sensor ?? null, computing ?? null, power ?? null,
      !!poc, !!rfm,
    );
  }

  // ── Private helpers ──

  private async generateReport(runId: string | null): Promise<AuditReport> {
    // Fetch all robots with company info
    const robots = await db
      .select({ robot: humanoidRobots, company: companies })
      .from(humanoidRobots)
      .leftJoin(companies, eq(humanoidRobots.companyId, companies.id));

    const robotIds = robots.map(r => r.robot.id);
    if (robotIds.length === 0) {
      return {
        runId, runAt: new Date().toISOString(),
        totalRobots: 0, criticalCount: 0, warningCount: 0, okCount: 0,
        averageCompleteness: 0, topMissingSpecs: [], staleRobotCount: 0, robotResults: [],
      };
    }

    // Batch-fetch all specs
    const allBody = await db.select().from(bodySpecs);
    const allHand = await db.select().from(handSpecs);
    const allSensor = await db.select().from(sensorSpecs);
    const allComputing = await db.select().from(computingSpecs);
    const allPower = await db.select().from(powerSpecs);
    const allPoc = await db.select({ robotId: pocScores.robotId }).from(pocScores);
    const allRfm = await db.select({ robotId: rfmScores.robotId }).from(rfmScores);

    const bodyMap = new Map(allBody.map(s => [s.robotId, s]));
    const handMap = new Map(allHand.map(s => [s.robotId, s]));
    const sensorMap = new Map(allSensor.map(s => [s.robotId, s]));
    const computingMap = new Map(allComputing.map(s => [s.robotId, s]));
    const powerMap = new Map(allPower.map(s => [s.robotId, s]));
    const pocSet = new Set(allPoc.map(s => s.robotId));
    const rfmSet = new Set(allRfm.map(s => s.robotId));

    const results: RobotAuditResult[] = robots.map(({ robot, company }) =>
      this.buildAuditResult(
        robot, company,
        bodyMap.get(robot.id) ?? null,
        handMap.get(robot.id) ?? null,
        sensorMap.get(robot.id) ?? null,
        computingMap.get(robot.id) ?? null,
        powerMap.get(robot.id) ?? null,
        pocSet.has(robot.id),
        rfmSet.has(robot.id),
      )
    );

    // Aggregate
    const criticalCount = results.filter(r => r.priority === 'critical').length;
    const warningCount = results.filter(r => r.priority === 'warning').length;
    const okCount = results.filter(r => r.priority === 'ok').length;
    const avgCompleteness = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.completeness.overall, 0) / results.length * 100) / 100
      : 0;
    const staleRobotCount = results.filter(r => r.staleness.isStale).length;

    // Top missing spec types
    const missingCounts: Record<string, number> = { body: 0, hand: 0, sensor: 0, computing: 0, power: 0 };
    for (const r of results) {
      if (r.completeness.body === 0) missingCounts.body!++;
      if (r.completeness.hand === 0) missingCounts.hand!++;
      if (r.completeness.sensor === 0) missingCounts.sensor!++;
      if (r.completeness.computing === 0) missingCounts.computing!++;
      if (r.completeness.power === 0) missingCounts.power!++;
    }
    const topMissingSpecs = Object.entries(missingCounts)
      .map(([specType, missingCount]) => ({ specType, missingCount }))
      .sort((a, b) => b.missingCount - a.missingCount);

    // Sort results: critical first, then warning, then ok
    results.sort((a, b) => {
      const order = { critical: 0, warning: 1, ok: 2 };
      return order[a.priority] - order[b.priority];
    });

    return {
      runId, runAt: new Date().toISOString(),
      totalRobots: results.length, criticalCount, warningCount, okCount,
      averageCompleteness: avgCompleteness,
      topMissingSpecs, staleRobotCount, robotResults: results,
    };
  }

  private buildAuditResult(
    robot: typeof humanoidRobots.$inferSelect,
    company: typeof companies.$inferSelect | null,
    body: typeof bodySpecs.$inferSelect | null,
    hand: typeof handSpecs.$inferSelect | null,
    sensor: typeof sensorSpecs.$inferSelect | null,
    computing: typeof computingSpecs.$inferSelect | null,
    power: typeof powerSpecs.$inferSelect | null,
    hasPoc: boolean,
    hasRfm: boolean,
  ): RobotAuditResult {
    // Completeness
    const countFilled = (obj: Record<string, any> | null, fields: readonly string[]): number => {
      if (!obj) return 0;
      return fields.filter(f => obj[f] != null).length;
    };

    const bodyFilled = countFilled(body, BODY_FIELDS);
    const handFilled = countFilled(hand, HAND_FIELDS);
    const sensorFilled = countFilled(sensor, SENSOR_FIELDS);
    const computingFilled = countFilled(computing, COMPUTING_FIELDS);
    const powerFilled = countFilled(power, POWER_FIELDS);
    const totalFilled = bodyFilled + handFilled + sensorFilled + computingFilled + powerFilled;

    const pct = (filled: number, total: number) => total > 0 ? Math.round(filled / total * 100) : 0;

    const completeness: SpecCompleteness = {
      overall: pct(totalFilled, TOTAL_FIELDS),
      body: pct(bodyFilled, BODY_FIELDS.length),
      hand: pct(handFilled, HAND_FIELDS.length),
      sensor: pct(sensorFilled, SENSOR_FIELDS.length),
      computing: pct(computingFilled, COMPUTING_FIELDS.length),
      power: pct(powerFilled, POWER_FIELDS.length),
      filledFields: totalFilled,
      totalFields: TOTAL_FIELDS,
    };

    // Anomalies
    const anomalies: ValidationIssue[] = [];
    const checkRange = (val: unknown, fieldKey: string) => {
      if (val == null) return;
      const num = Number(val);
      const rule = RANGE_RULES[fieldKey];
      if (!rule) return;
      if (isNaN(num)) {
        anomalies.push({ field: fieldKey, value: val, rule: 'type', message: `${rule.label}: 숫자가 아닙니다`, severity: 'error' });
      } else if (num < rule.min || num > rule.max) {
        anomalies.push({ field: fieldKey, value: num, rule: 'range', message: `${rule.label}: ${num} (허용범위 ${rule.min}-${rule.max})`, severity: 'warning' });
      }
    };

    if (body) {
      checkRange(body.heightCm, 'heightCm');
      checkRange(body.weightKg, 'weightKg');
      checkRange(body.payloadKg, 'payloadKg');
      checkRange(body.dofCount, 'dofCount');
      checkRange(body.maxSpeedMps, 'maxSpeedMps');
      checkRange(body.operationTimeHours, 'bodyOperationTimeHours');
    }
    if (hand) {
      checkRange(hand.handDof, 'handDof');
      checkRange(hand.gripForceN, 'gripForceN');
    }
    if (computing) {
      checkRange(computing.topsMin, 'topsMin');
      checkRange(computing.topsMax, 'topsMax');
    }
    if (power) {
      checkRange(power.capacityWh, 'capacityWh');
      checkRange(power.operationTimeHours, 'powerOperationTimeHours');
    }

    // Staleness
    const now = Date.now();
    const timestamps: { spec: string; date: Date }[] = [];
    if (body) timestamps.push({ spec: 'body', date: new Date(body.updatedAt) });
    if (hand) timestamps.push({ spec: 'hand', date: new Date(hand.updatedAt) });
    if (sensor) timestamps.push({ spec: 'sensor', date: new Date(sensor.updatedAt) });
    if (computing) timestamps.push({ spec: 'computing', date: new Date(computing.updatedAt) });
    if (power) timestamps.push({ spec: 'power', date: new Date(power.updatedAt) });

    const staleSpecs = timestamps.filter(t => now - t.date.getTime() > STALE_THRESHOLD_MS).map(t => t.spec);
    const oldestTs = timestamps.length > 0
      ? timestamps.reduce((oldest, t) => t.date < oldest.date ? t : oldest).date
      : null;

    // Priority
    const hasErrors = anomalies.some(a => a.severity === 'error');
    let priority: 'critical' | 'warning' | 'ok' = 'ok';
    if (completeness.overall < 50 || hasErrors) {
      priority = 'critical';
    } else if (completeness.overall < 80 || staleSpecs.length > 0 || !hasPoc || !hasRfm) {
      priority = 'warning';
    }

    return {
      robotId: robot.id,
      robotName: robot.name,
      companyName: company?.name ?? null,
      completeness,
      anomalies,
      staleness: {
        isStale: staleSpecs.length > 0,
        oldestUpdate: oldestTs?.toISOString() ?? null,
        staleSpecs,
      },
      hasScores: { poc: hasPoc, rfm: hasRfm },
      priority,
    };
  }
}

export const dataAuditService = new DataAuditService();
