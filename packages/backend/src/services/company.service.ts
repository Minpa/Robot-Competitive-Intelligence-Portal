import { eq, ilike, and, sql, desc, asc } from 'drizzle-orm';
import { db, companies } from '../db/index.js';
import type {
  Company,
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyFiltersDto,
  PaginationDto,
  PaginatedResult,
} from '../types/index.js';
import { indexDocument, deleteDocument, INDICES } from '../search/elasticsearch.js';

export class CompanyService {
  async create(data: CreateCompanyDto): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({
        name: data.name,
        country: data.country,
        category: data.category,
        homepageUrl: data.homepageUrl,
        description: data.description,
      })
      .returning();

    // Index in Elasticsearch
    await this.indexCompany(company!);

    return company as Company;
  }

  async getById(id: string): Promise<Company | null> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return (company as Company) || null;
  }

  async update(id: string, data: UpdateCompanyDto): Promise<Company | null> {
    const [company] = await db
      .update(companies)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    if (company) {
      await this.indexCompany(company);
    }

    return (company as Company) || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(companies).where(eq(companies.id, id)).returning({ id: companies.id });

    if (result.length > 0) {
      try {
        await deleteDocument(INDICES.COMPANIES, id);
      } catch {
        // Ignore ES errors on delete
      }
      return true;
    }
    return false;
  }

  async list(
    filters: CompanyFiltersDto,
    pagination: PaginationDto
  ): Promise<PaginatedResult<Company>> {
    const { page, pageSize, sortBy, sortOrder } = pagination;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (filters.country) {
      conditions.push(eq(companies.country, filters.country));
    }
    if (filters.category) {
      conditions.push(eq(companies.category, filters.category));
    }
    if (filters.searchTerm) {
      conditions.push(ilike(companies.name, `%${filters.searchTerm}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(companies)
      .where(whereClause);

    const total = Number(countResult?.count ?? 0);

    // Get items with sorting
    const orderByColumn = sortBy === 'name' ? companies.name : companies.updatedAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const items = await db
      .select()
      .from(companies)
      .where(whereClause)
      .orderBy(orderDirection(orderByColumn))
      .limit(pageSize)
      .offset(offset);

    return {
      items: items as Company[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async search(query: string): Promise<Company[]> {
    const results = await db
      .select()
      .from(companies)
      .where(ilike(companies.name, `%${query}%`))
      .limit(20);

    return results as Company[];
  }

  private async indexCompany(company: typeof companies.$inferSelect) {
    try {
      await indexDocument(INDICES.COMPANIES, company.id, {
        id: company.id,
        name: company.name,
        country: company.country,
        category: company.category,
        homepageUrl: company.homepageUrl,
        description: company.description,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      });
    } catch (error) {
      console.error('Failed to index company:', error);
    }
  }
}

export const companyService = new CompanyService();
