/**
 * Partner Match Step — 파트너 자동 매칭
 *
 * 로봇의 부품 요구사항과 Partner 레코드를 sub_category 기반으로 매칭한다.
 * 이 스텝은 매칭 결과를 로깅하는 경량 스텝이다.
 *
 * Requirements: 17.105, 17.110, 13.44
 */

import {
  db,
  partners,
  partnerRobotAdoptions,
} from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

/**
 * Determine relevant component sub-categories for a robot based on its specs.
 * All robots need core components, so we return all component sub-categories.
 */
function getRelevantSubCategories(): string[] {
  return [
    'vision_sensor',
    'battery',
    'ai_chip',
    'actuator',
    'motor',
    'reducer',
    'force_sensor',
  ];
}

/**
 * Execute the Partner Match pipeline step.
 * Matches robot's component needs with partner records based on sub_category.
 * This is a lightweight step that logs matching results.
 */
export async function executePartnerMatchStep(robotId: string): Promise<void> {
  const relevantSubCategories = getRelevantSubCategories();

  // Find component partners matching relevant sub-categories
  const componentPartners = await db
    .select({
      id: partners.id,
      name: partners.name,
      subCategory: partners.subCategory,
      category: partners.category,
    })
    .from(partners)
    .where(eq(partners.category, 'component'));

  for (const partner of componentPartners) {
    if (!partner.subCategory || !relevantSubCategories.includes(partner.subCategory)) {
      continue;
    }

    // Check if adoption record already exists
    const existing = await db
      .select({ id: partnerRobotAdoptions.id })
      .from(partnerRobotAdoptions)
      .where(
        and(
          eq(partnerRobotAdoptions.partnerId, partner.id),
          eq(partnerRobotAdoptions.robotId, robotId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create an evaluating adoption record for the match
      await db.insert(partnerRobotAdoptions).values({
        partnerId: partner.id,
        robotId,
        adoptionStatus: 'evaluating',
        notes: `Auto-matched: ${partner.name} (${partner.subCategory}) for robot component needs`,
      });
    }
  }
}
