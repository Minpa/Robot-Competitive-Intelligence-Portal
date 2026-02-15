/**
 * API Integration Tests
 * 
 * Tests for:
 * - Authentication flow (login, token validation, logout)
 * - CRUD operations for main entities (robots, companies, components, articles)
 * - Filter and sort functionality for catalog
 * 
 * Validates: Requirements 12.1-12.4
 * 
 * NOTE: These tests require a running PostgreSQL database.
 * Set DATABASE_URL environment variable or use docker-compose to start the database.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from '../../routes/index.js';
import { db } from '../../db/index.js';
import { 
  users, 
  companies, 
  humanoidRobots, 
  components, 
  articles,
  bodySpecs,
  handSpecs,
  computingSpecs,
  sensorSpecs,
  powerSpecs,
  applicationCases,
  allowedEmails
} from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { createHash } from 'crypto';

// Check if database is available
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

// Test data
const TEST_USER = {
  email: 'test-integration@example.com',
  password: 'testpassword123',
  role: 'admin' as const,
};

const TEST_COMPANY = {
  name: 'Test Robot Company',
  country: 'USA',
  city: 'San Francisco',
  foundingYear: 2020,
  category: 'robotics',
  mainBusiness: 'Humanoid Robots',
  description: 'A test company for integration tests',
};

const TEST_ROBOT = {
  name: 'Test Humanoid Robot',
  announcementYear: 2024,
  status: 'development',
  purpose: 'industrial',
  locomotionType: 'bipedal',
  handType: 'multi_finger',
  commercializationStage: 'prototype',
  region: 'north_america',
  description: 'A test robot for integration tests',
};

const TEST_COMPONENT = {
  type: 'actuator',
  name: 'Test Actuator',
  vendor: 'Test Vendor',
  specifications: {
    actuatorType: 'harmonic',
    ratedTorqueNm: 100,
    maxTorqueNm: 150,
    speedRpm: 3000,
    weightKg: 2.5,
  },
};

const TEST_ARTICLE = {
  title: 'Test Article for Integration',
  source: 'Test Source',
  url: 'https://example.com/test-article',
  content: 'This is test content for the integration test article.',
  language: 'en',
  category: 'technology',
};

// Helper functions
function hashPassword(password: string, secret: string): string {
  return createHash('sha256')
    .update(password + secret)
    .digest('hex');
}

let app: FastifyInstance;
let authToken: string;
let testUserId: string;
let testCompanyId: string;
let testRobotId: string;
let testComponentId: string;
let testArticleId: string;
let dbAvailable = false;

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Check database availability
    dbAvailable = await isDatabaseAvailable();
    
    if (!dbAvailable) {
      console.warn('⚠️ Database not available. Skipping integration tests.');
      console.warn('   Start the database with: docker-compose up -d postgres');
      return;
    }

    // Create Fastify instance
    app = Fastify({ logger: false });
    
    app.addContentTypeParser('application/json', { parseAs: 'string' }, function (_req, body, done) {
      try {
        const json = body ? JSON.parse(body as string) : {};
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    });

    await app.register(cors, { origin: true });
    await registerRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    
    // Cleanup test data
    if (testArticleId) {
      await db.delete(articles).where(eq(articles.id, testArticleId)).catch(() => {});
    }
    if (testRobotId) {
      await db.delete(humanoidRobots).where(eq(humanoidRobots.id, testRobotId)).catch(() => {});
    }
    if (testComponentId) {
      await db.delete(components).where(eq(components.id, testComponentId)).catch(() => {});
    }
    if (testCompanyId) {
      await db.delete(companies).where(eq(companies.id, testCompanyId)).catch(() => {});
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId)).catch(() => {});
    }
    // Clean up allowed email
    await db.delete(allowedEmails).where(eq(allowedEmails.email, TEST_USER.email.toLowerCase())).catch(() => {});
    
    await app.close();
  });

  // ============================================
  // Authentication Flow Tests
  // ============================================
  describe('Authentication Flow', () => {
    beforeAll(async () => {
      if (!dbAvailable) return;
      // Add test email to allowed list for registration
      await db.insert(allowedEmails).values({
        email: TEST_USER.email.toLowerCase(),
        note: 'Integration test user',
      }).onConflictDoNothing();
    });

    it('should register a new user', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: TEST_USER,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(TEST_USER.email);
      expect(body.token).toBeDefined();
      testUserId = body.user.id;
      authToken = body.token;
    });

    it('should reject duplicate registration', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: TEST_USER,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('already exists');
    });

    it('should login with valid credentials', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.token).toBeDefined();
      authToken = body.token;
    });

    it('should reject login with invalid credentials', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: TEST_USER.email,
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should get current user with valid token', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.email).toBe(TEST_USER.email);
    });

    it('should reject request without token', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should refresh token', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.token).toBeDefined();
      authToken = body.token;
    });

    it('should logout successfully', async () => {
      if (!dbAvailable) return;
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Logged out');
    });
  });

  // ============================================
  // Company CRUD Tests
  // ============================================
  describe('Company CRUD Operations', () => {
    beforeAll(async () => {
      // Re-login to get fresh token
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });
      const body = JSON.parse(response.body);
      authToken = body.token;
    });

    it('should create a company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/companies',
        payload: TEST_COMPANY,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe(TEST_COMPANY.name);
      expect(body.country).toBe(TEST_COMPANY.country);
      testCompanyId = body.id;
    });

    it('should get company by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(testCompanyId);
      expect(body.name).toBe(TEST_COMPANY.name);
    });

    it('should list companies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/companies',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      expect(Array.isArray(body.items)).toBe(true);
    });

    it('should update company', async () => {
      const updatedName = 'Updated Test Company';
      const response = await app.inject({
        method: 'PUT',
        url: `/api/companies/${testCompanyId}`,
        payload: {
          name: updatedName,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe(updatedName);
    });

    it('should search companies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/companies/search?q=Updated',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should return 404 for non-existent company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/companies/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================
  // Humanoid Robot CRUD Tests
  // ============================================
  describe('Humanoid Robot CRUD Operations', () => {
    it('should create a humanoid robot', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/humanoid-robots',
        payload: {
          ...TEST_ROBOT,
          companyId: testCompanyId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe(TEST_ROBOT.name);
      expect(body.purpose).toBe(TEST_ROBOT.purpose);
      testRobotId = body.id;
    });

    it('should get robot by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/humanoid-robots/${testRobotId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.robot.id).toBe(testRobotId);
      expect(body.robot.name).toBe(TEST_ROBOT.name);
    });

    it('should list robots', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      expect(Array.isArray(body.items)).toBe(true);
    });

    it('should update robot', async () => {
      const updatedName = 'Updated Test Robot';
      const response = await app.inject({
        method: 'PUT',
        url: `/api/humanoid-robots/${testRobotId}`,
        payload: {
          name: updatedName,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe(updatedName);
    });

    it('should update body spec', async () => {
      const bodySpec = {
        heightCm: 175,
        weightKg: 80,
        payloadKg: 20,
        dofCount: 44,
        maxSpeedMps: 2.5,
        operationTimeHours: 4,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/humanoid-robots/${testRobotId}/body-spec`,
        payload: bodySpec,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.heightCm).toBe(bodySpec.heightCm.toString());
    });

    it('should update hand spec', async () => {
      const handSpec = {
        handType: 'multi_finger',
        fingerCount: 5,
        handDof: 12,
        gripForceN: 50,
        isInterchangeable: true,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/humanoid-robots/${testRobotId}/hand-spec`,
        payload: handSpec,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.fingerCount).toBe(handSpec.fingerCount);
    });

    it('should get radar chart data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/humanoid-robots/${testRobotId}/radar`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.labels).toBeDefined();
      expect(Array.isArray(body.labels)).toBe(true);
    });

    it('should search robots', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots/search?q=Updated',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should return 404 for non-existent robot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================
  // Catalog Filter and Sort Tests
  // ============================================
  describe('Catalog Filter and Sort', () => {
    it('should filter robots by purpose', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?purpose=industrial',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      // All returned items should have purpose = industrial
      body.items.forEach((robot: any) => {
        expect(robot.purpose).toBe('industrial');
      });
    });

    it('should filter robots by locomotion type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?locomotionType=bipedal',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      body.items.forEach((robot: any) => {
        expect(robot.locomotionType).toBe('bipedal');
      });
    });

    it('should filter robots by hand type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?handType=multi_finger',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      body.items.forEach((robot: any) => {
        expect(robot.handType).toBe('multi_finger');
      });
    });

    it('should filter robots by commercialization stage', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?commercializationStage=prototype',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      body.items.forEach((robot: any) => {
        expect(robot.commercializationStage).toBe('prototype');
      });
    });

    it('should filter robots by region', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?region=north_america',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      body.items.forEach((robot: any) => {
        expect(robot.region).toBe('north_america');
      });
    });

    it('should apply multiple filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?purpose=industrial&locomotionType=bipedal&region=north_america',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      body.items.forEach((robot: any) => {
        expect(robot.purpose).toBe('industrial');
        expect(robot.locomotionType).toBe('bipedal');
        expect(robot.region).toBe('north_america');
      });
    });

    it('should sort robots by name ascending', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?sortField=name&sortDirection=asc',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      
      // Check if sorted correctly
      for (let i = 1; i < body.items.length; i++) {
        expect(body.items[i].name.localeCompare(body.items[i - 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort robots by name descending', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?sortField=name&sortDirection=desc',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      
      // Check if sorted correctly
      for (let i = 1; i < body.items.length; i++) {
        expect(body.items[i].name.localeCompare(body.items[i - 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort robots by announcement year', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?sortField=announcementYear&sortDirection=desc',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
    });

    it('should paginate results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots?page=1&limit=5',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      expect(body.items.length).toBeLessThanOrEqual(5);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(5);
    });
  });

  // ============================================
  // Component CRUD Tests
  // ============================================
  describe('Component CRUD Operations', () => {
    it('should create a component', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/components',
        payload: TEST_COMPONENT,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe(TEST_COMPONENT.name);
      expect(body.type).toBe(TEST_COMPONENT.type);
      testComponentId = body.id;
    });

    it('should get component by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/components/${testComponentId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(testComponentId);
      expect(body.name).toBe(TEST_COMPONENT.name);
    });

    it('should list components', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/components',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      expect(Array.isArray(body.items)).toBe(true);
    });

    it('should filter components by type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/components?type=actuator',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      body.items.forEach((component: any) => {
        expect(component.type).toBe('actuator');
      });
    });

    it('should update component', async () => {
      const updatedName = 'Updated Test Actuator';
      const response = await app.inject({
        method: 'PUT',
        url: `/api/components/${testComponentId}`,
        payload: {
          name: updatedName,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe(updatedName);
    });

    it('should link component to robot', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/components/robot/${testRobotId}/link/${testComponentId}`,
        payload: {
          usageLocation: 'arm',
          quantity: 2,
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should get components by robot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/components/robot/${testRobotId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should get robots using component', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/components/${testComponentId}/robots`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should return 404 for non-existent component', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/components/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================
  // Article CRUD Tests
  // ============================================
  describe('Article CRUD Operations', () => {
    it('should create an article', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/articles',
        payload: {
          ...TEST_ARTICLE,
          companyId: testCompanyId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.title).toBe(TEST_ARTICLE.title);
      testArticleId = body.id;
    });

    it('should detect duplicate article', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/articles',
        payload: {
          ...TEST_ARTICLE,
          companyId: testCompanyId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body._duplicate).toBe(true);
    });

    it('should get article by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/articles/${testArticleId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(testArticleId);
      expect(body.title).toBe(TEST_ARTICLE.title);
    });

    it('should list articles', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/articles',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toBeDefined();
      expect(Array.isArray(body.items)).toBe(true);
    });

    it('should update article', async () => {
      const updatedTitle = 'Updated Test Article';
      const response = await app.inject({
        method: 'PUT',
        url: `/api/articles/${testArticleId}`,
        payload: {
          title: updatedTitle,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe(updatedTitle);
    });

    it('should get articles by company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/articles/by-company/${testCompanyId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should check duplicate content', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/articles/check-duplicate',
        payload: {
          content: TEST_ARTICLE.content,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.contentHash).toBeDefined();
      expect(body.isDuplicate).toBe(true);
    });

    it('should return 404 for non-existent article', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/articles/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================
  // Dashboard API Tests
  // ============================================
  describe('Dashboard API', () => {
    it('should get segment matrix', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots/segment-matrix',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.rows).toBeDefined();
      expect(body.columns).toBeDefined();
      expect(body.cells).toBeDefined();
    });

    it('should get hand type distribution', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots/hand-distribution',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.labels).toBeDefined();
      expect(body.values).toBeDefined();
    });

    it('should get summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/humanoid-robots/summary',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalRobots).toBeDefined();
      expect(typeof body.totalRobots).toBe('number');
    });

    it('should get dashboard summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/summary',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toBeDefined();
    });

    it('should get weekly highlights', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboard/weekly-highlights',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toBeDefined();
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/companies',
        payload: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Should not crash the server
      expect([400, 500]).toContain(response.statusCode);
    });

    it('should handle missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/companies',
        payload: {
          // Missing required 'name' and 'country'
          city: 'Test City',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle invalid UUID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/companies/not-a-valid-uuid',
      });

      // Should return 404 or 400, not crash
      expect([400, 404, 500]).toContain(response.statusCode);
    });
  });

  // ============================================
  // Cleanup Tests (Delete Operations)
  // ============================================
  describe('Cleanup - Delete Operations', () => {
    it('should unlink component from robot', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/components/robot/${testRobotId}/link/${testComponentId}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it('should delete article', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/articles/${testArticleId}`,
      });

      expect(response.statusCode).toBe(204);
      testArticleId = ''; // Mark as deleted
    });

    it('should delete component', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/components/${testComponentId}`,
      });

      expect(response.statusCode).toBe(204);
      testComponentId = ''; // Mark as deleted
    });

    it('should delete robot', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/humanoid-robots/${testRobotId}`,
      });

      expect(response.statusCode).toBe(204);
      testRobotId = ''; // Mark as deleted
    });

    it('should delete company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/companies/${testCompanyId}`,
      });

      expect(response.statusCode).toBe(204);
      testCompanyId = ''; // Mark as deleted
    });
  });
});
