import {
  esClient,
  INDICES,
  searchDocuments,
  globalSearch,
  getSuggestions,
  indexDocument,
  deleteDocument,
} from '../search/elasticsearch.js';
import type { Company, Product, Article } from '../types/index.js';

export interface SearchResult<T> {
  id: string;
  score: number | null;
  source: T | undefined;
  highlights?: Record<string, string[]>;
}

export interface SearchResponse<T> {
  hits: SearchResult<T>[];
  total: number;
}

export interface GlobalSearchResult {
  companies: SearchResponse<Company>;
  products: SearchResponse<Product>;
  articles: SearchResponse<Article>;
  totalHits: number;
}

export class SearchService {
  private esAvailable = true;

  constructor() {
    this.checkConnection();
  }

  private async checkConnection() {
    try {
      await esClient.ping();
      this.esAvailable = true;
    } catch {
      console.warn('Elasticsearch not available, search features disabled');
      this.esAvailable = false;
    }
  }

  /**
   * Global search across all entities
   */
  async search(query: string, options: { limit?: number } = {}): Promise<GlobalSearchResult | null> {
    if (!this.esAvailable) return null;
    
    try {
      return await globalSearch(query, options) as GlobalSearchResult;
    } catch (error) {
      console.error('Search error:', error);
      return null;
    }
  }

  /**
   * Search companies
   */
  async searchCompanies(
    query: string,
    filters: {
      country?: string;
      category?: string;
    } = {},
    options: { page?: number; pageSize?: number } = {}
  ): Promise<SearchResponse<Company> | null> {
    if (!this.esAvailable) return null;

    const { page = 1, pageSize = 20 } = options;
    const must: unknown[] = [];
    const filter: unknown[] = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['name^3', 'description'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (filters.country) {
      filter.push({ term: { country: filters.country } });
    }
    if (filters.category) {
      filter.push({ term: { category: filters.category } });
    }

    const searchQuery = {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    };

    try {
      return await searchDocuments<Company>(INDICES.COMPANIES, searchQuery, {
        from: (page - 1) * pageSize,
        size: pageSize,
        sort: [{ _score: 'desc' }, { 'name.keyword': 'asc' }],
      });
    } catch (error) {
      console.error('Company search error:', error);
      return null;
    }
  }

  /**
   * Search products with filters
   */
  async searchProducts(
    query: string,
    filters: {
      companyId?: string;
      type?: string;
      status?: string;
      releaseYear?: number;
      priceMin?: number;
      priceMax?: number;
      dofMin?: number;
      dofMax?: number;
      payloadMin?: number;
      payloadMax?: number;
      keywords?: string[];
    } = {},
    options: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<SearchResponse<Product> | null> {
    if (!this.esAvailable) return null;

    const { page = 1, pageSize = 20, sortBy = '_score', sortOrder = 'desc' } = options;
    const must: unknown[] = [];
    const filter: unknown[] = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['name^3', 'companyName^2', 'targetMarket', 'series'],
          fuzziness: 'AUTO',
        },
      });
    }

    // Apply filters
    if (filters.companyId) filter.push({ term: { companyId: filters.companyId } });
    if (filters.type) filter.push({ term: { type: filters.type } });
    if (filters.status) filter.push({ term: { status: filters.status } });
    if (filters.releaseYear) {
      filter.push({
        range: {
          releaseDate: {
            gte: `${filters.releaseYear}-01-01`,
            lte: `${filters.releaseYear}-12-31`,
          },
        },
      });
    }
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      filter.push({
        range: {
          priceMin: {
            ...(filters.priceMin !== undefined && { gte: filters.priceMin }),
            ...(filters.priceMax !== undefined && { lte: filters.priceMax }),
          },
        },
      });
    }
    if (filters.dofMin !== undefined || filters.dofMax !== undefined) {
      filter.push({
        range: {
          dof: {
            ...(filters.dofMin !== undefined && { gte: filters.dofMin }),
            ...(filters.dofMax !== undefined && { lte: filters.dofMax }),
          },
        },
      });
    }
    if (filters.payloadMin !== undefined || filters.payloadMax !== undefined) {
      filter.push({
        range: {
          payloadKg: {
            ...(filters.payloadMin !== undefined && { gte: filters.payloadMin }),
            ...(filters.payloadMax !== undefined && { lte: filters.payloadMax }),
          },
        },
      });
    }
    if (filters.keywords && filters.keywords.length > 0) {
      filter.push({ terms: { keywords: filters.keywords } });
    }

    const searchQuery = {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    };

    // Build sort
    const sort: unknown[] = [];
    if (sortBy === '_score') {
      sort.push({ _score: sortOrder });
    } else if (sortBy === 'releaseDate') {
      sort.push({ releaseDate: { order: sortOrder, missing: '_last' } });
    } else if (sortBy === 'priceMin') {
      sort.push({ priceMin: { order: sortOrder, missing: '_last' } });
    } else if (sortBy === 'name') {
      sort.push({ 'name.keyword': sortOrder });
    }

    try {
      return await searchDocuments<Product>(INDICES.PRODUCTS, searchQuery, {
        from: (page - 1) * pageSize,
        size: pageSize,
        sort,
      });
    } catch (error) {
      console.error('Product search error:', error);
      return null;
    }
  }

  /**
   * Search articles
   */
  async searchArticles(
    query: string,
    filters: {
      companyId?: string;
      productId?: string;
      source?: string;
      language?: string;
      publishedAfter?: string;
      publishedBefore?: string;
      keywords?: string[];
    } = {},
    options: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<SearchResponse<Article> | null> {
    if (!this.esAvailable) return null;

    const { page = 1, pageSize = 20, sortBy = 'publishedAt', sortOrder = 'desc' } = options;
    const must: unknown[] = [];
    const filter: unknown[] = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'summary^2', 'content'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (filters.companyId) filter.push({ term: { companyId: filters.companyId } });
    if (filters.productId) filter.push({ term: { productId: filters.productId } });
    if (filters.source) filter.push({ term: { source: filters.source } });
    if (filters.language) filter.push({ term: { language: filters.language } });
    if (filters.publishedAfter || filters.publishedBefore) {
      filter.push({
        range: {
          publishedAt: {
            ...(filters.publishedAfter && { gte: filters.publishedAfter }),
            ...(filters.publishedBefore && { lte: filters.publishedBefore }),
          },
        },
      });
    }
    if (filters.keywords && filters.keywords.length > 0) {
      filter.push({ terms: { keywords: filters.keywords } });
    }

    const searchQuery = {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    };

    const sort: unknown[] = [];
    if (sortBy === '_score') {
      sort.push({ _score: sortOrder });
    } else if (sortBy === 'publishedAt') {
      sort.push({ publishedAt: { order: sortOrder, missing: '_last' } });
    } else if (sortBy === 'title') {
      sort.push({ 'title.keyword': sortOrder });
    }

    try {
      return await searchDocuments<Article>(INDICES.ARTICLES, searchQuery, {
        from: (page - 1) * pageSize,
        size: pageSize,
        sort,
      });
    } catch (error) {
      console.error('Article search error:', error);
      return null;
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(prefix: string, entityType?: 'company' | 'product' | 'article') {
    if (!this.esAvailable) return [];

    const indexMap = {
      company: INDICES.COMPANIES,
      product: INDICES.PRODUCTS,
      article: INDICES.ARTICLES,
    };

    try {
      return await getSuggestions(prefix, entityType ? indexMap[entityType] : undefined);
    } catch (error) {
      console.error('Autocomplete error:', error);
      return [];
    }
  }

  /**
   * Index a company document
   */
  async indexCompany(company: Company) {
    if (!this.esAvailable) return;
    try {
      await indexDocument(INDICES.COMPANIES, company.id, company);
    } catch (error) {
      console.error('Index company error:', error);
    }
  }

  /**
   * Index a product document
   */
  async indexProduct(product: Product & { companyName?: string; keywords?: string[] }) {
    if (!this.esAvailable) return;
    try {
      await indexDocument(INDICES.PRODUCTS, product.id, product);
    } catch (error) {
      console.error('Index product error:', error);
    }
  }

  /**
   * Index an article document
   */
  async indexArticle(article: Article & { companyName?: string; productName?: string; keywords?: string[] }) {
    if (!this.esAvailable) return;
    try {
      await indexDocument(INDICES.ARTICLES, article.id, article);
    } catch (error) {
      console.error('Index article error:', error);
    }
  }

  /**
   * Delete a document from index
   */
  async deleteFromIndex(entityType: 'company' | 'product' | 'article', id: string) {
    if (!this.esAvailable) return;

    const indexMap = {
      company: INDICES.COMPANIES,
      product: INDICES.PRODUCTS,
      article: INDICES.ARTICLES,
    };

    try {
      await deleteDocument(indexMap[entityType], id);
    } catch (error) {
      console.error('Delete from index error:', error);
    }
  }
}

export const searchService = new SearchService();
