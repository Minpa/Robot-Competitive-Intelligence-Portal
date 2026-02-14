import { eq, desc, sql } from 'drizzle-orm';
import {
  db,
  workforceData,
  talentTrends,
  companies,
  humanoidRobots,
  type JobDistribution,
} from '../db/index.js';

export interface CreateWorkforceDataDto {
  companyId: string;
  totalHeadcountMin?: number;
  totalHeadcountMax?: number;
  humanoidTeamSize?: number;
  jobDistribution?: JobDistribution;
  source?: string;
}

export interface UpdateWorkforceDataDto extends Partial<Omit<CreateWorkforceDataDto, 'companyId'>> {}

export interface TalentTrendEntryDto {
  year: number;
  totalHeadcount?: number;
  humanoidTeamSize?: number;
  jobPostingCount?: number;
  source?: string;
}

export class WorkforceService {
  /**
   * Create or update workforce data for a company
   */
  async upsertWorkforceData(companyId: string, data: CreateWorkforceDataDto) {
    const existing = await db
      .select()
      .from(workforceData)
      .where(eq(workforceData.companyId, companyId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(workforceData)
        .set({
          ...data,
          recordedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workforceData.companyId, companyId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(workforceData)
        .values({
          companyId,
          ...data,
          recordedAt: new Date(),
        })
        .returning();
      return created;
    }
  }

  /**
   * Get workforce data for a company
   */
  async getWorkforceData(companyId: string) {
    const [data] = await db
      .select()
      .from(workforceData)
      .where(eq(workforceData.companyId, companyId))
      .limit(1);

    return data || null;
  }

  /**
   * Add a talent trend entry
   */
  async addTalentTrendEntry(companyId: string, data: TalentTrendEntryDto) {
    // Check if entry for this year already exists
    const existing = await db
      .select()
      .from(talentTrends)
      .where(sql`${talentTrends.companyId} = ${companyId} AND ${talentTrends.year} = ${data.year}`)
      .limit(1);

    if (existing.length > 0) {
      // Update existing entry
      const [updated] = await db
        .update(talentTrends)
        .set({
          totalHeadcount: data.totalHeadcount,
          humanoidTeamSize: data.humanoidTeamSize,
          jobPostingCount: data.jobPostingCount,
          source: data.source,
          recordedAt: new Date(),
        })
        .where(eq(talentTrends.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(talentTrends)
        .values({
          companyId,
          year: data.year,
          totalHeadcount: data.totalHeadcount,
          humanoidTeamSize: data.humanoidTeamSize,
          jobPostingCount: data.jobPostingCount,
          source: data.source,
          recordedAt: new Date(),
        })
        .returning();
      return created;
    }
  }

  /**
   * Get talent trend for a company
   */
  async getTalentTrend(companyId: string, years = 5) {
    const trends = await db
      .select()
      .from(talentTrends)
      .where(eq(talentTrends.companyId, companyId))
      .orderBy(desc(talentTrends.year))
      .limit(years);

    return trends.reverse(); // Return in chronological order
  }

  /**
   * Get job distribution for a company
   */
  async getJobDistribution(companyId: string): Promise<JobDistribution | null> {
    const [data] = await db
      .select({ jobDistribution: workforceData.jobDistribution })
      .from(workforceData)
      .where(eq(workforceData.companyId, companyId))
      .limit(1);

    return data?.jobDistribution || null;
  }

  /**
   * Compare workforce across multiple companies
   */
  async compareWorkforce(companyIds: string[]) {
    const results = await db
      .select({
        company: companies,
        workforce: workforceData,
      })
      .from(companies)
      .leftJoin(workforceData, eq(companies.id, workforceData.companyId))
      .where(sql`${companies.id} = ANY(${companyIds})`);

    return results.map(r => ({
      companyId: r.company.id,
      companyName: r.company.name,
      totalHeadcountMin: r.workforce?.totalHeadcountMin,
      totalHeadcountMax: r.workforce?.totalHeadcountMax,
      humanoidTeamSize: r.workforce?.humanoidTeamSize,
      jobDistribution: r.workforce?.jobDistribution,
    }));
  }

  /**
   * Get top N companies by workforce size
   */
  async getTopNByWorkforce(limit = 10) {
    const results = await db
      .select({
        company: companies,
        workforce: workforceData,
      })
      .from(workforceData)
      .innerJoin(companies, eq(workforceData.companyId, companies.id))
      .orderBy(desc(workforceData.humanoidTeamSize))
      .limit(limit);

    return results.map(r => ({
      companyId: r.company.id,
      companyName: r.company.name,
      logoUrl: r.company.logoUrl,
      totalHeadcountMin: r.workforce.totalHeadcountMin,
      totalHeadcountMax: r.workforce.totalHeadcountMax,
      humanoidTeamSize: r.workforce.humanoidTeamSize,
      jobDistribution: r.workforce.jobDistribution,
    }));
  }

  /**
   * Get workforce by segment (purpose)
   */
  async getWorkforceBySegment() {
    // Get companies with their primary robot purpose
    const companiesWithRobots = await db
      .select({
        companyId: companies.id,
        companyName: companies.name,
        purpose: humanoidRobots.purpose,
        humanoidTeamSize: workforceData.humanoidTeamSize,
      })
      .from(companies)
      .leftJoin(humanoidRobots, eq(companies.id, humanoidRobots.companyId))
      .leftJoin(workforceData, eq(companies.id, workforceData.companyId))
      .where(sql`${workforceData.humanoidTeamSize} IS NOT NULL`);

    // Aggregate by purpose
    const byPurpose: Record<string, { count: number; totalWorkforce: number }> = {
      industrial: { count: 0, totalWorkforce: 0 },
      home: { count: 0, totalWorkforce: 0 },
      service: { count: 0, totalWorkforce: 0 },
    };

    const processedCompanies = new Set<string>();
    for (const row of companiesWithRobots) {
      if (row.purpose && row.humanoidTeamSize && !processedCompanies.has(row.companyId)) {
        if (byPurpose[row.purpose]) {
          byPurpose[row.purpose].count++;
          byPurpose[row.purpose].totalWorkforce += row.humanoidTeamSize;
        }
        processedCompanies.add(row.companyId);
      }
    }

    return byPurpose;
  }

  /**
   * Get aggregated job distribution across all companies
   */
  async getAggregatedJobDistribution() {
    const allWorkforce = await db
      .select({ jobDistribution: workforceData.jobDistribution })
      .from(workforceData)
      .where(sql`${workforceData.jobDistribution} IS NOT NULL`);

    const aggregated: JobDistribution = {
      rd: 0,
      software: 0,
      controlAi: 0,
      mechatronics: 0,
      operations: 0,
      business: 0,
    };

    for (const row of allWorkforce) {
      if (row.jobDistribution) {
        aggregated.rd = (aggregated.rd || 0) + (row.jobDistribution.rd || 0);
        aggregated.software = (aggregated.software || 0) + (row.jobDistribution.software || 0);
        aggregated.controlAi = (aggregated.controlAi || 0) + (row.jobDistribution.controlAi || 0);
        aggregated.mechatronics = (aggregated.mechatronics || 0) + (row.jobDistribution.mechatronics || 0);
        aggregated.operations = (aggregated.operations || 0) + (row.jobDistribution.operations || 0);
        aggregated.business = (aggregated.business || 0) + (row.jobDistribution.business || 0);
      }
    }

    return aggregated;
  }
}

export const workforceService = new WorkforceService();
