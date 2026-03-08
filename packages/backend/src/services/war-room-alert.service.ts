import {
  db,
  competitiveAlerts,
} from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';

type AlertType = 'score_spike' | 'mass_production' | 'funding' | 'partnership';
type Severity = 'info' | 'warning' | 'critical';

export interface CompetitiveAlertRecord {
  id: string;
  robotId: string | null;
  type: string;
  severity: string | null;
  title: string;
  summary: string | null;
  triggerData: Record<string, unknown> | null;
  isRead: boolean;
  readBy: string | null;
  readAt: Date | null;
  createdAt: Date;
}

interface AlertFilters {
  type?: string;
  isRead?: boolean;
  limit?: number;
}

interface CreateAlertData {
  robotId?: string;
  type: AlertType;
  severity: Severity;
  title: string;
  summary: string;
  triggerData: Record<string, unknown>;
}

class CompetitiveAlertService {
  /**
   * Query competitive_alerts ordered by created_at DESC, with optional type and isRead filters.
   * Requirements: 12.29, 12.32
   */
  async getAlerts(filters: AlertFilters = {}): Promise<CompetitiveAlertRecord[]> {
    const conditions = [];

    if (filters.type !== undefined) {
      conditions.push(eq(competitiveAlerts.type, filters.type));
    }
    if (filters.isRead !== undefined) {
      conditions.push(eq(competitiveAlerts.isRead, filters.isRead));
    }

    const query = db
      .select({
        id: competitiveAlerts.id,
        robotId: competitiveAlerts.robotId,
        type: competitiveAlerts.type,
        severity: competitiveAlerts.severity,
        title: competitiveAlerts.title,
        summary: competitiveAlerts.summary,
        triggerData: competitiveAlerts.triggerData,
        isRead: competitiveAlerts.isRead,
        readBy: competitiveAlerts.readBy,
        readAt: competitiveAlerts.readAt,
        createdAt: competitiveAlerts.createdAt,
      })
      .from(competitiveAlerts)
      .orderBy(desc(competitiveAlerts.createdAt));

    const withConditions = conditions.length > 0
      ? query.where(and(...conditions))
      : query;

    const withLimit = filters.limit
      ? withConditions.limit(filters.limit)
      : withConditions;

    const results = await withLimit;

    return results.map((row) => ({
      id: row.id,
      robotId: row.robotId,
      type: row.type,
      severity: row.severity,
      title: row.title,
      summary: row.summary,
      triggerData: row.triggerData as Record<string, unknown> | null,
      isRead: row.isRead,
      readBy: row.readBy,
      readAt: row.readAt,
      createdAt: row.createdAt,
    }));
  }

  /**
   * Mark an alert as read by a specific user.
   * Requirements: 12.31
   */
  async markAsRead(alertId: string, userId: string): Promise<void> {
    await db
      .update(competitiveAlerts)
      .set({
        isRead: true,
        readBy: userId,
        readAt: new Date(),
      })
      .where(eq(competitiveAlerts.id, alertId));
  }

  /**
   * Delete an alert.
   */
  async deleteAlert(id: string): Promise<void> {
    await db.delete(competitiveAlerts).where(eq(competitiveAlerts.id, id));
  }

  /**
   * Compare current vs previous month scores.
   * If any factor changes by 20%+ (relative), create a 'score_spike' alert.
   * Severity: >50% = critical, >30% = warning, else info.
   * Requirements: 12.25
   */
  async detectScoreSpike(
    robotId: string,
    currentScores: Record<string, number>,
    previousScores: Record<string, number>
  ): Promise<void> {
    for (const [factor, currentValue] of Object.entries(currentScores)) {
      const previousValue = previousScores[factor];
      if (previousValue === undefined || previousValue === 0) continue;

      const changePercent = Math.abs((currentValue - previousValue) / previousValue) * 100;

      if (changePercent >= 20) {
        let severity: Severity = 'info';
        if (changePercent > 50) {
          severity = 'critical';
        } else if (changePercent > 30) {
          severity = 'warning';
        }

        const direction = currentValue > previousValue ? '증가' : '감소';

        await this.createAlert({
          robotId,
          type: 'score_spike',
          severity,
          title: `${factor} 스코어 ${changePercent.toFixed(1)}% ${direction}`,
          summary: `${factor}: ${previousValue.toFixed(2)} → ${currentValue.toFixed(2)} (${changePercent.toFixed(1)}% ${direction})`,
          triggerData: {
            factor,
            previousValue,
            currentValue,
            changePercent: Number(changePercent.toFixed(2)),
            direction,
          },
        });
      }
    }
  }

  /**
   * If pocDeploymentScore increases by 2+ points, create a 'mass_production' alert.
   * Requirements: 12.26
   */
  async detectMassProduction(
    robotId: string,
    currentPocDeployment: number,
    previousPocDeployment: number
  ): Promise<void> {
    const increase = currentPocDeployment - previousPocDeployment;

    if (increase >= 2) {
      await this.createAlert({
        robotId,
        type: 'mass_production',
        severity: increase >= 4 ? 'critical' : 'warning',
        title: `양산 전환 감지: PoC 배치 스코어 ${increase}점 증가`,
        summary: `pocDeploymentScore: ${previousPocDeployment} → ${currentPocDeployment} (+${increase}점)`,
        triggerData: {
          previousPocDeployment,
          currentPocDeployment,
          increase,
        },
      });
    }
  }

  /**
   * Check for 'funding' or 'partnership' keywords in article keywords.
   * Create appropriate alert type.
   * Requirements: 12.27, 12.28
   */
  async detectKeywordAlerts(
    robotId: string,
    articleKeywords: string[]
  ): Promise<void> {
    const fundingKeywords = ['funding', 'investment', 'series a', 'series b', 'series c', 'series d', 'series e', 'series f', 'ipo', 'valuation'];
    const partnershipKeywords = ['partnership', 'collaboration', 'joint venture', 'mou', 'strategic alliance'];

    const lowerKeywords = articleKeywords.map((k) => k.toLowerCase());

    const matchedFunding = fundingKeywords.filter((fk) =>
      lowerKeywords.some((k) => k.includes(fk))
    );

    const matchedPartnership = partnershipKeywords.filter((pk) =>
      lowerKeywords.some((k) => k.includes(pk))
    );

    if (matchedFunding.length > 0) {
      await this.createAlert({
        robotId,
        type: 'funding',
        severity: 'info',
        title: `투자/자금 관련 키워드 감지`,
        summary: `매칭 키워드: ${matchedFunding.join(', ')}`,
        triggerData: {
          matchedKeywords: matchedFunding,
          articleKeywords,
        },
      });
    }

    if (matchedPartnership.length > 0) {
      await this.createAlert({
        robotId,
        type: 'partnership',
        severity: 'info',
        title: `파트너십 관련 키워드 감지`,
        summary: `매칭 키워드: ${matchedPartnership.join(', ')}`,
        triggerData: {
          matchedKeywords: matchedPartnership,
          articleKeywords,
        },
      });
    }
  }

  /**
   * Insert a new competitive_alert record.
   * Requirements: 12.25-12.32
   */
  async createAlert(data: CreateAlertData): Promise<void> {
    await db.insert(competitiveAlerts).values({
      robotId: data.robotId ?? null,
      type: data.type,
      severity: data.severity,
      title: data.title,
      summary: data.summary,
      triggerData: data.triggerData,
    });
  }
}

export const warRoomAlertService = new CompetitiveAlertService();
