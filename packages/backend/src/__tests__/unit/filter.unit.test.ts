/**
 * Filter Logic Unit Tests
 * 
 * Tests for catalog filter and sort logic.
 * 
 * Validates: Requirements 3.1-3.8 (Catalog Filter Correctness)
 */

import { describe, it, expect } from 'vitest';

// Types
interface RobotFilters {
  purpose?: string;
  locomotionType?: string;
  handType?: string;
  commercializationStage?: string;
  region?: string;
  companyId?: string;
  announcementYearMin?: number;
  announcementYearMax?: number;
}

interface Robot {
  id: string;
  name: string;
  purpose: string;
  locomotionType: string;
  handType: string;
  commercializationStage: string;
  region: string;
  companyId: string;
  announcementYear: number;
}

// Filter function (simulates the service logic)
function filterRobots(robots: Robot[], filters: RobotFilters): Robot[] {
  return robots.filter(robot => {
    if (filters.purpose && robot.purpose !== filters.purpose) return false;
    if (filters.locomotionType && robot.locomotionType !== filters.locomotionType) return false;
    if (filters.handType && robot.handType !== filters.handType) return false;
    if (filters.commercializationStage && robot.commercializationStage !== filters.commercializationStage) return false;
    if (filters.region && robot.region !== filters.region) return false;
    if (filters.companyId && robot.companyId !== filters.companyId) return false;
    if (filters.announcementYearMin && robot.announcementYear < filters.announcementYearMin) return false;
    if (filters.announcementYearMax && robot.announcementYear > filters.announcementYearMax) return false;
    return true;
  });
}

// Sort function
type SortField = 'name' | 'announcementYear' | 'commercializationStage';
type SortDirection = 'asc' | 'desc';

function sortRobots(robots: Robot[], field: SortField, direction: SortDirection): Robot[] {
  return [...robots].sort((a, b) => {
    let comparison = 0;
    if (field === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (field === 'announcementYear') {
      comparison = a.announcementYear - b.announcementYear;
    } else if (field === 'commercializationStage') {
      comparison = a.commercializationStage.localeCompare(b.commercializationStage);
    }
    return direction === 'desc' ? -comparison : comparison;
  });
}

// Test data
const testRobots: Robot[] = [
  {
    id: '1',
    name: 'Atlas',
    purpose: 'industrial',
    locomotionType: 'bipedal',
    handType: 'multi_finger',
    commercializationStage: 'prototype',
    region: 'north_america',
    companyId: 'company-1',
    announcementYear: 2023,
  },
  {
    id: '2',
    name: 'Optimus',
    purpose: 'home',
    locomotionType: 'bipedal',
    handType: 'multi_finger',
    commercializationStage: 'pilot',
    region: 'north_america',
    companyId: 'company-2',
    announcementYear: 2024,
  },
  {
    id: '3',
    name: 'Figure 01',
    purpose: 'industrial',
    locomotionType: 'bipedal',
    handType: 'multi_finger',
    commercializationStage: 'commercial',
    region: 'north_america',
    companyId: 'company-3',
    announcementYear: 2024,
  },
  {
    id: '4',
    name: 'Walker X',
    purpose: 'service',
    locomotionType: 'wheeled',
    handType: 'gripper',
    commercializationStage: 'commercial',
    region: 'china',
    companyId: 'company-4',
    announcementYear: 2022,
  },
  {
    id: '5',
    name: 'Digit',
    purpose: 'industrial',
    locomotionType: 'bipedal',
    handType: 'interchangeable',
    commercializationStage: 'pilot',
    region: 'north_america',
    companyId: 'company-5',
    announcementYear: 2023,
  },
];

describe('Filter Logic Unit Tests', () => {
  describe('Property 10: Catalog Filter Correctness', () => {
    it('should filter by purpose', () => {
      const result = filterRobots(testRobots, { purpose: 'industrial' });
      
      expect(result.length).toBe(3);
      result.forEach(robot => {
        expect(robot.purpose).toBe('industrial');
      });
    });

    it('should filter by locomotion type', () => {
      const result = filterRobots(testRobots, { locomotionType: 'bipedal' });
      
      expect(result.length).toBe(4);
      result.forEach(robot => {
        expect(robot.locomotionType).toBe('bipedal');
      });
    });

    it('should filter by hand type', () => {
      const result = filterRobots(testRobots, { handType: 'multi_finger' });
      
      expect(result.length).toBe(3);
      result.forEach(robot => {
        expect(robot.handType).toBe('multi_finger');
      });
    });

    it('should filter by commercialization stage', () => {
      const result = filterRobots(testRobots, { commercializationStage: 'commercial' });
      
      expect(result.length).toBe(2);
      result.forEach(robot => {
        expect(robot.commercializationStage).toBe('commercial');
      });
    });

    it('should filter by region', () => {
      const result = filterRobots(testRobots, { region: 'north_america' });
      
      expect(result.length).toBe(4);
      result.forEach(robot => {
        expect(robot.region).toBe('north_america');
      });
    });

    it('should apply multiple filters (AND logic)', () => {
      const result = filterRobots(testRobots, {
        purpose: 'industrial',
        locomotionType: 'bipedal',
        region: 'north_america',
      });
      
      expect(result.length).toBe(3);
      result.forEach(robot => {
        expect(robot.purpose).toBe('industrial');
        expect(robot.locomotionType).toBe('bipedal');
        expect(robot.region).toBe('north_america');
      });
    });

    it('should filter by year range', () => {
      const result = filterRobots(testRobots, {
        announcementYearMin: 2023,
        announcementYearMax: 2024,
      });
      
      expect(result.length).toBe(4);
      result.forEach(robot => {
        expect(robot.announcementYear).toBeGreaterThanOrEqual(2023);
        expect(robot.announcementYear).toBeLessThanOrEqual(2024);
      });
    });

    it('should return all robots when no filters applied', () => {
      const result = filterRobots(testRobots, {});
      
      expect(result.length).toBe(testRobots.length);
    });

    it('should return empty array when no matches', () => {
      const result = filterRobots(testRobots, {
        purpose: 'industrial',
        region: 'japan',
      });
      
      expect(result.length).toBe(0);
    });
  });

  describe('Property 11: Catalog Sort Order Correctness', () => {
    it('should sort by name ascending', () => {
      const result = sortRobots(testRobots, 'name', 'asc');
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].name.localeCompare(result[i - 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort by name descending', () => {
      const result = sortRobots(testRobots, 'name', 'desc');
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].name.localeCompare(result[i - 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by announcement year ascending', () => {
      const result = sortRobots(testRobots, 'announcementYear', 'asc');
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].announcementYear).toBeGreaterThanOrEqual(result[i - 1].announcementYear);
      }
    });

    it('should sort by announcement year descending', () => {
      const result = sortRobots(testRobots, 'announcementYear', 'desc');
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].announcementYear).toBeLessThanOrEqual(result[i - 1].announcementYear);
      }
    });

    it('should sort by commercialization stage', () => {
      const result = sortRobots(testRobots, 'commercializationStage', 'asc');
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].commercializationStage.localeCompare(result[i - 1].commercializationStage)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Combined Filter and Sort', () => {
    it('should filter then sort correctly', () => {
      const filtered = filterRobots(testRobots, { purpose: 'industrial' });
      const sorted = sortRobots(filtered, 'name', 'asc');
      
      // All should be industrial
      sorted.forEach(robot => {
        expect(robot.purpose).toBe('industrial');
      });
      
      // Should be sorted by name
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].name.localeCompare(sorted[i - 1].name)).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
