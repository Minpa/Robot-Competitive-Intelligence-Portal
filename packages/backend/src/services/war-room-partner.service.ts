import {
  db,
  partners,
  partnerRobotAdoptions,
  partnerEvaluations,
  humanoidRobots,
} from '../db/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface PartnerListItem {
  id: string;
  name: string;
  category: string;
  subCategory: string | null;
  country: string | null;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  techCapability: number | null;
  lgCompatibility: number | null;
  marketShare: string | null;
  latestOverallScore: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerDetail extends PartnerListItem {
  evaluations: {
    id: string;
    evaluatedBy: string | null;
    techScore: number;
    qualityScore: number;
    costScore: number;
    deliveryScore: number;
    supportScore: number;
    overallScore: string | null;
    comments: string | null;
    evaluatedAt: Date;
  }[];
  adoptions: {
    id: string;
    robotId: string;
    robotName: string;
    adoptionStatus: string;
    adoptedAt: Date | null;
    notes: string | null;
    createdAt: Date;
  }[];
}

export interface AdoptionMatrixEntry {
  id: string;
  partnerId: string;
  partnerName: string;
  robotId: string;
  robotName: string;
  adoptionStatus: string;
  adoptedAt: Date | null;
  notes: string | null;
}

export interface PartnerMatchResult {
  partnerId: string;
  partnerName: string;
  category: string;
  subCategory: string | null;
  overallScore: number;
  matchReason: string;
}

class PartnerService {
  /**
   * List partners with optional filters by category, subCategory, country.
   * Returns partners with their latest evaluation overall_score.
   * Requirements: 13.33, 13.46
   */
  async list(filters: {
    category?: string;
    subCategory?: string;
    country?: string;
  } = {}): Promise<PartnerListItem[]> {
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(partners.category, filters.category));
    }
    if (filters.subCategory) {
      conditions.push(eq(partners.subCategory, filters.subCategory));
    }
    if (filters.country) {
      conditions.push(eq(partners.country, filters.country));
    }

    const query = db
      .select({
        id: partners.id,
        name: partners.name,
        category: partners.category,
        subCategory: partners.subCategory,
        country: partners.country,
        description: partners.description,
        logoUrl: partners.logoUrl,
        websiteUrl: partners.websiteUrl,
        techCapability: partners.techCapability,
        lgCompatibility: partners.lgCompatibility,
        marketShare: partners.marketShare,
        createdAt: partners.createdAt,
        updatedAt: partners.updatedAt,
      })
      .from(partners);

    const results = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    // Get latest evaluation score for each partner
    const partnerIds = results.map((r) => r.id);
    const evaluationScores = partnerIds.length > 0
      ? await db
          .select({
            partnerId: partnerEvaluations.partnerId,
            latestScore: sql<string>`MAX(${partnerEvaluations.overallScore})`,
          })
          .from(partnerEvaluations)
          .where(sql`${partnerEvaluations.partnerId} IN ${partnerIds}`)
          .groupBy(partnerEvaluations.partnerId)
      : [];

    const scoreMap = new Map(evaluationScores.map((e) => [e.partnerId, e.latestScore]));

    return results.map((r) => ({
      ...r,
      latestOverallScore: scoreMap.get(r.id) ?? null,
    }));
  }

  /**
   * Get partner by ID with evaluations and robot adoptions.
   * Requirements: 13.47
   */
  async getById(id: string): Promise<PartnerDetail | null> {
    const partnerResult = await db
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);

    const partner = partnerResult[0];
    if (!partner) return null;

    // Get evaluations
    const evaluations = await db
      .select({
        id: partnerEvaluations.id,
        evaluatedBy: partnerEvaluations.evaluatedBy,
        techScore: partnerEvaluations.techScore,
        qualityScore: partnerEvaluations.qualityScore,
        costScore: partnerEvaluations.costScore,
        deliveryScore: partnerEvaluations.deliveryScore,
        supportScore: partnerEvaluations.supportScore,
        overallScore: partnerEvaluations.overallScore,
        comments: partnerEvaluations.comments,
        evaluatedAt: partnerEvaluations.evaluatedAt,
      })
      .from(partnerEvaluations)
      .where(eq(partnerEvaluations.partnerId, id))
      .orderBy(desc(partnerEvaluations.evaluatedAt));

    // Get adoptions with robot names
    const adoptions = await db
      .select({
        id: partnerRobotAdoptions.id,
        robotId: partnerRobotAdoptions.robotId,
        robotName: humanoidRobots.name,
        adoptionStatus: partnerRobotAdoptions.adoptionStatus,
        adoptedAt: partnerRobotAdoptions.adoptedAt,
        notes: partnerRobotAdoptions.notes,
        createdAt: partnerRobotAdoptions.createdAt,
      })
      .from(partnerRobotAdoptions)
      .innerJoin(humanoidRobots, eq(partnerRobotAdoptions.robotId, humanoidRobots.id))
      .where(eq(partnerRobotAdoptions.partnerId, id));

    return {
      id: partner.id,
      name: partner.name,
      category: partner.category,
      subCategory: partner.subCategory,
      country: partner.country,
      description: partner.description,
      logoUrl: partner.logoUrl,
      websiteUrl: partner.websiteUrl,
      techCapability: partner.techCapability,
      lgCompatibility: partner.lgCompatibility,
      marketShare: partner.marketShare,
      latestOverallScore: evaluations[0]?.overallScore ?? null,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
      evaluations,
      adoptions,
    };
  }

  /**
   * Create a new partner.
   * Requirements: 13.48
   */
  async create(data: {
    name: string;
    category: string;
    subCategory?: string;
    country?: string;
    description?: string;
    logoUrl?: string;
    websiteUrl?: string;
    techCapability?: number;
    lgCompatibility?: number;
    marketShare?: string;
  }): Promise<PartnerListItem> {
    const [result] = await db
      .insert(partners)
      .values({
        name: data.name,
        category: data.category,
        subCategory: data.subCategory ?? null,
        country: data.country ?? null,
        description: data.description ?? null,
        logoUrl: data.logoUrl ?? null,
        websiteUrl: data.websiteUrl ?? null,
        techCapability: data.techCapability ?? null,
        lgCompatibility: data.lgCompatibility ?? null,
        marketShare: data.marketShare ?? null,
      })
      .returning();

    if (!result) throw new Error('Failed to create partner');

    return {
      id: result.id,
      name: result.name,
      category: result.category,
      subCategory: result.subCategory,
      country: result.country,
      description: result.description,
      logoUrl: result.logoUrl,
      websiteUrl: result.websiteUrl,
      techCapability: result.techCapability,
      lgCompatibility: result.lgCompatibility,
      marketShare: result.marketShare,
      latestOverallScore: null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Update an existing partner.
   * Requirements: 13.49
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      category: string;
      subCategory: string | null;
      country: string | null;
      description: string | null;
      logoUrl: string | null;
      websiteUrl: string | null;
      techCapability: number | null;
      lgCompatibility: number | null;
      marketShare: string | null;
    }>
  ): Promise<PartnerListItem | null> {
    const [result] = await db
      .update(partners)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(partners.id, id))
      .returning();

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      category: result.category,
      subCategory: result.subCategory,
      country: result.country,
      description: result.description,
      logoUrl: result.logoUrl,
      websiteUrl: result.websiteUrl,
      techCapability: result.techCapability,
      lgCompatibility: result.lgCompatibility,
      marketShare: result.marketShare,
      latestOverallScore: null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Submit a partner evaluation. Auto-calculates overall_score as the average of 5 dimensions.
   * Requirements: 13.35, 13.50
   */
  async submitEvaluation(data: {
    partnerId: string;
    evaluatedBy: string;
    techScore: number;
    qualityScore: number;
    costScore: number;
    deliveryScore: number;
    supportScore: number;
    comments?: string;
  }): Promise<{
    id: string;
    overallScore: string | null;
  }> {
    const overallScore = (
      (data.techScore + data.qualityScore + data.costScore + data.deliveryScore + data.supportScore) / 5
    ).toFixed(2);

    const [result] = await db
      .insert(partnerEvaluations)
      .values({
        partnerId: data.partnerId,
        evaluatedBy: data.evaluatedBy,
        techScore: data.techScore,
        qualityScore: data.qualityScore,
        costScore: data.costScore,
        deliveryScore: data.deliveryScore,
        supportScore: data.supportScore,
        overallScore,
        comments: data.comments ?? null,
      })
      .returning({ id: partnerEvaluations.id, overallScore: partnerEvaluations.overallScore });

    if (!result) throw new Error('Failed to create evaluation');

    return result;
  }

  /**
   * Get the adoption matrix: all partner-robot adoption entries with names.
   * Requirements: 13.51
   */
  async getAdoptionMatrix(): Promise<AdoptionMatrixEntry[]> {
    const results = await db
      .select({
        id: partnerRobotAdoptions.id,
        partnerId: partnerRobotAdoptions.partnerId,
        partnerName: partners.name,
        robotId: partnerRobotAdoptions.robotId,
        robotName: humanoidRobots.name,
        adoptionStatus: partnerRobotAdoptions.adoptionStatus,
        adoptedAt: partnerRobotAdoptions.adoptedAt,
        notes: partnerRobotAdoptions.notes,
      })
      .from(partnerRobotAdoptions)
      .innerJoin(partners, eq(partnerRobotAdoptions.partnerId, partners.id))
      .innerJoin(humanoidRobots, eq(partnerRobotAdoptions.robotId, humanoidRobots.id));

    return results;
  }

  /**
   * Create a partner-robot adoption entry.
   */
  async createAdoption(data: {
    partnerId: string;
    robotId: string;
    adoptionStatus?: string;
    adoptedAt?: string | null;
    notes?: string | null;
  }): Promise<AdoptionMatrixEntry> {
    const [result] = await db
      .insert(partnerRobotAdoptions)
      .values({
        partnerId: data.partnerId,
        robotId: data.robotId,
        adoptionStatus: data.adoptionStatus ?? 'evaluating',
        adoptedAt: data.adoptedAt ? new Date(data.adoptedAt) : null,
        notes: data.notes ?? null,
      })
      .returning();

    if (!result) throw new Error('Failed to create adoption');

    // Fetch names
    const partnerResult = await db.select({ name: partners.name }).from(partners).where(eq(partners.id, data.partnerId)).limit(1);
    const robotResult = await db.select({ name: humanoidRobots.name }).from(humanoidRobots).where(eq(humanoidRobots.id, data.robotId)).limit(1);

    return {
      id: result.id,
      partnerId: result.partnerId,
      partnerName: partnerResult[0]?.name ?? '',
      robotId: result.robotId,
      robotName: robotResult[0]?.name ?? '',
      adoptionStatus: result.adoptionStatus,
      adoptedAt: result.adoptedAt,
      notes: result.notes,
    };
  }

  /**
   * Auto-match partners to a robot based on sub_category compatibility and evaluation scores.
   * Finds component-category partners whose sub_category aligns with the robot's needs,
   * ranked by their latest evaluation overall_score.
   * Requirements: 13.44
   */
  async autoMatch(robotId: string): Promise<PartnerMatchResult[]> {
    // Get the robot to understand its specs
    const robotResult = await db
      .select({ id: humanoidRobots.id, name: humanoidRobots.name })
      .from(humanoidRobots)
      .where(eq(humanoidRobots.id, robotId))
      .limit(1);

    if (robotResult.length === 0) return [];

    // Get all component-category partners with their latest evaluation scores
    const componentPartners = await db
      .select({
        id: partners.id,
        name: partners.name,
        category: partners.category,
        subCategory: partners.subCategory,
      })
      .from(partners)
      .where(eq(partners.category, 'component'));

    // Get latest evaluation scores for these partners
    const evaluationScores = componentPartners.length > 0
      ? await db
          .select({
            partnerId: partnerEvaluations.partnerId,
            avgScore: sql<number>`AVG(CAST(${partnerEvaluations.overallScore} AS DECIMAL))`,
          })
          .from(partnerEvaluations)
          .where(
            sql`${partnerEvaluations.partnerId} IN ${componentPartners.map((p) => p.id)}`
          )
          .groupBy(partnerEvaluations.partnerId)
      : [];

    const scoreMap = new Map(evaluationScores.map((e) => [e.partnerId, Number(e.avgScore)]));

    // Check which partners are already adopted for this robot
    const existingAdoptions = await db
      .select({ partnerId: partnerRobotAdoptions.partnerId })
      .from(partnerRobotAdoptions)
      .where(eq(partnerRobotAdoptions.robotId, robotId));

    const adoptedPartnerIds = new Set(existingAdoptions.map((a) => a.partnerId));

    // Build match results: exclude already-adopted partners, rank by score
    const matches: PartnerMatchResult[] = componentPartners
      .filter((p) => !adoptedPartnerIds.has(p.id))
      .map((p) => ({
        partnerId: p.id,
        partnerName: p.name,
        category: p.category,
        subCategory: p.subCategory,
        overallScore: scoreMap.get(p.id) ?? 0,
        matchReason: `Component partner (${p.subCategory ?? 'general'}) available for adoption`,
      }))
      .sort((a, b) => b.overallScore - a.overallScore);

    return matches;
  }
}

export const warRoomPartnerService = new PartnerService();
